"use strict";

// A lista original continua acessível e permite rolagem nativa sem JavaScript.
(() => {
  const section = document.querySelector(".clients-showcase");
  if (!section) return;
  const track = section.querySelector(".clients-track");
  const cards = [...section.querySelectorAll(".client-card")];
  const previous = section.querySelector("[data-client-prev]");
  const next = section.querySelector("[data-client-next]");
  const auto = section.querySelector("[data-client-auto]");
  const expand = section.querySelector("[data-client-expand]");
  const position = section.querySelector("[data-client-position]");
  const announcement = section.querySelector("[data-client-announcement]");
  if (!track || !cards.length || !previous || !next || !auto || !expand) return;

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const speed = 24; // Pixels por segundo, independentemente da taxa de atualização da tela.
  let userPaused = motion.matches;
  let visible = false;
  let hovering = false;
  let expanded = false;
  let animationFrame = null;
  let updateFrame = null;
  let announcementTimer = null;
  let lastTime = null;
  let animatedLeft = 0;
  let stride = 0;
  let cycleWidth = 0;
  let overflow = false;

  // Uma segunda sequência visual permite atravessar a junção sem voltar os cards.
  // Ela não duplica links no teclado nem conteúdo para leitores de tela.
  const copies = cards.map(card => {
    const copy = card.cloneNode(true);
    copy.setAttribute("data-client-copy", "");
    copy.setAttribute("data-reveal-skip", "");
    copy.setAttribute("aria-hidden", "true");
    copy.removeAttribute("id");
    copy.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
    copy.querySelectorAll("a").forEach((link, index) => {
      const original = card.querySelectorAll("a")[index];
      const visual = document.createElement("div");
      visual.className = link.className;
      visual.append(...link.childNodes);
      // Preserva o clique nos sites das empresas sem criar outro ponto de foco.
      visual.addEventListener("click", () => original.click());
      link.replaceWith(visual);
    });
    track.append(copy);
    return copy;
  });
  section.classList.add("is-continuous");

  const normalize = value => cycleWidth > 0 ? ((value % cycleWidth) + cycleWidth) % cycleWidth : 0;
  const canPlay = () => !userPaused && !motion.matches && visible && !hovering && !document.hidden && !expanded && overflow;

  function update() {
    const first = stride > 0 ? Math.floor((normalize(track.scrollLeft) + 1) / stride) % cards.length + 1 : 1;
    position.textContent = expanded ? `Todas as ${cards.length} empresas` : `${first} de ${cards.length} empresas`;
    previous.disabled = expanded || !overflow;
    next.disabled = expanded || !overflow;
    auto.disabled = expanded || motion.matches || !overflow;
    auto.removeAttribute("aria-pressed");
    auto.textContent = motion.matches ? "Movimento reduzido" : userPaused ? "Ativar exibição" : "Pausar exibição";
    auto.setAttribute("aria-label", motion.matches ? "Exibição automática desativada pela preferência de movimento reduzido" : userPaused ? "Ativar exibição automática das empresas" : "Pausar exibição automática das empresas");
  }

  function stop() {
    if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    animationFrame = null;
    lastTime = null;
  }

  function tick(time) {
    animationFrame = null;
    if (!canPlay()) { stop(); return; }
    // Não tenta compensar com um salto o tempo em uma aba inativa ou tela travada.
    const elapsed = lastTime === null ? 0 : Math.min(time - lastTime, 64);
    lastTime = time;
    animatedLeft = normalize(animatedLeft + speed * elapsed / 1000);
    track.scrollTo({ left: animatedLeft, behavior: "instant" });
    animationFrame = window.requestAnimationFrame(tick);
  }

  function schedule() {
    if (!canPlay()) { stop(); return; }
    if (animationFrame !== null) return;
    // Mantém as frações de pixel no acumulador para não variar a velocidade.
    animatedLeft = normalize(track.scrollLeft);
    lastTime = null;
    animationFrame = window.requestAnimationFrame(tick);
  }

  function measure() {
    stop();
    if (!expanded) {
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      stride = cards[0].getBoundingClientRect().width + gap;
      cycleWidth = stride * cards.length;
      overflow = cycleWidth - gap > track.clientWidth + 1;
      copies.forEach(copy => { copy.hidden = !overflow; });
    }
    update();
    schedule();
  }

  function pause() {
    userPaused = true;
    stop();
    update();
  }

  function announce() {
    if (announcementTimer !== null) window.clearTimeout(announcementTimer);
    announcementTimer = window.setTimeout(() => {
      update();
      announcement.textContent = position.textContent;
    }, motion.matches ? 0 : 650);
  }

  function move(direction) {
    pause();
    const left = normalize(track.scrollLeft + direction * stride);
    const wraps = Math.abs(left - track.scrollLeft) > stride + 1;
    track.scrollTo({ left, behavior: motion.matches || wraps ? "instant" : "smooth" });
    announce();
  }

  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  auto.addEventListener("click", () => {
    userPaused = !userPaused;
    update();
    schedule();
  });
  expand.addEventListener("click", () => {
    pause();
    expanded = !expanded;
    hovering = false;
    section.classList.toggle("is-expanded", expanded);
    copies.forEach(copy => { copy.hidden = expanded || !overflow; });
    section.setAttribute("aria-roledescription", expanded ? "lista de empresas" : "carrossel");
    expand.setAttribute("aria-expanded", String(expanded));
    expand.textContent = expanded ? "Voltar ao carrossel" : "Ver todas as empresas";
    track.scrollTo({ left: 0, behavior: "instant" });
    measure();
    announcement.textContent = position.textContent;
    if (!expanded) track.scrollIntoView({ block: "nearest", behavior: "instant" });
  });
  track.addEventListener("keydown", event => {
    if (event.target !== track || expanded || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") move(event.key === "ArrowLeft" ? -1 : 1);
    else {
      pause();
      track.scrollTo({ left: event.key === "Home" ? 0 : cycleWidth - stride, behavior: motion.matches ? "instant" : "smooth" });
      announce();
    }
  });
  track.addEventListener("pointerdown", pause, { passive: true });
  track.addEventListener("wheel", event => {
    if (event.target.closest(".client-card") || event.deltaX) pause();
  }, { passive: true });
  section.addEventListener("focusin", event => {
    const card = event.target.closest(".client-card");
    if (!card && event.target !== track) return;
    pause();
    const index = cards.indexOf(card);
    if (index >= 0 && !expanded) track.scrollTo({ left: index * stride, behavior: "instant" });
  });
  [...cards, ...copies].forEach(card => {
    card.addEventListener("pointerenter", event => {
      if (event.pointerType === "touch") return;
      hovering = true;
      schedule();
    });
    card.addEventListener("pointerleave", event => {
      if (event.pointerType === "touch") return;
      hovering = false;
      schedule();
    });
  });
  track.addEventListener("scroll", () => {
    if (updateFrame !== null) return;
    updateFrame = window.requestAnimationFrame(() => { updateFrame = null; update(); });
  }, { passive: true });
  motion.addEventListener("change", () => { if (motion.matches) pause(); update(); schedule(); });
  document.addEventListener("visibilitychange", schedule);
  window.addEventListener("pagehide", stop);
  window.addEventListener("pageshow", schedule);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      schedule();
    }, { threshold: 0.2 }).observe(track);
  }
  // Sem detecção de visibilidade, mantém apenas navegação manual.
  if ("ResizeObserver" in window) new ResizeObserver(measure).observe(track);
  else window.addEventListener("resize", measure);
  section.querySelectorAll("[data-client-controls]").forEach(control => { control.hidden = false; });
  measure();
})();
