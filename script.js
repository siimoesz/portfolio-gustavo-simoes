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

// ===== Diagnóstico gratuito de sites =====
// Primeiro mostra as verificações básicas (rápidas) e depois busca a nota do Google,
// que demora mais. O botão final abre o WhatsApp já com o resultado na mensagem.
const diagForm = document.getElementById("diagForm");
const diagResult = document.getElementById("diagResult");

if (diagForm && diagResult) {
  const criar = (tag, classe, texto) => {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto != null) el.textContent = texto; // sempre texto puro: nada do site analisado vira código
    return el;
  };
  const corDaNota = (n) => (n >= 90 ? "#3fbf7f" : n >= 50 ? "#E2B867" : "#e07a7a");

  diagForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = diagForm.url.value.trim();
    const botao = diagForm.querySelector("button");
    diagResult.hidden = false;
    diagResult.replaceChildren(criar("p", "diag__status", "Analisando o site…"));
    if (!url) {
      diagResult.replaceChildren(criar("p", "diag__erro", "Digite o endereço do seu site, por exemplo: suaempresa.com.br"));
      return;
    }
    botao.disabled = true;
    if (typeof gtag === "function") gtag("event", "diagnostico_site");

    let dados;
    try {
      const resp = await fetch(`/api/diagnostico?url=${encodeURIComponent(url)}`);
      dados = await resp.json();
    } catch (err) {
      dados = { erro: "Não consegui fazer a análise agora. Tente de novo em alguns instantes." };
    }
    botao.disabled = false;
    if (dados.erro) {
      diagResult.replaceChildren(criar("p", "diag__erro", dados.erro));
      return;
    }

    // Resumo + espaço para as notas do Google
    const resumo = criar("div", "diag__resumo");
    const textos = criar("div");
    textos.append(criar("h3", null, `${dados.acertos} de ${dados.total} itens em dia`), criar("p", null, dados.url));
    const notas = criar("ul", "diag__notas");
    const statusNota = criar("li", "diag__status", "Calculando a nota de velocidade do Google (pode levar até 30 segundos)…");
    notas.append(statusNota);
    resumo.append(textos, notas);

    // Lista de itens: o que está ok e o que falta
    const lista = criar("ul", "diag__lista");
    dados.itens.forEach((item) => {
      const li = criar("li", item.ok ? "ok" : "falta");
      li.append(criar("strong", null, item.titulo), criar("span", null, item.explicacao));
      lista.append(li);
    });

    // Chamada para o WhatsApp com o resultado
    const faltas = dados.itens.filter((i) => !i.ok).map((i) => i.titulo.charAt(0).toLowerCase() + i.titulo.slice(1));
    const cta = criar("div", "diag__cta");
    const ctaTexto = criar("p", null, faltas.length
      ? `Encontrei ${faltas.length} ${faltas.length === 1 ? "ponto" : "pontos"} para melhorar. Quer que eu te explique como resolver?`
      : "Seu site está em dia nesses pontos. Quer uma análise mais completa do visual e dos textos?");
    const zap = criar("a", "btn btn--gold", "Quero melhorar meu site");
    const montarLink = (extra) => {
      const msg = `Olá, Gustavo! Fiz o diagnóstico do meu site (${dados.url}) no seu portfólio: ${dados.acertos} de ${dados.total} itens em dia${extra || ""}.` +
        (faltas.length ? ` Pontos para melhorar: ${faltas.join("; ")}.` : "") + " Pode me ajudar?";
      zap.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
    };
    montarLink();
    zap.target = "_blank";
    zap.rel = "noopener";
    zap.addEventListener("click", () => {
      if (typeof gtag === "function") gtag("event", "clique_whatsapp", { plano: "diagnostico" });
      if (typeof fbq === "function") fbq("track", "Contact", { content_name: "diagnostico" });
    });
    cta.append(ctaTexto, zap);

    diagResult.replaceChildren(resumo, lista, cta);

    // Nota do Google (mais demorada)
    try {
      const resp = await fetch(`/api/diagnostico?url=${encodeURIComponent(dados.url)}&etapa=nota`);
      const nota = await resp.json();
      if (nota.indisponivel || nota.erro || nota.velocidade == null) {
        statusNota.remove();
        return;
      }
      const itens = [["Velocidade no celular", nota.velocidade], ["Acessibilidade", nota.acessibilidade], ["SEO", nota.seo]];
      const lis = itens.filter(([, n]) => n != null).map(([rotulo, n]) => {
        const li = criar("li");
        const g = criar("span", "gauge", String(n));
        g.style.setProperty("--v", n);
        g.style.setProperty("--nota-cor", corDaNota(n));
        li.append(g, document.createTextNode(rotulo));
        return li;
      });
      notas.replaceChildren(...lis);
      montarLink(`, nota de velocidade no celular ${nota.velocidade}`);
    } catch (err) {
      statusNota.remove();
    }
  });
}
