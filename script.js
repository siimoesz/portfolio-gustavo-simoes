// ===== Configuração do WhatsApp =====
// Para trocar o número, mude só esta linha (formato: 55 + DDD + número).
const WHATSAPP = "5511997975622";
const MENSAGEM_PADRAO = "Olá, Gustavo! Vi seu portfólio e quero um orçamento para um site.";

// Todos os botões com a classe "js-whats" abrem o WhatsApp.
// Se o botão tiver data-plano, a mensagem já diz qual plano a pessoa escolheu.
document.querySelectorAll(".js-whats").forEach((botao) => {
  const projeto = botao.dataset.projeto; // botões "Quero um site assim" dos projetos
  const plano = botao.dataset.plano || (projeto && `projeto ${projeto}`);
  const mensagem = projeto
    ? `Olá, Gustavo! Vi o projeto ${projeto} no seu portfólio e quero um site assim.`
    : botao.dataset.plano
      ? `Olá, Gustavo! Vi seu portfólio e tenho interesse no plano ${botao.dataset.plano}.`
      : MENSAGEM_PADRAO;
  botao.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
  botao.target = "_blank";
  botao.rel = "noopener";

  // Conta cada clique no WhatsApp no Google Analytics (evento "clique_whatsapp")
  botao.addEventListener("click", () => {
    if (typeof gtag === "function") {
      gtag("event", "clique_whatsapp", { plano: plano || "geral" });
    }
    // Conta o mesmo clique no Meta (Pixel), como evento padrão "Contact"
    if (typeof fbq === "function") {
      fbq("track", "Contact", { content_name: plano || "geral" });
    }
  });
});

// Conta cada clique no e-mail no Google Analytics (evento "clique_email")
document.querySelectorAll(".js-email").forEach((link) => {
  link.addEventListener("click", () => {
    if (typeof gtag === "function") gtag("event", "clique_email");
  });
});

// ===== Menu do celular =====
const menuToggle = document.getElementById("menuToggle");
const nav = document.getElementById("nav");

// (a página de política de privacidade não tem menu, por isso o "if")
if (menuToggle && nav) {
  const fecharMenu = () => {
    nav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menu");
  };

  menuToggle.addEventListener("click", () => {
    const aberto = nav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(aberto));
    menuToggle.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
  });

  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", fecharMenu));
}

// ===== Detalhes dos projetos ("Ver detalhes") =====
document.querySelectorAll("[data-case]").forEach((botao) => {
  const caixa = document.getElementById(botao.dataset.case);
  if (!caixa || typeof caixa.showModal !== "function") return;
  botao.addEventListener("click", () => {
    caixa.showModal();
    caixa.scrollTop = 0;
    if (typeof gtag === "function") gtag("event", "ver_detalhes_projeto", { projeto: botao.dataset.case });
  });
});
document.querySelectorAll("dialog.case").forEach((caixa) => {
  caixa.querySelector(".case__close").addEventListener("click", () => caixa.close());
  // fecha ao clicar fora do conteúdo
  caixa.addEventListener("click", (e) => { if (e.target === caixa) caixa.close(); });
});

// ===== Aviso de cookies (LGPD) =====
// Aparece só na primeira visita; ao clicar em "Entendi", o navegador lembra e não mostra mais.
const avisoCookies = document.getElementById("avisoCookies");
if (avisoCookies) {
  let jaViu = false;
  try { jaViu = localStorage.getItem("avisoCookies") === "ok"; } catch (e) {}
  if (!jaViu) avisoCookies.hidden = false;
  avisoCookies.querySelector("button").addEventListener("click", () => {
    avisoCookies.hidden = true;
    try { localStorage.setItem("avisoCookies", "ok"); } catch (e) {}
  });
}

// ===== Animação das seções ao rolar a página =====
const observer = new IntersectionObserver(
  (entradas) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add("is-visible");
        observer.unobserve(entrada.target);
      }
    });
  },
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

// ===== Ano automático no rodapé =====
const ano = document.getElementById("year");
if (ano) ano.textContent = new Date().getFullYear();
