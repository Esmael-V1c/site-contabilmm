const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

const source = readFileSync(path.join(__dirname, "..", "script.js"), "utf8");

function element() {
  const listeners = new Map();
  const attributes = new Map();
  return {
    dataset: {},
    style: {},
    hidden: false,
    clicks: 0,
    get href() { return attributes.get("href") || ""; },
    set href(value) { attributes.set("href", value); },
    click() { this.clicks += 1; },
    textContent: "",
    listeners,
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    removeAttribute(name) { attributes.delete(name); },
    addEventListener(type, callback) {
      const callbacks = listeners.get(type) || [];
      callbacks.push(callback);
      listeners.set(type, callbacks);
    },
    async dispatch(type, event) {
      return Promise.all((listeners.get(type) || []).map(callback => callback(event)));
    },
    focus() { this.focused = true; },
  };
}

function field(name, value, type = "text") {
  return {
    ...element(), name, value, type, required: true,
    matches() { return true; },
    checkValidity() {
      if (this.required && !this.value) return false;
      return this.type !== "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value);
    },
  };
}

function harness({ endpoint = "https://form.example/receive", method = "endpoint", phone = "5511991001754", placement = "contact", actualConfig = false, values = {}, fetchImpl, measurement = true, measurementImpl } = {}) {
  const fields = [
    field("nome", values.nome ?? "Pessoa de teste"),
    field("email", values.email ?? "pessoa@example.com", "email"),
    { ...field("empresa", values.empresa ?? "Empresa de teste"), required: false },
    { ...field("cargo", values.cargo ?? "Sócia"), required: false },
    { ...field("telefone", values.telefone ?? "(11) 99999-0000", "tel"), required: false },
    { ...field("mensagem", values.mensagem ?? "Quero falar sobre minha empresa"), required: false },
  ];
  const button = { ...element(), textContent: "Enviar mensagem", disabled: false };
  const form = {
    ...element(), dataset: { contactPlacement: placement }, children: [], resets: 0,
    append(child) { this.children.push(child); },
    querySelectorAll(selector) { return selector === "input, textarea" ? fields : []; },
    querySelector(selector) { return selector === '[type="submit"], button' ? button : null; },
    reset() { this.resets += 1; fields.forEach(input => { input.value = ""; }); },
  };
  const feedbackDialog = {
    ...element(), opened: 0,
    querySelector() { return null; },
    showModal() { this.opened += 1; },
    close() {},
  };
  const unavailableFeedback = element();
  const document = {
    ...element(),
    createElement: element,
    querySelectorAll(selector) { return selector === "[data-contact-form]" ? [form] : []; },
    querySelector(selector) {
      if (selector === "#contact-dialog") return feedbackDialog;
      if (selector === "#contact-feedback") return unavailableFeedback;
      // This test page has no menu or review carousel.
      return null;
    },
  };
  const calls = [];
  const events = [];
  const timeoutRequests = [];
  const controllers = [];
  const window = {
    SITE_CONFIG: { contactEndpoint: endpoint, contactMethod: method, contactWhatsAppNumber: phone },
    matchMedia() { return { matches: true, addEventListener() {} }; },
  };
  if (measurement) window.MMMeasurement = {
    trackFormSuccess(details) {
      events.push(JSON.parse(JSON.stringify(details)));
      if (measurementImpl) measurementImpl(details);
    },
  };
  const context = {
    window, document, URL,
    FormData: class {
      constructor() { this.entries = fields.map(input => [input.name, input.value]); }
      [Symbol.iterator]() { return this.entries[Symbol.iterator](); }
    },
    AbortSignal: {
      timeout(milliseconds) {
        timeoutRequests.push(milliseconds);
        const controller = new AbortController();
        controllers.push(controller);
        return controller.signal;
      },
    },
    fetch(url, options) {
      calls.push({ url, options });
      return fetchImpl ? fetchImpl(url, options) : Promise.resolve({ ok: true });
    },
  };
  if (actualConfig) vm.runInNewContext(readFileSync(path.join(__dirname, "..", "config.js"), "utf8"), context);
  vm.runInNewContext(source, context, { filename: "script.js" });
  assert.equal(form.listeners.get("submit")?.length, 1, "O script real deve registrar um único manipulador de envio.");
  return {
    form, fields, button, calls, events, timeoutRequests, controllers, feedbackDialog, unavailableFeedback,
    get feedback() { return form.children[0]; },
    get whatsappLink() { return form.children[1]; },
    async submit() {
      let prevented = false;
      await form.dispatch("submit", { preventDefault() { prevented = true; } });
      assert.equal(prevented, true);
    },
  };
}

