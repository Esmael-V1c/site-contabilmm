const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..");
const source = readFileSync(path.join(root, "clients.js"), "utf8");

function element(tagName = "DIV") {
  const listeners = new Map();
  const attributes = new Map();
  return {
    tagName, listeners, attributes, hidden: false, disabled: false, textContent: "", childNodes: [], clicks: 0,
    addEventListener(type, callback) {
      const list = listeners.get(type) || [];
      list.push(callback);
      listeners.set(type, list);
    },
    emit(type, properties = {}) {
      const event = { target: this, preventDefault() { this.prevented = true; }, ...properties };
      for (const callback of listeners.get(type) || []) callback(event);
      return event;
    },
    click() { this.clicks += 1; this.emit("click"); },
    append(...children) { this.childNodes.push(...children); },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    removeAttribute(name) { attributes.delete(name); },
    closest() { return null; },
  };
}

function harness({ reduced = false, count = 24, observer = true } = {}) {
  let expanded = false;
  let timerId = 0;
  let frameId = 0;
  let now = 0;
  const timers = new Map();
  const frames = new Map();
  let intersectionCallback;
  let resizeCallback;
  const previous = element();
  const next = element();
  const auto = element();
  const expand = element();
  const position = element();
  const announcement = element();
  const controls = [element(), element()];
  controls.forEach(control => { control.hidden = true; });
  const dimensions = { cardWidth: 250, gap: 16 };
  const track = {
    ...element("UL"), scrollLeft: 0, clientWidth: 300, moves: [], scrollIntoViewCalls: 0,
    get scrollWidth() {
      const shown = this.childNodes.filter(card => !card.hidden).length;
      return expanded ? this.clientWidth : shown * dimensions.cardWidth + (shown - 1) * dimensions.gap;
    },
    getBoundingClientRect() { return { left: 0, right: this.clientWidth, width: this.clientWidth }; },
    scrollTo(options) {
      this.moves.push(options);
      this.scrollLeft = Math.max(0, Math.min(this.scrollWidth - this.clientWidth, options.left));
      this.emit("scroll");
    },
    scrollIntoView() { this.scrollIntoViewCalls += 1; },
  };
  function makeCard(index) {
    const card = {
      ...element("LI"), company: index, links: [],
      closest(selector) { return selector === ".client-card" ? this : null; },
      getBoundingClientRect() {
        const left = expanded ? 0 : track.childNodes.indexOf(this) * (dimensions.cardWidth + dimensions.gap) - track.scrollLeft;
        return { left, right: left + dimensions.cardWidth, width: dimensions.cardWidth };
      },
      cloneNode() { return makeCard(index); },
      querySelectorAll(selector) { return selector === "a" ? this.links.filter(link => link.tagName === "A") : []; },
    };
    if (index === 0) {
      const link = { ...element("A"), className: "client-link", childNodes: [element("IMG")] };
      link.replaceWith = replacement => { card.links[0] = replacement; };
      card.links.push(link);
    }
    return card;
  }
  const cards = Array.from({ length: count }, (_, index) => makeCard(index));
  track.append(...cards);
  const nodes = {
    ".clients-track": track, "[data-client-prev]": previous, "[data-client-next]": next,
    "[data-client-auto]": auto, "[data-client-expand]": expand,
    "[data-client-position]": position, "[data-client-announcement]": announcement,
  };
  const section = {
    ...element(),
    classList: { add() {}, toggle(name, active) { if (name === "is-expanded") expanded = active; } },
    querySelector(selector) { return nodes[selector] || null; },
    querySelectorAll(selector) {
      return selector === ".client-card" ? cards : selector === "[data-client-controls]" ? controls : [];
    },
  };
  const motion = { ...element(), matches: reduced };
  const document = { ...element(), hidden: false, querySelector() { return section; }, createElement: tag => element(tag.toUpperCase()) };
  const window = {
    ...element(),
    matchMedia() { return motion; },
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(callback) { const id = ++frameId; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
  };
  class IntersectionObserver {
    constructor(callback) { intersectionCallback = callback; }
    observe() {}
  }
  class ResizeObserver {
    constructor(callback) { resizeCallback = callback; }
    observe() {}
  }
  if (observer) window.IntersectionObserver = IntersectionObserver;
  window.ResizeObserver = ResizeObserver;
  vm.runInNewContext(source, {
    window, document, IntersectionObserver, ResizeObserver,
    getComputedStyle() { return { columnGap: dimensions.gap + "px" }; },
  });
  function advanceFrame(milliseconds = 1000 / 60) {
    now += milliseconds;
    for (const [id, callback] of [...frames]) {
      if (!frames.has(id)) continue;
      frames.delete(id);
      callback(now);
    }
  }
  function advanceFrames(count, milliseconds = 1000 / 60) {
    for (let i = 0; i < count; i += 1) advanceFrame(milliseconds);
  }
  function runTimer(delay) {
    const entry = [...timers].find(([, item]) => item.delay === delay);
    if (!entry) return false;
    timers.delete(entry[0]);
    entry[1].callback();
    return true;
  }
  return {
    section, track, cards, previous, next, auto, expand, position, announcement, controls,
    motion, document, window, advanceFrame, advanceFrames, runTimer, dimensions,
    copies: track.childNodes.slice(count),
    hasAutoplay: () => [...frames.values()].some(callback => callback.name === "tick"),
    visible(value) { intersectionCallback?.([{ isIntersecting: value }]); },
    resize() { resizeCallback(); },
  };
}
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.001, actual + " ≈ " + expected);

