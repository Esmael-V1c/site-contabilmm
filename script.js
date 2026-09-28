"use strict";

// Fade de entrada: cada elemento é revelado uma única vez por carregamento.
(() => {
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (motionPreference.matches || !("IntersectionObserver" in window)) return;

  const candidates = [...document.querySelectorAll(
    "section img, section h1, section h2, section h3, section p, section span, .review-card, .reviews-summary"
  )].filter(element => {
    if (element.closest("form, .reviews-controls, .reviews-bottom, [aria-hidden='true']")) return false;
    const card = element.closest(".review-card, .reviews-summary");
    if (card && card !== element) return false;
    // Textos curtos de botões, estrelas e rótulos permanecem imediatamente disponíveis.
    if (element.closest("a, button") && element.tagName !== "IMG") return false;
    if (element.tagName === "SPAN" && element.textContent.trim().length < 40) return false;
    return true;
  });
  // Evita somar fades em um mesmo bloco de conteúdo.
  const candidateSet = new Set(candidates);
  const elements = candidates.filter(element => {
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      if (candidateSet.has(parent)) return false;
    }
    return true;
  });
  const waitingImages = new WeakSet();
  const reveal = element => {
    if (element.dataset.reveal === "shown") return;
    element.dataset.reveal = "shown";
    observer.unobserve(element);
  };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const element = entry.target;
      if (element.tagName === "IMG" && !element.complete) {
        if (!waitingImages.has(element)) {
          waitingImages.add(element);
          const revealLoadedImage = () => {
            element.removeEventListener("load", revealLoadedImage);
            element.removeEventListener("error", revealLoadedImage);
            const bounds = element.getBoundingClientRect();
            if (bounds.bottom > 0 && bounds.top < window.innerHeight && bounds.right > 0 && bounds.left < window.innerWidth) reveal(element);
          };
          element.addEventListener("load", revealLoadedImage, { once: true });
          element.addEventListener("error", revealLoadedImage, { once: true });
        }
      } else {
        reveal(element);
      }
    }
  }, { threshold: 0.01 });

  for (const element of elements) {
    element.dataset.reveal = "pending";
    observer.observe(element);
  }
  document.addEventListener("focusin", event => {
    for (const element of elements) {
      if (element.contains(event.target) || event.target.contains(element)) reveal(element);
    }
  });
  motionPreference.addEventListener("change", event => {
    if (!event.matches) return;
    elements.forEach(reveal);
    observer.disconnect();
  });
})();