test("configuração publicada abre WhatsApp com todos os campos e identifica as duas páginas", async () => {
  for (const placement of ["home", "contact"]) {
    const values = { nome: "  João & Maria  ", email: "joao+site@example.com", empresa: "A&B Construções", cargo: "Sócio / responsável", telefone: "+55 (11) 98888-7777", mensagem: "Olá! Preciso de assessoria.\nReceita: 10% + revisão 🧾 &text=outro #contato" };
    const h = harness({ actualConfig: true, placement, values });
    await h.submit();
    const url = new URL(h.whatsappLink.href);
    assert.equal(url.origin, "https://wa.me");
    assert.equal(url.pathname, "/5511991001754");
    assert.deepEqual([...url.searchParams.keys()], ["text"]);
    const message = url.searchParams.get("text");
    const labels = { nome: "Nome", email: "E-mail", empresa: "Empresa", cargo: "Cargo", telefone: "Telefone", mensagem: "Mensagem" };
    for (const [name, value] of Object.entries(values)) assert.ok(message.includes(labels[name] + ": " + value.trim()));
    assert.ok(message.includes(placement === "home" ? "Página inicial" : "Página de contato"));
    assert.equal(h.whatsappLink.clicks, 1);
    assert.equal(h.whatsappLink.hidden, false);
    assert.equal(h.whatsappLink.target, "_blank");
    assert.match(h.whatsappLink.rel, /noopener/);
    assert.match(h.whatsappLink.rel, /noreferrer/);
    assert.equal(h.whatsappLink.dataset.contactPlacement, placement);
    assert.equal(h.calls.length, 0);
    assert.deepEqual(h.events, [], "Abrir o WhatsApp não confirma um formulário recebido.");
    assert.equal(h.form.resets, 0);
    assert.equal(h.fields[0].value, values.nome);
    assert.match(h.feedback.textContent, /toque em Enviar para concluir/);
    assert.doesNotMatch(h.feedback.textContent, /Mensagem enviada/);
    assert.equal(h.button.disabled, false);
  }
});

test("campos opcionais vazios são identificados sem omitir nome e e-mail", async () => {
  const h = harness({ method: "whatsapp", values: { empresa: "", cargo: " ", telefone: "", mensagem: "\n" } });
  await h.submit();
  const message = new URL(h.whatsappLink.href).searchParams.get("text");
  for (const label of ["Empresa", "Cargo", "Telefone", "Mensagem"]) assert.ok(message.includes(label + ": Não informado"));
  assert.match(message, /Nome: Pessoa de teste/);
  assert.match(message, /E-mail: pessoa@example.com/);
  assert.equal(h.whatsappLink.clicks, 1);
});

test("validação impede abrir WhatsApp com nome vazio ou e-mail inválido", async () => {
  for (const values of [{ nome: "   " }, { email: "email-invalido" }]) {
    const h = harness({ method: "whatsapp", values });
    await h.submit();
    assert.equal(h.whatsappLink.clicks, 0);
    assert.equal(h.whatsappLink.hidden, true);
    assert.equal(h.calls.length, 0);
    assert.deepEqual(h.events, []);
    assert.ok(h.fields.some(input => input.focused && input.getAttribute("aria-invalid") === "true"));
  }
});

test("número de destino ausente ou malformado não encaminha dados", async () => {
  for (const phone of ["", "+55 (11) 99100-1754", "5511991001754&text=alterado", "123", null]) {
    const h = harness({ method: "whatsapp", phone });
    await h.submit();
    assert.equal(h.whatsappLink.href, "");
    assert.equal(h.whatsappLink.clicks, 0);
    assert.equal(h.calls.length, 0);
    assert.deepEqual(h.events, []);
    assert.match(h.feedback.textContent, /indisponível/);
  }
});

test("editar um campo invalida o link anterior e gera nova mensagem ao continuar", async () => {
  const h = harness({ method: "whatsapp", measurement: false });
  await h.submit();
  assert.equal(h.whatsappLink.hidden, false);
  h.fields[0].value = "Nome atualizado";
  await h.form.dispatch("input", { target: h.fields[0] });
  assert.equal(h.whatsappLink.hidden, true);
  assert.equal(h.whatsappLink.href, "");
  assert.equal(h.feedback.textContent, "");
  await h.submit();
  assert.match(new URL(h.whatsappLink.href).searchParams.get("text"), /Nome: Nome atualizado/);
  assert.equal(h.whatsappLink.clicks, 2);
  assert.equal(h.form.resets, 0);
  assert.equal(h.calls.length, 0);
});

test("se a abertura automática não ocorrer, mantém link acionável e dados para tentar novamente", async () => {
  const h = harness({ method: "whatsapp" });
  h.whatsappLink.click = () => {}; // Simula navegador sem realizar a navegação automática.
  await h.submit();
  assert.equal(h.whatsappLink.hidden, false);
  assert.ok(new URL(h.whatsappLink.href).searchParams.get("text").includes("Nome: Pessoa de teste"));
  assert.match(h.feedback.textContent, /Se a conversa não abrir, use o link abaixo/);
  assert.equal(h.form.resets, 0);
  assert.deepEqual(h.events, []);
});

test("páginas mantêm os seis campos esperados e desativam submissão nativa sem JavaScript", () => {
  for (const file of ["index.html", "contato.html"]) {
    const html = readFileSync(path.join(__dirname, "..", file), "utf8");
    const form = html.match(/<form\b[^>]*data-contact-form[^>]*>([\s\S]*?)<\/form>/)[1];
    for (const name of ["nome", "email", "empresa", "cargo", "telefone", "mensagem"]) assert.ok(form.includes('name="' + name + '"'));
    assert.match(form, /<button type="submit" disabled/);
    assert.match(form, /Continuar no WhatsApp/);
    assert.match(form, /toque em Enviar para concluir/);
    assert.match(form, /<noscript>/);
  }
});

