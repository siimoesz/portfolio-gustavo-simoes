// ===== Configuração do WhatsApp =====
// Para trocar o número, mude só esta linha (formato: 55 + DDD + número).
const WHATSAPP = "5511997975622";
const MENSAGEM_PADRAO = "Olá, Gustavo! Vi seu portfólio e quero um orçamento para um site.";

// Todos os botões com a classe "js-whats" abrem o WhatsApp.
// Se o botão tiver data-plano, a mensagem já diz qual plano a pessoa escolheu.
document.querySelectorAll(".js-whats").forEach((botao) => {
  const plano = botao.dataset.plano;
  const mensagem = plano
    ? `Olá, Gustavo! Vi seu portfólio e tenho interesse no plano ${plano}.`
    : MENSAGEM_PADRAO;
  botao.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
  botao.target = "_blank";
  botao.rel = "noopener";
});

// ===== Menu do celular =====
const menuToggle = document.getElementById("menuToggle");
const nav = document.getElementById("nav");

function fecharMenu() {
  nav.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Abrir menu");
}

menuToggle.addEventListener("click", () => {
  const aberto = nav.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", String(aberto));
  menuToggle.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
});

nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", fecharMenu));

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
document.getElementById("year").textContent = new Date().getFullYear();
