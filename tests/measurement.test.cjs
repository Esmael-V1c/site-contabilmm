const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "..", "measurement.js"), "utf8");
const KEY = "mm-measurement-consent-v1";
const configured = {
  allowedHosts: ["site.example"], googleAdsId: "AW-123456789", ga4Id: "G-TEST123",
  conversionLabels: { whatsapp_click: "wa_label", email_click: "email_label", phone_click: "phone_label", form_submit: "form_label" }
};

function setup(options = {}) {
  const location = new URL(options.url || "https://site.example/contato.html");
  const storage = new Map(Object.entries(options.storage || {}));
  const scripts = [];
  const handlers = {};
  const windowHandlers = {};
  let now = 10000;
  let focuses = 0;
  const notice = { hidden: true, querySelector: () => ({ focus: () => focuses++ }) };
  const description = { textContent: "Com sua permissão, utilizamos medição de visitas e contatos." };
  const document = {
    referrer: options.referrer || "",
    head: { append: script => scripts.push(script) },
    querySelector: selector => ({ ".cookie-notice": notice, "[data-cookie-description]": description })[selector] || null,
    createElement: tag => ({
      tag, listeners: {},
      addEventListener(event, callback) { this.listeners[event] = callback; },
      remove() { this.removed = true; }
    }),
    addEventListener(event, callback) { handlers[event] = callback; }
  };
  const window = {
    location, SITE_CONFIG: { measurement: options.config === undefined ? configured : options.config },
    localStorage: {
      getItem: key => { if (options.storageThrows) throw new Error("blocked"); return storage.get(key) || null; },
      setItem: (key, value) => { if (options.storageThrows) throw new Error("blocked"); storage.set(key, value); }
    },
    addEventListener(event, callback) { windowHandlers[event] = callback; }
  };
  class FakeDate extends Date { static now() { return now; } }
  vm.runInNewContext(source, { window, document, URL, URLSearchParams, Date: FakeDate });
  function click(kind, data = {}) {
    const element = {
      href: data.href, dataset: data.dataset || {}, focus: () => focuses++,
      closest: selector => {
        if (selector === "[data-cookie-settings]" && kind === "settings") return element;
        if (selector === "[data-cookie]" && kind === "choice") return element;
        if (selector === "a[href]" && kind === "link") return element;
        return null;
      }
    };
    const event = { target: element, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    handlers.click(event);
    return event;
  }
  return {
    window, storage, scripts, notice, description,
    calls: () => JSON.parse(JSON.stringify((window.dataLayer || []).map(args => [...args]))),
    events: () => JSON.parse(JSON.stringify((window.dataLayer || []).filter(args => args[0] === "event").map(args => [...args]))),
    accept: () => click("choice", { dataset: { cookie: "accepted" } }),
    decline: () => click("choice", { dataset: { cookie: "declined" } }),
    settings: () => click("settings"),
    link: (href, dataset) => click("link", { href, dataset }),
    load: () => scripts.at(-1).listeners.load(),
    fail: () => scripts.at(-1).listeners.error(),
    advance: () => { now += 2000; },
    storageEvent: value => windowHandlers.storage({ key: KEY, newValue: value }),
    focuses: () => focuses
  };
}

test("inicia com os quatro consentimentos negados antes de qualquer medição", () => {
  const app = setup();
  assert.deepEqual(app.calls(), [["consent", "default", {
    analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied"
  }]]);
  assert.equal(app.scripts.length, 0);
  assert.equal(app.notice.hidden, false);
  assert.equal(app.window["ga-disable-G-TEST123"], true);
  assert.equal(app.window.MMMeasurement.trackFormSuccess(), false);
});

test("o antigo aviso informativo não conta como permissão para publicidade", () => {
  const app = setup({ storage: { "mm-cookie-preference": "accepted" } });
  assert.equal(app.scripts.length, 0);
  assert.equal(app.notice.hidden, false);
});

test("recusar conserva a navegação sem carregar Google nem enviar eventos", () => {
  const app = setup();
  app.decline();
  const event = app.link("https://api.whatsapp.com/send/?phone=5511991001754");
  assert.equal(event.defaultPrevented, false);
  assert.equal(app.storage.get(KEY), "declined");
  assert.equal(app.notice.hidden, true);
  assert.equal(app.scripts.length, 0);
  assert.deepEqual(app.events(), []);
});

test("aceitar carrega uma única tag e uma page_view explícita somente para GA4", () => {
  const app = setup();
  app.accept();
  assert.equal(app.scripts.length, 1);
  assert.match(app.scripts[0].src, /^https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=AW-/);
  assert.equal(app.calls().some(call => call[0] === "config"), false);
  app.load();
  app.accept();
  assert.equal(app.scripts.length, 1);
  assert.equal(app.calls().filter(call => call[0] === "config").length, 2);
  for (const config of app.calls().filter(call => call[0] === "config")) {
    assert.equal(config[2].send_page_view, false);
    assert.equal(config[2].allow_google_signals, false);
    assert.equal(config[2].allow_ad_personalization_signals, false);
  }
  assert.equal(app.events().length, 1);
  assert.equal(app.events()[0][1], "page_view");
  assert.equal(app.events()[0][2].send_to, "G-TEST123");
  assert.equal(app.calls()[1][2].ad_personalization, "denied");
});

test("preferência explícita válida é restaurada; recusa persistida não carrega tags", () => {
  const accepted = setup({ storage: { [KEY]: "accepted" } });
  assert.equal(accepted.scripts.length, 1);
  const declined = setup({ storage: { [KEY]: "declined" } });
  assert.equal(declined.scripts.length, 0);
  assert.equal(declined.notice.hidden, true);
});

test("sem IDs, sem allowlist, em HTTP ou preview não ativa nem salva aceite prospectivo", () => {
  for (const options of [
    { config: {} }, { config: { ...configured, allowedHosts: [] } },
    { config: { ...configured, googleAdsId: "invalid", ga4Id: "G-<invalid>" } },
    { url: "https://preview.example/" }, { url: "http://site.example/" },
    { url: "https://site.example:4173/" },
    { url: "https://localhost/", config: { ...configured, allowedHosts: ["localhost"] } },
    { url: "https://127.0.0.1/", config: { ...configured, allowedHosts: ["127.0.0.1"] } }
  ]) {
    const app = setup(options);
    assert.equal(app.notice.hidden, true);
    app.settings();
    assert.equal(app.notice.hidden, false);
    assert.match(app.description.textContent, /Nenhuma medição opcional/);
    app.accept();
    assert.equal(app.scripts.length, 0);
    assert.equal(app.storage.has(KEY), false);
    assert.equal(app.window.MMMeasurement.trackFormSuccess(), false);
  }
});

test("bloqueio do localStorage não impede a escolha nem o funcionamento dos links", () => {
  const app = setup({ storageThrows: true });
  assert.doesNotThrow(() => app.accept());
  app.load();
  assert.equal(app.scripts.length, 1);
  assert.equal(app.link("https://wa.me/5511991001754").defaultPrevented, false);
  assert.doesNotThrow(() => app.decline());
});

test("cliques geram uma ação por destino, intenção e posição, sem texto nem URL de contato", () => {
  const app = setup();
  app.accept(); app.load();
  const href = "https://api.whatsapp.com/send/?phone=5511991001754&text=mensagem-pessoal";
  const details = { contactIntent: "abrir_empresa", contactPlacement: "home", email: "pessoa@example.org" };
  const event = app.link(href, details);
  app.link(href, details);
  let contacts = app.events().filter(call => call[1] !== "page_view");
  assert.equal(contacts.length, 2);
  assert.equal(event.defaultPrevented, false);
  assert.equal(contacts[0][1], "contact_click");
  assert.equal(contacts[0][2].send_to, "G-TEST123");
  assert.equal(contacts[1][1], "conversion");
  assert.equal(contacts[1][2].send_to, "AW-123456789/wa_label");
  assert.equal(contacts[0][2].contact_intent, "abrir_empresa");
  assert.equal(contacts[0][2].contact_placement, "home");
  assert.doesNotMatch(JSON.stringify(contacts), /mensagem-pessoal|5511991001754|pessoa@example/);
  app.advance(); app.link(href, details);
  assert.equal(app.events().filter(call => call[1] === "contact_click").length, 2);
});

test("Gmail, mailto e telefone são cliques, outros domínios não geram contatos", () => {
  const app = setup(); app.accept(); app.load();
  app.link("https://mail.google.com/mail/?view=cm&to=contabilmm@yahoo.com.br");
  app.advance(); app.link("mailto:contabilmm@yahoo.com.br");
  app.link("tel:+5511991001754");
  app.link("https://www.google.com/maps/?cid=123");
  app.link("https://api.whatsapp.com.evil.example/");
  assert.deepEqual(app.events().filter(call => call[1] === "contact_click").map(call => call[2].contact_method), ["email", "email", "phone"]);
  assert.equal(app.events().some(call => call[1] === "generate_lead"), false);
});

test("o hook de sucesso é o único generate_lead e descarta quaisquer dados pessoais", () => {
  const app = setup(); app.accept(); app.load();
  app.window.MMMeasurement.trackFormSuccess({ intent: "pessoa@example.org", placement: "qualquer texto", nome: "Cliente Teste", email: "pessoa@example.org", telefone: "11999999999" });
  app.window.MMMeasurement.trackFormSuccess();
  const leads = app.events().filter(call => call[1] === "generate_lead");
  assert.equal(leads.length, 1);
  assert.equal(leads[0][2].contact_intent, "geral");
  assert.equal(leads[0][2].contact_placement, "contact");
  assert.equal(app.events().filter(call => call[1] === "conversion" && call[2].send_to.endsWith("/form_label")).length, 1);
  assert.doesNotMatch(JSON.stringify(app.calls()), /Cliente Teste|pessoa@example|11999999999|qualquer texto/);
});

test("revogar bloqueia novos eventos e reabre as preferências com foco", () => {
  const app = setup(); app.accept(); app.load();
  const event = app.settings();
  assert.equal(event.defaultPrevented, true);
  assert.equal(app.notice.hidden, false);
  app.decline();
  assert.equal(app.focuses(), 2);
  assert.equal(app.window["ga-disable-G-TEST123"], true);
  const count = app.events().length;
  app.link("https://wa.me/5511991001754");
  assert.equal(app.window.MMMeasurement.trackFormSuccess(), false);
  assert.equal(app.events().length, count);
  assert.ok(Object.values(app.calls().at(-1)[2]).every(value => value === "denied"));
});

test("revogar durante o carregamento descarta a fila e não configura tags ao terminar", () => {
  const app = setup(); app.accept();
  app.link("https://wa.me/5511991001754");
  app.decline(); app.load();
  assert.deepEqual(app.events(), []);
  assert.equal(app.calls().some(call => call[0] === "config"), false);
  app.accept();
  assert.equal(app.events().length, 1);
  assert.equal(app.events()[0][1], "page_view");
});

test("revogação em outra aba interrompe eventos também nesta aba", () => {
  const app = setup(); app.accept(); app.load();
  app.storageEvent("declined");
  assert.equal(app.window.MMMeasurement.trackFormSuccess(), false);
  assert.equal(app.window["ga-disable-G-TEST123"], true);
});

test("a URL enviada preserva somente identificadores de campanha válidos e referrer sem consulta", () => {
  const app = setup({
    url: "https://site.example/contato.html?gclid=Allowed_123&gbraid=braid-1&wbraid=braid-2&gclsrc=aw.ds&utm_source=google&utm_medium=cpc&utm_campaign=guarulhos-2026&utm_term=contabilidade&utm_content=card-1&utm_id=pessoa%40example.org&email=cliente%40example.org&q=nome+da+pessoa#telefone=11999999999",
    referrer: "https://www.google.com/search?q=nome+da+pessoa&email=cliente%40example.org"
  });
  app.accept(); app.load();
  const sent = new URL(app.events()[0][2].page_location);
  assert.equal(sent.searchParams.get("gclid"), "Allowed_123");
  assert.equal(sent.searchParams.get("gbraid"), "braid-1");
  assert.equal(sent.searchParams.get("wbraid"), "braid-2");
  assert.equal(sent.searchParams.get("utm_campaign"), "guarulhos-2026");
  assert.equal(sent.searchParams.get("utm_term"), "contabilidade");
  assert.equal(sent.searchParams.has("email"), false);
  assert.equal(sent.searchParams.has("utm_id"), false);
  assert.equal(sent.searchParams.has("q"), false);
  assert.equal(sent.hash, "");
  assert.equal(app.events()[0][2].page_referrer, "https://www.google.com/");
  assert.doesNotMatch(JSON.stringify(app.calls()), /cliente|pessoa|11999999999/);
});

test("IDs opcionais e rótulos ausentes não enviam conversões para destinos incorretos", () => {
  const app = setup({ config: { ...configured, ga4Id: "", conversionLabels: {} } });
  app.accept(); app.load(); app.link("https://wa.me/5511991001754");
  assert.deepEqual(app.events(), []);
  const gaOnly = setup({ config: { ...configured, googleAdsId: "" } });
  gaOnly.accept(); gaOnly.load(); gaOnly.link("https://wa.me/5511991001754");
  assert.deepEqual(gaOnly.events().map(call => call[1]), ["page_view", "contact_click"]);
});

test("erro na tag não bloqueia contato e não reaproveita eventos pendentes após nova tentativa", () => {
  const app = setup(); app.accept();
  const event = app.link("https://wa.me/5511991001754");
  app.fail();
  assert.equal(event.defaultPrevented, false);
  assert.equal(app.scripts[0].removed, true);
  app.accept(); app.load();
  assert.equal(app.events().length, 1);
  assert.equal(app.events()[0][1], "page_view");
});