test("formulário sem endpoint não envia nem mede conversão", async () => {
  const h = harness({ endpoint: "" });
  await h.submit();
  assert.equal(h.calls.length, 0);
  assert.deepEqual(h.events, []);
  assert.equal(h.feedbackDialog.opened, 1);
  assert.match(h.unavailableFeedback.textContent, /Nenhum dado foi enviado/);
  assert.equal(h.form.resets, 0);
});

test("campos inválidos interrompem o envio antes de qualquer conversão", async () => {
  for (const values of [{ nome: "   " }, { email: "endereco-invalido" }]) {
    const h = harness({ values });
    await h.submit();
    assert.equal(h.calls.length, 0);
    assert.deepEqual(h.events, []);
    assert.equal(h.form.resets, 0);
    assert.ok(h.fields.some(input => input.focused && input.getAttribute("aria-invalid") === "true"));
  }
});

test("resposta HTTP sem sucesso não gera conversão e permite tentar novamente", async () => {
  const h = harness({ fetchImpl: async () => ({ ok: false, status: 503 }) });
  await h.submit();
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.events, []);
  assert.equal(h.form.resets, 0);
  assert.equal(h.button.disabled, false);
  assert.equal(h.form.dataset.submitting, undefined);
  assert.match(h.feedback.textContent, /Não foi possível enviar/);
});

test("falha de rede não gera conversão", async () => {
  const h = harness({ fetchImpl: async () => { throw new TypeError("Network error"); } });
  await h.submit();
  assert.deepEqual(h.events, []);
  assert.equal(h.form.resets, 0);
  assert.equal(h.button.disabled, false);
  assert.match(h.feedback.textContent, /Não foi possível enviar/);
});

test("timeout do envio aborta a requisição sem contabilizar conversão", async () => {
  const h = harness({
    fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    }),
  });
  const pending = h.submit();
  assert.deepEqual(h.timeoutRequests, [15000]);
  assert.equal(h.button.disabled, true);
  h.controllers[0].abort(new DOMException("Tempo excedido", "TimeoutError"));
  await pending;
  assert.deepEqual(h.events, []);
  assert.equal(h.form.resets, 0);
  assert.equal(h.button.disabled, false);
  assert.equal(h.form.dataset.submitting, undefined);
  assert.match(h.feedback.textContent, /Não foi possível enviar/);
});

test("sucesso confirmado mede uma vez com placement e sem dados pessoais", async () => {
  const h = harness();
  await h.submit();
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(h.calls[0].options.body), {
    nome: "Pessoa de teste", email: "pessoa@example.com", empresa: "Empresa de teste", cargo: "Sócia", telefone: "(11) 99999-0000", mensagem: "Quero falar sobre minha empresa",
  });
  assert.deepEqual(h.events, [{ intent: "geral", placement: "contact" }]);
  assert.doesNotMatch(JSON.stringify(h.events), /Pessoa de teste|pessoa@example\.com|Quero falar sobre minha empresa/);
  assert.equal(h.form.resets, 1);
  assert.equal(h.button.disabled, false);
  assert.equal(h.button.textContent, "Enviar mensagem");
  assert.match(h.feedback.textContent, /Mensagem enviada/);
});

test("envio duplicado enquanto pendente não repete requisição nem conversão", async () => {
  let resolveRequest;
  const h = harness({ fetchImpl: () => new Promise(resolve => { resolveRequest = resolve; }) });
  const first = h.submit();
  assert.equal(h.calls.length, 1);
  assert.equal(h.form.dataset.submitting, "true");
  assert.deepEqual(h.events, [], "Não há conversão enquanto o servidor não confirmou o envio.");
  await h.submit();
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.events, []);
  resolveRequest({ ok: true });
  await first;
  assert.deepEqual(h.events, [{ intent: "geral", placement: "contact" }]);
  assert.equal(h.form.resets, 1);
});

test("envio continua funcionando sem o módulo de medição", async () => {
  const h = harness({ measurement: false });
  await h.submit();
  assert.equal(h.calls.length, 1);
  assert.equal(h.form.resets, 1);
  assert.match(h.feedback.textContent, /Mensagem enviada/);
});

test("falha da API de medição não invalida envio já confirmado pelo servidor", async () => {
  const h = harness({ measurementImpl() { throw new Error("Serviço de medição indisponível"); } });
  await h.submit();
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.events, [{ intent: "geral", placement: "contact" }]);
  assert.match(h.feedback.textContent, /Mensagem enviada/);
  assert.doesNotMatch(h.feedback.textContent, /Não foi possível enviar/);
  assert.equal(h.form.resets, 1);
  assert.ok(h.fields.every(input => input.value === ""));
  assert.equal(h.button.disabled, false);
  assert.equal(h.button.textContent, "Enviar mensagem");
  assert.equal(h.form.dataset.submitting, undefined);
});