test("movimento contínuo avança 24px por segundo a 60Hz e 120Hz, sem saltos por card", () => {
  for (const hz of [60, 120]) {
    const h = harness();
    h.visible(true);
    h.advanceFrame(0);
    h.advanceFrames(hz, 1000 / hz);
    near(h.track.scrollLeft, 24);
    const positions = h.track.moves.map(move => move.left);
    for (let i = 1; i < positions.length; i += 1) {
      assert.ok(positions[i] > positions[i - 1]);
      assert.ok(positions[i] - positions[i - 1] < 1);
    }
    assert.ok(h.track.moves.every(move => move.behavior === "instant"));
    assert.equal(h.announcement.textContent, "");
  }
});

test("somente a vitrine visível e uma aba ativa animam; retorno não compensa tempo parado", () => {
  const h = harness();
  assert.equal(h.hasAutoplay(), false);
  assert.ok(h.controls.every(control => !control.hidden));
  h.visible(true);
  h.advanceFrame();
  h.advanceFrames(60);
  const left = h.track.scrollLeft;
  h.document.hidden = true;
  h.document.emit("visibilitychange");
  assert.equal(h.hasAutoplay(), false);
  h.advanceFrame(60000);
  near(h.track.scrollLeft, left);
  h.document.hidden = false;
  h.document.emit("visibilitychange");
  h.advanceFrame(60000);
  near(h.track.scrollLeft, left);
  h.advanceFrame();
  near(h.track.scrollLeft, left + 0.4);
  h.visible(false);
  assert.equal(h.hasAutoplay(), false);
});

test("a junção retorna ao logo equivalente sem percorrer a lista ao contrário", () => {
  const h = harness();
  const cycle = 24 * 266;
  h.track.scrollTo({ left: cycle - 0.1, behavior: "instant" });
  h.visible(true);
  h.advanceFrame(0);
  h.advanceFrame();
  near(h.track.scrollLeft, 0.3);
  assert.equal(h.track.moves.at(-1).behavior, "instant");
  h.advanceFrame();
  near(h.track.scrollLeft, 0.7);
  assert.deepEqual(h.copies.map(card => card.company), h.cards.map(card => card.company));
});

test("somente hover nos cards suspende; sair retoma suavemente, inclusive nas cópias", () => {
  const h = harness();
  h.visible(true);
  h.section.emit("pointerenter", { pointerType: "mouse" });
  assert.equal(h.hasAutoplay(), true);
  h.section.emit("focusin", { target: h.auto });
  assert.equal(h.hasAutoplay(), true);
  for (const card of [h.cards[0], h.copies[0]]) {
    card.emit("pointerenter", { pointerType: "mouse" });
    assert.equal(h.hasAutoplay(), false);
    const left = h.track.scrollLeft;
    h.advanceFrame(30000);
    near(h.track.scrollLeft, left);
    card.emit("pointerleave", { pointerType: "mouse" });
    assert.equal(h.hasAutoplay(), true);
    h.advanceFrame();
    h.advanceFrame();
    near(h.track.scrollLeft, left + 0.4);
  }
});

test("toque e navegação manual pausam até reativar; foco em logo revela a empresa original", () => {
  const h = harness();
  h.visible(true);
  h.track.emit("pointerdown", { pointerType: "touch", target: h.cards[0] });
  assert.equal(h.hasAutoplay(), false);
  h.cards[0].emit("pointerleave", { pointerType: "touch" });
  assert.equal(h.hasAutoplay(), false);
  h.auto.emit("click");
  assert.equal(h.hasAutoplay(), true);
  h.track.emit("wheel", { target: h.cards[1], deltaY: 30 });
  assert.equal(h.hasAutoplay(), false);
  h.auto.emit("click");
  h.section.emit("focusin", { target: h.cards[10] });
  assert.equal(h.hasAutoplay(), false);
  assert.equal(h.track.scrollLeft, 2660);
  h.auto.emit("click");
  h.auto.emit("click");
  assert.equal(h.hasAutoplay(), false);
  assert.equal(h.auto.textContent, "Ativar exibição");
});