// Depoimentos: uma faixa horizontal com botões, toque e navegação por teclado.
const reviewTrack = document.querySelector("#reviews-track");
if (reviewTrack) {
  const previous = document.querySelector("[data-review-prev]");
  const next = document.querySelector("[data-review-next]");
  const position = document.querySelector("#reviews-position");
  const cards = [...reviewTrack.querySelectorAll(".review-card")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const step = () => cards[0].getBoundingClientRect().width + parseFloat(getComputedStyle(reviewTrack).gap);
  const updateReviews = () => {
    const maxScroll = reviewTrack.scrollWidth - reviewTrack.clientWidth;
    previous.disabled = reviewTrack.scrollLeft <= 2;
    next.disabled = reviewTrack.scrollLeft >= maxScroll - 2;
    const first = Math.min(cards.length, Math.round(reviewTrack.scrollLeft / step()) + 1);
    const visible = Math.max(1, Math.round((reviewTrack.clientWidth + parseFloat(getComputedStyle(reviewTrack).gap)) / step()));
    const last = Math.min(cards.length, first + visible - 1);
    const label = first === last ? `${first} de ${cards.length}` : `${first}–${last} de ${cards.length}`;
    if (position.textContent !== label) position.textContent = label;
  };
  const moveReviews = direction => reviewTrack.scrollBy({ left: direction * step(), behavior: reducedMotion.matches ? "instant" : "smooth" });
  previous.addEventListener("click", () => moveReviews(-1));
  next.addEventListener("click", () => moveReviews(1));
  reviewTrack.addEventListener("scroll", updateReviews, { passive: true });
  reviewTrack.addEventListener("keydown", event => {
    if (event.target !== reviewTrack || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") moveReviews(event.key === "ArrowLeft" ? -1 : 1);
    else reviewTrack.scrollTo({ left: event.key === "Home" ? 0 : reviewTrack.scrollWidth, behavior: reducedMotion.matches ? "instant" : "smooth" });
  });
  new ResizeObserver(updateReviews).observe(reviewTrack);
  updateReviews();
}

// Navegação responsiva, inclusive por teclado.
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#navigation");
const siteHeader = document.querySelector(".site-header");
function closeMenu() {
  navigation?.classList.remove("is-open");
  siteHeader?.classList.remove("is-menu-open");
  menuButton?.setAttribute("aria-expanded", "false");
  menuButton?.setAttribute("aria-label", "Abrir menu");
}
menuButton?.addEventListener("click", () => {
  const open = navigation.classList.toggle("is-open");
  siteHeader?.classList.toggle("is-menu-open", open);
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && menuButton?.getAttribute("aria-expanded") === "true") {
    closeMenu();
    menuButton.focus();
  }
});
document.addEventListener("click", event => {
  if (siteHeader && !siteHeader.contains(event.target)) closeMenu();
});
window.matchMedia("(min-width: 1024px)").addEventListener("change", closeMenu);
navigation?.addEventListener("click", event => {
  if (event.target.closest("a")) closeMenu();
});

// Apenas a preferência de cookies é armazenada, sem rastreadores.
const cookieNotice = document.querySelector(".cookie-notice");
try {
  if (cookieNotice) cookieNotice.hidden = Boolean(localStorage.getItem("mm-cookie-preference"));
} catch {
  if (cookieNotice) cookieNotice.hidden = false;
}
document.querySelectorAll("[data-cookie]").forEach(button => {
  button.addEventListener("click", () => {
    try { localStorage.setItem("mm-cookie-preference", button.dataset.cookie); } catch { /* O site funciona com armazenamento bloqueado. */ }
    cookieNotice.hidden = true;
  });
});

const contactDialog = document.querySelector("#contact-dialog");
contactDialog?.querySelector(".dialog-close")?.addEventListener("click", () => contactDialog.close());
contactDialog?.addEventListener("click", event => {
  if (event.target === contactDialog) {
    const bounds = contactDialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) contactDialog.close();
  }
});

document.querySelectorAll("[data-contact-form]").forEach(form => {
  const feedback = document.createElement("p");
  feedback.className = "form-feedback";
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");
  form.append(feedback);
  form.addEventListener("input", event => {
    if (event.target.matches("input, textarea")) event.target.removeAttribute("aria-invalid");
    feedback.textContent = "";
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    for (const field of form.querySelectorAll("input, textarea")) {
      if (field.required && !field.value.trim()) field.value = "";
      if (!field.checkValidity()) {
        field.setAttribute("aria-invalid", "true");
        feedback.textContent = field.type === "email" ? "Informe um e-mail válido." : "Preencha seu nome para continuar.";
        field.focus();
        return;
      }
    }
    const endpoint = window.SITE_CONFIG?.contactEndpoint;
    if (!endpoint) {
      document.querySelector("#contact-feedback").textContent = "O envio deste formulário ainda não foi configurado. Nenhum dado foi enviado. Para falar com a Contabil MM, acesse o canal de contato oficial abaixo.";
      contactDialog.showModal();
      return;
    }
    const button = form.querySelector('[type="submit"], button');
    const label = button.textContent;
    button.disabled = true;
    button.textContent = "Enviando…";
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error("Não foi possível enviar");
      feedback.style.color = "#25633c";
      feedback.textContent = "Mensagem enviada. Nossa equipe entrará em contato em breve.";
      form.reset();
    } catch {
      feedback.style.color = "#a82626";
      feedback.textContent = "Não foi possível enviar a mensagem. Tente novamente em instantes.";
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  });
});
