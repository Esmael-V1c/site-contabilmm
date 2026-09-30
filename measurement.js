"use strict";

// Medição básica por consentimento: nenhuma tag remota antes do aceite.
(() => {
  const CONSENT_KEY = "mm-measurement-consent-v1";
  const config = window.SITE_CONFIG?.measurement || {};
  const adsId = /^AW-\d+$/.test(config.googleAdsId || "") ? config.googleAdsId : "";
  const ga4Id = /^G-[A-Z0-9]+$/.test(config.ga4Id || "") ? config.ga4Id : "";
  const allowedHosts = Array.isArray(config.allowedHosts) ? config.allowedHosts : [];
  const host = window.location.hostname.toLowerCase();
  const localHost = host === "localhost" || host.endsWith(".localhost") || host.includes(":") || /^\d+(\.\d+){3}$/.test(host);
  const enabled = Boolean((adsId || ga4Id) && !localHost && window.location.protocol === "https:" &&
    (!window.location.port || window.location.port === "443") && allowedHosts.includes(host));
  const notice = document.querySelector(".cookie-notice");
  const description = document.querySelector("[data-cookie-description]");
  const intents = new Set(["abrir_empresa", "trocar_contador", "servico", "geral"]);
  const placements = new Set(["header", "footer", "floating", "home", "services", "contact"]);
  const pages = {
    "/": ["home", "Contabil MM | Contabilidade em Guarulhos"],
    "/index.html": ["home", "Contabil MM | Contabilidade em Guarulhos"],
    "/servicos.html": ["services", "Serviços | Contabil MM"],
    "/sobre.html": ["about", "Sobre | Contabil MM"],
    "/contato.html": ["contact", "Contato | Contabil MM"],
    "/privacidade.html": ["privacy", "Privacidade | Contabil MM"]
  };
  const pathname = Object.hasOwn(pages, window.location.pathname) ? window.location.pathname : "/";
  const page = pages[pathname];
  const pageUrl = new URL(pathname, window.location.origin);
  // Somente identificadores de campanhas, nunca consulta livre ou dados do formulário.
  const sourceParams = new URLSearchParams(window.location.search);
  for (const key of ["gclid", "gbraid", "wbraid", "gclsrc", "utm_source", "utm_medium", "utm_campaign", "utm_id", "utm_term", "utm_content"]) {
    const value = sourceParams.get(key);
    if (value && /^[A-Za-z0-9_.~-]{1,200}$/.test(value)) pageUrl.searchParams.set(key, value);
  }
  let referrer = "";
  try {
    const referrerUrl = new URL(document.referrer);
    if (["https:", "http:"].includes(referrerUrl.protocol)) referrer = referrerUrl.origin + "/";
  } catch { /* Acesso direto ou origem sem URL válida. */ }
  const pageData = { page_location: pageUrl.href, page_referrer: referrer, page_title: page[1] };
  const denied = { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" };
  let consent = null;
  let tagState = "idle";
  let configured = false;
  let pageViewSent = false;
  let pending = [];
  let settingsTrigger = null;
  const recentEvents = new Map();

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  const gtag = (...args) => window.gtag(...args);
  gtag("consent", "default", { ...denied });
  if (ga4Id) window["ga-disable-" + ga4Id] = true;

  function canMeasure() { return enabled && consent === "accepted"; }

  function sendEvent(kind, details) {
    if (!canMeasure()) return false;
    if (tagState !== "ready") {
      // Limite defensivo; a fila é descartada ao revogar ou falhar o carregamento.
      if (pending.length < 20) pending.push([kind, details]);
      return true;
    }
    if (ga4Id) {
      gtag("event", kind === "form_submit" ? "generate_lead" : "contact_click", {
        ...pageData,
        ...details,
        send_to: ga4Id
      });
    }
    const label = config.conversionLabels?.[kind];
    if (adsId && typeof label === "string" && /^[A-Za-z0-9_-]+$/.test(label)) {
      gtag("event", "conversion", { ...pageData, ...details, send_to: adsId + "/" + label });
    }
    return true;
  }

  function configureTags() {
    if (!canMeasure() || tagState !== "ready") return;
    if (!configured) {
      const common = { ...pageData, send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false };
      if (adsId) gtag("config", adsId, { ...common });
      if (ga4Id) gtag("config", ga4Id, { ...common });
      configured = true;
    }
    if (ga4Id && !pageViewSent) {
      gtag("event", "page_view", { ...pageData, send_to: ga4Id });
      pageViewSent = true;
    }
    const events = pending;
    pending = [];
    events.forEach(([kind, details]) => sendEvent(kind, details));
  }

  function loadTags() {
    if (!canMeasure()) return;
    if (tagState === "ready") return configureTags();
    if (tagState === "loading") return;
    tagState = "loading";
    gtag("set", { ...pageData, allow_google_signals: false, allow_ad_personalization_signals: false,
      ads_data_redaction: true, url_passthrough: false });
    gtag("js", new Date());
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(adsId || ga4Id);
    script.referrerPolicy = "strict-origin-when-cross-origin";
    script.addEventListener("load", () => {
      tagState = "ready";
      configureTags();
    }, { once: true });
    script.addEventListener("error", () => {
      tagState = "idle";
      pending = [];
      script.remove();
    }, { once: true });
    document.head.append(script);
  }

  function setConsent(value, persist = true) {
    consent = value === "accepted" ? "accepted" : "declined";
    if (persist && enabled) {
      try { window.localStorage.setItem(CONSENT_KEY, consent); } catch { /* A escolha vale para esta página. */ }
    }
    const granted = canMeasure();
    if (ga4Id) window["ga-disable-" + ga4Id] = !granted;
    gtag("consent", "update", granted ? {
      analytics_storage: ga4Id ? "granted" : "denied",
      ad_storage: adsId ? "granted" : "denied",
      ad_user_data: adsId ? "granted" : "denied",
      ad_personalization: "denied"
    } : { ...denied });
    if (notice) notice.hidden = true;
    if (!granted) {
      pending = [];
      recentEvents.clear();
    } else loadTags();
  }

  function detailsFor(source, method) {
    const dataset = source || {};
    return {
      contact_method: method,
      contact_intent: intents.has(dataset.contactIntent || dataset.intent) ? (dataset.contactIntent || dataset.intent) : "geral",
      contact_placement: placements.has(dataset.contactPlacement || dataset.placement) ? (dataset.contactPlacement || dataset.placement) : "contact",
      page_type: page[0]
    };
  }

  function track(kind, details) {
    if (!canMeasure()) return false;
    const key = [kind, details.contact_intent, details.contact_placement].join(":");
    const now = Date.now();
    if (recentEvents.has(key) && now - recentEvents.get(key) < 1500) return false;
    recentEvents.set(key, now);
    return sendEvent(kind, details);
  }

  function contactMethod(link) {
    try {
      const url = new URL(link.href, window.location.href);
      if (url.protocol === "tel:") return "phone";
      if (url.protocol === "mailto:") return "email";
      if (url.protocol !== "https:") return "";
      if (["api.whatsapp.com", "wa.me", "web.whatsapp.com"].includes(url.hostname)) return "whatsapp";
      if (url.hostname === "mail.google.com" && url.pathname.startsWith("/mail/")) return "email";
    } catch { /* Links sem destino válido não são eventos de contato. */ }
    return "";
  }

  document.addEventListener("click", event => {
    const target = event.target;
    if (!target || typeof target.closest !== "function") return;
    const settings = target.closest("[data-cookie-settings]");
    if (settings) {
      event.preventDefault();
      settingsTrigger = settings;
      if (notice) {
        notice.hidden = false;
        notice.querySelector("[data-cookie]")?.focus();
      }
      return;
    }
    const choice = target.closest("[data-cookie]");
    if (choice && ["accepted", "declined"].includes(choice.dataset.cookie)) {
      setConsent(choice.dataset.cookie);
      settingsTrigger?.focus();
      return;
    }
    const link = target.closest("a[href]");
    if (!link || event.defaultPrevented) return;
    const method = contactMethod(link);
    if (method) track(method + "_click", detailsFor(link.dataset, method));
    // A navegação continua imediatamente, mesmo com tags bloqueadas ou indisponíveis.
  });

  window.MMMeasurement = Object.freeze({
    // Chamar apenas após HTTP 2xx do serviço de envio; nunca fornecer FormData.
    trackFormSuccess: details => track("form_submit", detailsFor(details, "form"))
  });

  if (description && !enabled) description.textContent = "Nenhuma medição opcional está ativa neste endereço. Quando houver recursos de medição disponíveis, você poderá aceitar ou recusar. Nenhum aceite é salvo antecipadamente.";
  let saved = null;
  try { saved = window.localStorage.getItem(CONSENT_KEY); } catch { /* Não depende do armazenamento local. */ }
  if (["accepted", "declined"].includes(saved)) setConsent(saved, false);
  else if (notice) notice.hidden = !enabled;
  // Uma recusa em outra aba também interrompe imediatamente os eventos nesta página.
  window.addEventListener("storage", event => {
    if (event.key === CONSENT_KEY) setConsent(event.newValue === "accepted" ? "accepted" : "declined", false);
  });
})();