test("setas e teclado percorrem o ciclo manualmente e anunciam a posição", () => {
  const h = harness();
  h.visible(true);
  h.next.emit("click");
  h.advanceFrame();
  assert.equal(h.track.scrollLeft, 266);
  assert.equal(h.hasAutoplay(), false);
  h.runTimer(650);
  assert.equal(h.announcement.textContent, "2 de 24 empresas");
  h.track.emit("keydown", { key: "End" });
  assert.equal(h.track.scrollLeft, 23 * 266);
  h.next.emit("click");
  assert.equal(h.track.scrollLeft, 0);
  h.previous.emit("click");
  assert.equal(h.track.scrollLeft, 23 * 266);
  h.track.emit("keydown", { key: "Home" });
  assert.equal(h.track.scrollLeft, 0);
  const event = h.track.emit("keydown", { key: "ArrowRight", target: h.cards[0] });
  assert.equal(event.prevented, undefined);
  assert.equal(h.track.scrollLeft, 0);
});

test("movimento reduzido impede autoplay e mantém navegação instantânea", () => {
  const h = harness({ reduced: true });
  h.visible(true);
  h.advanceFrames(120);
  assert.equal(h.hasAutoplay(), false);
  assert.equal(h.track.scrollLeft, 0);
  assert.equal(h.auto.disabled, true);
  h.next.emit("click");
  assert.equal(h.track.moves.at(-1).behavior, "instant");
  assert.equal(h.track.scrollLeft, 266);
  const active = harness();
  active.visible(true);
  active.motion.matches = true;
  active.motion.emit("change");
  assert.equal(active.hasAutoplay(), false);
});

test("cópias não duplicam links acessíveis e a grade mostra somente as 24 empresas", () => {
  const h = harness();
  assert.equal(h.cards.length, 24);
  assert.equal(h.copies.length, 24);
  for (const copy of h.copies) {
    assert.equal(copy.attributes.get("aria-hidden"), "true");
    assert.ok(copy.attributes.has("data-reveal-skip"));
    assert.equal(copy.querySelectorAll("a").length, 0);
  }
  h.copies[0].links[0].emit("click");
  assert.equal(h.cards[0].links[0].clicks, 1);
  h.visible(true);
  h.expand.emit("click");
  assert.equal(h.expand.attributes.get("aria-expanded"), "true");
  assert.equal(h.position.textContent, "Todas as 24 empresas");
  assert.equal(h.hasAutoplay(), false);
  assert.ok(h.copies.every(copy => copy.hidden));
  assert.equal(h.previous.disabled, true);
  assert.equal(h.next.disabled, true);
  h.expand.emit("click");
  assert.equal(h.expand.attributes.get("aria-expanded"), "false");
  assert.ok(h.copies.every(copy => !copy.hidden));
  assert.equal(h.track.scrollIntoViewCalls, 1);
  assert.equal(h.track.scrollLeft, 0);
  assert.equal(h.hasAutoplay(), false);
});

test("redimensionamento recalcula o ciclo; listas que cabem na tela não animam", () => {
  const h = harness();
  h.dimensions.cardWidth = 280;
  h.dimensions.gap = 20;
  h.track.clientWidth = 1200;
  h.resize();
  h.track.scrollTo({ left: 24 * 300 - 0.1, behavior: "instant" });
  h.visible(true);
  h.advanceFrame(0);
  h.advanceFrame();
  near(h.track.scrollLeft, 0.3);
  assert.equal(h.track.childNodes.length, 48);
  const short = harness({ count: 1 });
  short.visible(true);
  assert.equal(short.hasAutoplay(), false);
  assert.equal(short.auto.disabled, true);
  assert.equal(short.next.disabled, true);
  assert.ok(short.copies.every(copy => copy.hidden));
});

test("sem observador de visibilidade a navegação permanece manual", () => {
  const h = harness({ observer: false });
  h.advanceFrames(60);
  assert.equal(h.hasAutoplay(), false);
  assert.equal(h.track.scrollLeft, 0);
  h.next.emit("click");
  assert.equal(h.track.scrollLeft, 266);
});

test("a vitrine contém 24 marcas únicas, arquivos responsivos locais e nenhum total antigo", () => {
  const manifest = JSON.parse(readFileSync(path.join(root, "assets/clients/sources.json"), "utf8"));
  const html = readFileSync(path.join(root, "index.html"), "utf8");
  assert.equal(manifest.length, 24);
  assert.equal(new Set(manifest.map(item => item.slug)).size, 24);
  assert.equal((html.match(/class="client-card"/g) || []).length, 24);
  assert.equal(manifest.filter(item => item.restored).length, 5);
  for (const item of manifest) {
    assert.ok(existsSync(path.join(root, item.original)), item.original);
    for (const image of item.variants) {
      assert.ok(existsSync(path.join(root, image.src)), image.src);
      assert.ok(html.includes(image.src));
      assert.ok(image.width > 0 && image.height > 0);
    }
  }
  for (const file of ["index.html", "sobre.html", "servicos.html", "contato.html", "privacidade.html"]) {
    assert.doesNotMatch(readFileSync(path.join(root, file), "utf8"), /\+200\s+(?:clientes|empresas)/i);
  }
  const heading = html.match(/<h2 id="clients-title">([\s\S]*?)<\/h2>/)[1].replace(/<[^>]+>/g, "");
  assert.equal(heading, "+400 Empresas confiam na Contabilidade MM");
});
