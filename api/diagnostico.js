// ===== Diagnóstico gratuito de sites =====
// Recebe o endereço de um site e devolve uma análise simples, em português.
//
//   /api/diagnostico?url=exemplo.com.br            -> verificações básicas (rápido, ~2s)
//   /api/diagnostico?url=exemplo.com.br&etapa=nota -> nota de velocidade do Google (~15-30s)
//
// A nota usa a API do PageSpeed Insights. Ela só funciona com a chave guardada
// na variável de ambiente PSI_KEY (configurada no painel da Vercel, nunca no código).
// O endereço digitado é usado só para a análise e não é guardado.

const dns = require("node:dns").promises;
const net = require("node:net");

const TEMPO_LIMITE = 8000; // ms para baixar o site
const TAMANHO_MAXIMO = 2 * 1024 * 1024; // lê no máximo 2 MB do HTML

// Bloqueia endereços internos (localhost, rede privada etc.) para o servidor
// não ser usado para acessar o que não deve.
function ipPrivado(ip) {
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) return ipPrivado(v.slice(7));
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 || a === 127 || a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function normalizarUrl(bruto) {
  let texto = String(bruto || "").trim();
  if (!texto) return null;
  if (!/^https?:\/\//i.test(texto)) texto = "https://" + texto;
  let u;
  try { u = new URL(texto); } catch { return null; }
  if (!["http:", "https:"].includes(u.protocol)) return null;
  if (u.username || u.password) return null;
  if (u.port && !["80", "443"].includes(u.port)) return null;
  if (!u.hostname.includes(".") || net.isIP(u.hostname)) return null;
  return u;
}

async function enderecoSeguro(u) {
  try {
    const ips = await dns.lookup(u.hostname, { all: true });
    return ips.length > 0 && ips.every((r) => !ipPrivado(r.address));
  } catch {
    return false;
  }
}

// Baixa o site seguindo até 4 redirecionamentos, conferindo cada destino.
async function baixar(inicial) {
  let atual = inicial;
  const inicio = Date.now();
  for (let i = 0; i < 5; i++) {
    if (!(await enderecoSeguro(atual))) throw new Error("bloqueado");
    const resp = await fetch(atual, {
      redirect: "manual",
      signal: AbortSignal.timeout(TEMPO_LIMITE),
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; DiagnosticoGustavoSimoes/1.0; +https://gustavosimoes.com.br)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if ([301, 302, 303, 307, 308].includes(resp.status) && resp.headers.get("location")) {
      const proximo = new URL(resp.headers.get("location"), atual);
      if (!["http:", "https:"].includes(proximo.protocol)) throw new Error("bloqueado");
      atual = proximo;
      continue;
    }
    const tempo = Date.now() - inicio;
    // lê o corpo com limite de tamanho
    const leitor = resp.body.getReader();
    const pedacos = [];
    let total = 0;
    while (total < TAMANHO_MAXIMO) {
      const { done, value } = await leitor.read();
      if (done) break;
      pedacos.push(value);
      total += value.length;
    }
    leitor.cancel().catch(() => {});
    const html = Buffer.concat(pedacos).toString("utf8");
    return { resp, html, urlFinal: atual, tempo, bytes: total };
  }
  throw new Error("muitos redirecionamentos");
}

const tem = (re, html) => re.test(html);
const atributo = (re, html) => {
  const m = html.match(re);
  return m ? m[1].trim() : "";
};

function analisar({ resp, html, urlFinal, tempo }) {
  const itens = [];
  const add = (id, ok, titulo, explicacao) => itens.push({ id, ok, titulo, explicacao });

  add("abre", resp.ok,
    resp.ok ? "O site abre normalmente" : `O site respondeu com erro (${resp.status})`,
    resp.ok ? "O endereço está no ar e respondendo." : "Quem tenta entrar pode ver uma página de erro em vez do seu site.");

  const https = urlFinal.protocol === "https:";
  add("https", https,
    https ? "Tem cadeado de segurança (HTTPS)" : "Não tem cadeado de segurança (HTTPS)",
    https ? "O navegador mostra o site como seguro." : "O navegador mostra \"Não seguro\" ao lado do endereço, o que afasta clientes.");

  const rapido = tempo < 1500;
  add("resposta", rapido,
    rapido ? `O servidor responde rápido (${(tempo / 1000).toFixed(1).replace(".", ",")} s)` : `O servidor demora para responder (${(tempo / 1000).toFixed(1).replace(".", ",")} s)`,
    rapido ? "A primeira resposta chega rápido." : "Antes de mostrar qualquer coisa, o site já fica esperando o servidor.");

  const celular = tem(/<meta[^>]+name=["']viewport["']/i, html);
  add("celular", celular,
    celular ? "Preparado para celular" : "Não está preparado para celular",
    celular ? "O site se ajusta à tela do celular." : "No celular o site aparece miniatura, e o visitante precisa dar zoom para ler.");

  const bloqueado = tem(/<meta[^>]+name=["']robots["'][^>]+noindex/i, html) || /noindex/i.test(resp.headers.get("x-robots-tag") || "");
  add("google", !bloqueado,
    bloqueado ? "Está bloqueado para o Google" : "Liberado para aparecer no Google",
    bloqueado ? "O site pede ao Google para não mostrá-lo nas buscas." : "O Google pode mostrar o site nas pesquisas.");

  const titulo = atributo(/<title[^>]*>([^<]*)<\/title>/i, html);
  add("titulo", titulo.length >= 10,
    titulo.length >= 10 ? "Tem título para o Google" : "Sem título para o Google",
    titulo.length >= 10 ? `Aparece na busca como: "${titulo.slice(0, 70)}${titulo.length > 70 ? "…" : ""}"` : "O título é o texto azul que aparece na pesquisa do Google. Sem ele, o site perde cliques.");

  const descricao = atributo(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i, html) ||
    atributo(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i, html);
  add("descricao", descricao.length >= 50,
    descricao.length >= 50 ? "Tem descrição para o Google" : "Sem descrição para o Google",
    descricao.length >= 50 ? "O texto que aparece abaixo do título na pesquisa foi escrito por você." : "O Google escolhe um trecho qualquer do site para mostrar na pesquisa.");

  const compartilhar = tem(/<meta[^>]+property=["']og:image["']/i, html);
  add("whatsapp_previa", compartilhar,
    compartilhar ? "Aparece com imagem ao compartilhar" : "Aparece sem imagem ao compartilhar",
    compartilhar ? "Quando alguém manda o link no WhatsApp, aparece uma prévia com imagem." : "Quando alguém manda o link no WhatsApp ou Instagram, aparece só o endereço, sem imagem.");

  // link direto do WhatsApp, ou um botão/link que fala em WhatsApp (muitos sites montam o link por script)
  const zap = tem(/wa\.me\/|api\.whatsapp\.com|whatsapp:\/\/|web\.whatsapp\.com/i, html) ||
    tem(/<(a|button)\b[^>]*whats/i, html) ||
    tem(/<(a|button)\b[^>]*>(?:(?!<\/(?:a|button)>)[\s\S]){0,400}?whats/i, html);
  add("whatsapp", zap,
    zap ? "Tem botão de WhatsApp" : "Sem botão de WhatsApp",
    zap ? "O visitante consegue chamar no WhatsApp com um toque." : "O visitante precisa copiar o número para falar com você, e muitos desistem.");

  const analytics = tem(/googletagmanager\.com|google-analytics\.com|gtag\(/i, html);
  add("analytics", analytics,
    analytics ? "Mede as visitas (Google Analytics)" : "Não mede as visitas",
    analytics ? "Dá para saber quantas pessoas entram e de onde vêm." : "Você não sabe quantas pessoas visitam o site nem de onde elas vêm.");

  const dados = tem(/application\/ld\+json/i, html);
  add("dados", dados,
    dados ? "Informa ao Google os dados do negócio" : "Não informa ao Google os dados do negócio",
    dados ? "Endereço, telefone e horário estão organizados para o Google." : "Faltam os dados organizados (endereço, telefone, horário) que ajudam a aparecer nas buscas locais.");

  const acertos = itens.filter((i) => i.ok).length;
  return { url: urlFinal.href, acertos, total: itens.length, itens };
}

async function notaGoogle(url) {
  const chave = process.env.PSI_KEY;
  if (!chave) return { indisponivel: true };
  const api = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  api.searchParams.set("url", url);
  api.searchParams.set("strategy", "mobile");
  for (const c of ["performance", "accessibility", "seo"]) api.searchParams.append("category", c);
  api.searchParams.set("locale", "pt-BR");
  api.searchParams.set("key", chave);
  const resp = await fetch(api, { signal: AbortSignal.timeout(55000) });
  if (!resp.ok) return { indisponivel: true };
  const dados = await resp.json();
  const cat = dados.lighthouseResult && dados.lighthouseResult.categories;
  if (!cat) return { indisponivel: true };
  const nota = (c) => (c && c.score != null ? Math.round(c.score * 100) : null);
  const lcp = dados.lighthouseResult.audits["largest-contentful-paint"];
  return {
    velocidade: nota(cat.performance),
    acessibilidade: nota(cat.accessibility),
    seo: nota(cat.seo),
    carregamento: lcp ? lcp.displayValue : null,
  };
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ erro: "Use GET." });

  const alvo = normalizarUrl(req.query.url);
  if (!alvo) return res.status(400).json({ erro: "Digite um endereço de site válido, por exemplo: suaempresa.com.br" });

  try {
    if (req.query.etapa === "nota") {
      if (!(await enderecoSeguro(alvo))) throw new Error("bloqueado");
      return res.status(200).json(await notaGoogle(alvo.href));
    }
    const baixado = await baixar(alvo);
    return res.status(200).json(analisar(baixado));
  } catch (e) {
    const msg = e && e.name === "TimeoutError"
      ? "O site demorou demais para responder. Confira o endereço e tente de novo."
      : "Não consegui acessar esse site. Confira se o endereço está certo.";
    return res.status(200).json({ erro: msg });
  }
};
