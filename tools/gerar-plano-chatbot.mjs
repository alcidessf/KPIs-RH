// Gera plano-chatbot-rh.pptx — apresentação estratégica do Canal RH WhatsApp
// node tools/gerar-plano-chatbot.mjs

import pptxgen from "pptxgenjs";

// ── paleta institucional ──────────────────────────────────────────────────
const C = {
  vd:  "2E4C46",   // verde escuro  (fundo dark)
  v:   "00694A",   // verde
  vc:  "5FB35A",   // verde claro
  az:  "1C6D96",   // azul
  tj:  "B54728",   // tijolo  (problema/alerta)
  am:  "877C00",   // amarelo acessível
  pp:  "F7F8F5",   // papel
  br:  "FFFFFF",
  ti:  "1E2A26",   // tinta principal
  t2:  "4A5751",
  t3:  "6E7873",
  fi:  "E3E7E0",   // fio / borda suave
  fif: "CBD2CA",   // fio forte
  // cards de status
  bom_bg: "E4F0EA", bom_tx: "00563C",
  atn_bg: "FAF4D0", atn_tx: "6E6400",
  cri_bg: "F7E7E1", cri_tx: "8E3720",
  neu_bg: "EDEFEA", neu_tx: "5A6560",
};

const F = "Calibri";
const W = 13.3;

// ── instância ──────────────────────────────────────────────────────────────
const prs = new pptxgen();
prs.layout = "LAYOUT_WIDE";

// ── helpers gerais ─────────────────────────────────────────────────────────
const sdark = () => { const s = prs.addSlide(); s.background = { color: C.vd }; return s; };
const slight = (bg = C.br) => { const s = prs.addSlide(); s.background = { color: bg }; return s; };

function h1(s, txt, y = 0.38) {
  s.addText(txt, { x: 0.5, y, w: 12.3, h: 0.75, fontSize: 28, bold: true,
    color: C.ti, fontFace: F, shrinkText: true });
}
function h1d(s, txt, y = 0.38) {
  s.addText(txt, { x: 0.5, y, w: 12.3, h: 0.75, fontSize: 28, bold: true,
    color: C.br, fontFace: F, shrinkText: true });
}
function sub(s, txt, y = 1.0) {
  s.addText(txt, { x: 0.5, y, w: 12.3, h: 0.35, fontSize: 12, color: C.t2, fontFace: F });
}
function subd(s, txt, y = 1.0) {
  s.addText(txt, { x: 0.5, y, w: 12.3, h: 0.35, fontSize: 12, color: C.vc, fontFace: F });
}
function line(s, y) {
  s.addShape(prs.ShapeType.line, { x: 0.5, y, w: 12.3, h: 0,
    line: { color: C.fi, width: 0.75 } });
}
function lined(s, y) {
  s.addShape(prs.ShapeType.line, { x: 0.5, y, w: 12.3, h: 0,
    line: { color: "3A5E56", width: 0.75 } });
}

// cartão métrica: número grande + label pequeno
function mcard(s, x, y, w, h, val, label, valCol = C.v, bg = C.br, border = C.fi) {
  s.addShape(prs.ShapeType.rect, { x, y, w, h,
    fill: { color: bg }, line: { color: border, width: 0.75 } });
  s.addText(val, { x: x + 0.14, y: y + 0.10, w: w - 0.28, h: h * 0.54,
    fontSize: 30, bold: true, color: valCol, fontFace: F,
    shrinkText: true, valign: "middle" });
  s.addText(label, { x: x + 0.14, y: y + h * 0.58, w: w - 0.28, h: h * 0.38,
    fontSize: 9.5, color: C.t3, fontFace: F, wrap: true });
}

// cartão de ação: ícone texto + título + corpo
function acard(s, x, y, w, h, icon, title, body, iconBg = C.v) {
  s.addShape(prs.ShapeType.rect, { x, y, w, h,
    fill: { color: C.pp }, line: { color: C.fi, width: 0.75 } });
  // circle icon
  s.addShape(prs.ShapeType.ellipse, { x: x + 0.18, y: y + 0.16, w: 0.42, h: 0.42,
    fill: { color: iconBg }, line: { color: iconBg } });
  s.addText(icon, { x: x + 0.18, y: y + 0.16, w: 0.42, h: 0.42,
    fontSize: 14, color: C.br, fontFace: F, align: "center", valign: "middle" });
  s.addText(title, { x: x + 0.7, y: y + 0.14, w: w - 0.84, h: 0.32,
    fontSize: 11, bold: true, color: C.ti, fontFace: F, shrinkText: true });
  s.addText(body, { x: x + 0.18, y: y + 0.60, w: w - 0.32, h: h - 0.72,
    fontSize: 10, color: C.t2, fontFace: F, wrap: true, valign: "top" });
}

// barra de progresso
function progressBar(s, x, y, w, h, pct, fillCol = C.v, bgCol = C.fi) {
  s.addShape(prs.ShapeType.rect, { x, y, w, h,
    fill: { color: bgCol }, line: { color: bgCol } });
  const fw = Math.max(0.01, w * pct);
  s.addShape(prs.ShapeType.rect, { x, y, w: fw, h,
    fill: { color: fillCol }, line: { color: fillCol } });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1 — CAPA
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = sdark();

  s.addText("CANAL RH · WHATSAPP", {
    x: 0.5, y: 1.6, w: 12.3, h: 0.35,
    fontSize: 11, bold: true, color: C.vc, fontFace: F, align: "center", charSpacing: 3,
  });

  s.addText("Plano de Evolução e\nIndicadores de Gestão", {
    x: 1.2, y: 2.1, w: 10.9, h: 1.9,
    fontSize: 42, bold: true, color: C.br, fontFace: F, align: "center",
    lineSpacingMultiple: 1.2,
  });

  s.addText("Diagnóstico · Estratégia de Crescimento · Roadmap de Produto", {
    x: 1.2, y: 4.1, w: 10.9, h: 0.4,
    fontSize: 13, color: C.vc, fontFace: F, align: "center",
  });

  lined(s, 4.65);

  // 3 stat tiles
  const stats = [
    { val: "989",   lbl: "Pessoas únicas\natendidas",         col: C.vc },
    { val: "1.055", lbl: "Interações efetivas\nabr–ago 2026", col: C.br },
    { val: "86",    lbl: "eNPS do canal\n(meta: > 50)",       col: "D6C500" },
  ];
  const cw = 3.5, ch = 1.2, cy = 5.0;
  const startX = (W - stats.length * cw - 2 * 0.35) / 2;
  stats.forEach((st, i) => {
    const cx = startX + i * (cw + 0.35);
    s.addShape(prs.ShapeType.rect, { x: cx, y: cy, w: cw, h: ch,
      fill: { color: "3A5E56" }, line: { color: "3A5E56" } });
    s.addText(st.val, { x: cx + 0.1, y: cy + 0.1, w: cw - 0.2, h: 0.62,
      fontSize: 34, bold: true, color: st.col, fontFace: F, align: "center" });
    s.addText(st.lbl, { x: cx + 0.1, y: cy + 0.72, w: cw - 0.2, h: 0.42,
      fontSize: 9.5, color: C.t3, fontFace: F, align: "center",
      lineSpacingMultiple: 1.2 });
  });

  s.addText("Agosto 2026  ·  RH Analytics  ·  Confidencial", {
    x: 0.5, y: 6.9, w: 12.3, h: 0.28,
    fontSize: 9, color: C.t2, fontFace: F, align: "center",
  });

  s.addNotes("Apresentação estratégica do Canal RH WhatsApp. Dados: abr–ago/2026. Base: 3.868 registros.");
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 2 — CENÁRIO ATUAL
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = slight();
  h1(s, "O produto funciona — a pergunta é: chega em quem precisa?");
  sub(s, "Dados de abril a agosto de 2026 · excluída diretoria RH (equipe interna em testes)");
  line(s, 1.18);

  // 4 metric cards left column
  const mcards = [
    { val: "989",    lbl: "pessoas únicas atendidas", col: C.az },
    { val: "1.055",  lbl: "interações efetivas no período", col: C.v },
    { val: "29%",    lbl: "taxa de engajamento em julho (acessos → interação)", col: C.am },
    { val: "eNPS 86",lbl: "satisfação do canal · 91% promotores", col: C.vc },
  ];
  const mcW = 2.95, mcH = 1.15;
  mcards.forEach((mc, i) => {
    const row = Math.floor(i / 2), col = i % 2;
    mcard(s, 0.5 + col * (mcW + 0.15), 1.35 + row * (mcH + 0.18),
      mcW, mcH, mc.val, mc.lbl, mc.col);
  });

  // right: top topics
  s.addText("Temas mais buscados", {
    x: 7.0, y: 1.35, w: 5.8, h: 0.35,
    fontSize: 12, bold: true, color: C.ti, fontFace: F,
  });

  const topics = [
    { tema: "Arquivo auxiliar (em reclassificação)", n: 199, pct: 18.9 },
    { tema: "Recrutamento interno",  n: 147, pct: 13.9 },
    { tema: "Plano de Saúde – Unimed", n: 116, pct: 11.0 },
    { tema: "Férias",                n:  77,  pct: 7.3 },
    { tema: "Folha de Pagamento",    n:  76,  pct: 7.2 },
    { tema: "Super Flex",            n:  47,  pct: 4.5 },
    { tema: "Recrutamento externo",  n:  34,  pct: 3.2 },
    { tema: "Plano Odontológico",    n:  28,  pct: 2.7 },
    { tema: "Plano Saúde – Bradesco",n:  25,  pct: 2.4 },
    { tema: "Previdência Privada",   n:  22,  pct: 2.1 },
  ];
  const maxN = topics[0].n;
  topics.forEach((t, i) => {
    const ty = 1.78 + i * 0.48;
    const barW = (t.n / maxN) * 4.6;
    s.addShape(prs.ShapeType.rect, { x: 7.0, y: ty + 0.08, w: 4.6, h: 0.22,
      fill: { color: C.fi }, line: { color: C.fi } });
    s.addShape(prs.ShapeType.rect, { x: 7.0, y: ty + 0.08, w: barW, h: 0.22,
      fill: { color: i < 3 ? C.v : C.vc }, line: { color: i < 3 ? C.v : C.vc } });
    s.addText(t.tema, { x: 7.0, y: ty - 0.01, w: 4.2, h: 0.22,
      fontSize: 8.5, color: C.t2, fontFace: F, shrinkText: true });
    s.addText(`${t.n}`, { x: 11.65, y: ty + 0.06, w: 0.65, h: 0.22,
      fontSize: 9, bold: true, color: C.t2, fontFace: F, align: "right" });
  });

  // diretoria note
  s.addText("Diretoria Florestal: 41%  ·  Industrial: 27%  ·  RH/Sustent.: 12%  ·  Outras: 20%", {
    x: 0.5, y: 6.8, w: 12.3, h: 0.28,
    fontSize: 9, color: C.t3, fontFace: F, italic: true,
  });

  s.addNotes("Dados excluem diretoria RH (150 registros). 989 pessoas únicas. eNPS calculado com 372 respostas de pesquisa de satisfação (PESQUISA_SATISFACAO_02).");
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 — O DESAFIO: META
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = slight();
  h1(s, "Meta 2026: 6.000 atendimentos — onde estamos e quanto falta");
  sub(s, "Referência: 1.000 atendimentos efetivos/mês · julho a dezembro de 2026");
  line(s, 1.18);

  // ── big goal progress (jul/26) ──
  s.addText("Julho — melhor mês até agora", {
    x: 0.5, y: 1.35, w: 6.0, h: 0.32,
    fontSize: 12, bold: true, color: C.ti, fontFace: F,
  });

  const barX = 0.5, barY = 1.75, barW = 6.0, barH = 0.52;
  progressBar(s, barX, barY, barW, barH, 0.772, C.v, C.fi);

  s.addText("772", { x: barX + 0.12, y: barY + 0.07, w: 1.2, h: 0.38,
    fontSize: 18, bold: true, color: C.br, fontFace: F });
  s.addText("de 1.000 (77,2%)", { x: barX + 1.35, y: barY + 0.1, w: 2.5, h: 0.32,
    fontSize: 13, color: C.br, fontFace: F });
  s.addText("+ 228 para a meta", { x: barX + 4.4, y: barY + 0.1, w: 2.0, h: 0.32,
    fontSize: 11, bold: true, color: C.tj, fontFace: F, align: "right" });

  // alavancas
  s.addText("Duas alavancas independentes para fechar o gap:", {
    x: 0.5, y: 2.48, w: 6.0, h: 0.28,
    fontSize: 11, color: C.t2, fontFace: F,
  });

  const alavancas = [
    { icon: "A", title: "Mais acessos", body: "Comunicação para diretorias sub-representadas\n(Comercial, Jurídico, TI somam 12 interações no período)", col: C.az },
    { icon: "B", title: "Mais conversão", body: "Engajamento de 30% → 40% nos atuais 2.700 acessos\n= 1.080 interações. A meta bate sem crescer o alcance.", col: C.v },
  ];
  alavancas.forEach((a, i) => {
    acard(s, 0.5 + i * 3.15, 2.88, 3.0, 1.5, a.icon, a.title, a.body, a.col);
  });

  // ── bar chart ──
  const chartData = [
    { name: "Interações efetivas", labels: ["fev", "mar", "abr/mai", "jun", "jul", "ago*"],
      values: [3, 3, 2, 53, 772, 47] },
  ];
  s.addChart(prs.ChartType.bar, chartData, {
    x: 6.8, y: 1.35, w: 6.0, h: 4.3,
    chartColors: [C.v],
    showValue: true,
    dataLabelFontSize: 9,
    dataLabelColor: C.ti,
    dataLabelPosition: "outEnd",
    catAxisLabelColor: C.t3,
    valAxisLabelColor: C.t3,
    valGridLine: { color: C.fi, size: 0.5 },
    catGridLine: { style: "none" },
    showLegend: false,
    showTitle: true,
    title: "Interações por período",
    titleFontSize: 11,
    titleColor: C.t2,
    valAxisMaxVal: 1100,
    barGapWidthPct: 55,
  });

  // meta annotation on chart
  s.addShape(prs.ShapeType.line, { x: 6.8, y: 2.2, w: 6.0, h: 0,
    line: { color: C.tj, width: 1.5, dashType: "dash" } });
  s.addText("Meta: 1.000 / mês", { x: 10.2, y: 2.0, w: 2.5, h: 0.28,
    fontSize: 9, bold: true, color: C.tj, fontFace: F, align: "right" });

  // projection note
  s.addShape(prs.ShapeType.rect, { x: 0.5, y: 4.55, w: 6.0, h: 0.78,
    fill: { color: C.bom_bg }, line: { color: C.fi, width: 0.5 } });
  s.addText("Agosto parcial (3 dias): 47 interações em 61 acessos = 77% de engajamento.\nSe mantiver esse ritmo, agosto pode ultrapassar a meta.", {
    x: 0.65, y: 4.62, w: 5.7, h: 0.65,
    fontSize: 10, color: C.bom_tx, fontFace: F, wrap: true,
  });

  s.addText("* agosto parcial (primeiros 3 dias)", {
    x: 0.5, y: 6.82, w: 5.0, h: 0.25,
    fontSize: 8.5, color: C.t3, fontFace: F, italic: true,
  });

  s.addNotes("Jul/26 sem RH: 2.699 acessos, 772 interações (28,6% engajamento). Ago/26 parcial: 61 acessos, 47 interações (77% engajamento). Meta acumulada jul-dez: 6.000.");
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4 — DIAGNÓSTICO: SEM INTERAÇÃO
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = slight();
  h1(s, "70% de quem acessa sai sem interagir — mas não é tudo abandono");
  sub(s, "Cruzamento de pessoas revela 3 grupos com causas e estratégias distintas");
  line(s, 1.18);

  // 3 group cards
  const groups = [
    {
      n: "368", label: "Pessoas que NUNCA\ninteragiram",
      desc: "Acessaram o bot pelo menos uma vez mas nunca chegaram a escolher um tema.\nGrupo prioritário de recuperação — são a maior alavanca de volume.",
      bg: C.cri_bg, tc: C.cri_tx, border: C.tj, icon: "!", iconBg: C.tj,
    },
    {
      n: "35", label: "Voltaram 2+ vezes\nsem interagir",
      desc: "Comportamento recorrente de abandono — sinal de frustração com o fluxo ou de tema ausente.\nPrecisa de diagnóstico de UX antes de campanha.",
      bg: C.atn_bg, tc: C.atn_tx, border: C.am, icon: "?", iconBg: C.am,
    },
    {
      n: "101", label: "Tiveram SI e\ntambém interagiram",
      desc: "Abandono casual — em uma visita saíram sem interagir, em outra interagiram normalmente.\nNão requer ação específica; acompanhar se o padrão muda.",
      bg: C.neu_bg, tc: C.neu_tx, border: C.fi, icon: "~", iconBg: C.t3,
    },
  ];

  const gw = 3.85, gh = 2.3;
  groups.forEach((g, i) => {
    const gx = 0.5 + i * (gw + 0.23);
    s.addShape(prs.ShapeType.rect, { x: gx, y: 1.35, w: gw, h: gh,
      fill: { color: g.bg }, line: { color: g.border, width: 1 } });
    s.addShape(prs.ShapeType.ellipse, { x: gx + 0.2, y: 1.52, w: 0.45, h: 0.45,
      fill: { color: g.iconBg }, line: { color: g.iconBg } });
    s.addText(g.icon, { x: gx + 0.2, y: 1.52, w: 0.45, h: 0.45,
      fontSize: 14, bold: true, color: C.br, fontFace: F, align: "center", valign: "middle" });
    s.addText(g.n, { x: gx + 0.75, y: 1.48, w: gw - 0.9, h: 0.55,
      fontSize: 30, bold: true, color: g.tc, fontFace: F });
    s.addText(g.label, { x: gx + 0.2, y: 2.06, w: gw - 0.35, h: 0.4,
      fontSize: 10.5, bold: true, color: g.tc, fontFace: F, wrap: true });
    s.addText(g.desc, { x: gx + 0.2, y: 2.52, w: gw - 0.35, h: 1.0,
      fontSize: 9.5, color: g.tc, fontFace: F, wrap: true });
  });

  // Hypothesis box
  s.addShape(prs.ShapeType.rect, { x: 0.5, y: 3.85, w: 12.3, h: 0.95,
    fill: { color: "EAF3F9" }, line: { color: C.az, width: 1 } });
  s.addText("⚠  Hipótese principal: 2.266 acessos sem identificação de colaborador", {
    x: 0.7, y: 3.92, w: 11.9, h: 0.3,
    fontSize: 11, bold: true, color: C.az, fontFace: F,
  });
  s.addText("A grande maioria dos \"Sem Interação\" não tem flag_cadastrado preenchida — o colaborador pode não ter conseguido se autenticar no bot. Se o fluxo exige CPF ou matrícula antes de mostrar o menu e a pessoa errou ou não encontrou, ela sai sem interagir. Esta é a correção de maior impacto e deve ser investigada antes de qualquer campanha de reengajamento.", {
    x: 0.7, y: 4.24, w: 11.9, h: 0.5,
    fontSize: 9.5, color: C.t2, fontFace: F, wrap: true,
  });

  // counterpoint
  s.addShape(prs.ShapeType.rect, { x: 0.5, y: 5.0, w: 12.3, h: 0.7,
    fill: { color: C.bom_bg }, line: { color: C.fi, width: 0.5 } });
  s.addText("Contraponto positivo: quem chega a interagir fica satisfeito. eNPS 86, 91% promotores. O produto entrega — o desafio é levar mais pessoas ao uso efetivo.", {
    x: 0.7, y: 5.1, w: 11.9, h: 0.55,
    fontSize: 10.5, color: C.bom_tx, fontFace: F, wrap: true, bold: false,
  });

  // turno note
  s.addText("Abandono por turno: Manhã 1.610 · Tarde 996 · Noite 152 · Madrugada 28 — o pico de abandono coincide com o início do expediente. Investigar se há evento de RH (holerite, comunicado) que gera acesso concentrado.", {
    x: 0.5, y: 5.88, w: 12.3, h: 0.65,
    fontSize: 9, color: C.t3, fontFace: F, italic: true, wrap: true,
  });

  s.addNotes("Pessoas: 989 únicas com interação, 469 com algum SI. 368 NUNCA interagiram. 2.266 registros SI sem flag_cadastrado — principal hipótese é falha de autenticação.");
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 5 — BENCHMARKING
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = slight();
  h1(s, "Onde estamos em relação ao mercado");
  sub(s, "Referência: chatbots de RH via WhatsApp, empresas com +500 colaboradores");
  line(s, 1.18);

  const rows = [
    { metrica: "Taxa de engajamento", m06: "20–35%", m12: "45–65%", nos: "29%",    status: "ok",  nota: "Dentro do esperado para mês 2–3 de operação real" },
    { metrica: "Resolução automática", m06: "70–85%", m12: "85–95%", nos: "99,1%", status: "bom", nota: "Excepcional — sugere base de conhecimento muito bem calibrada" },
    { metrica: "eNPS do canal",        m06: "35–55",  m12: "55–75",  nos: "86",    status: "bom", nota: "Top 10% de mercado — quem usa, aprova" },
    { metrica: "Taxa de resposta NPS", m06: "5–12%",  m12: "15–25%", nos: "9,6%",  status: "ok",  nota: "Dentro do esperado; cresce com a maturidade do canal" },
    { metrica: "Adoção (% workforce)", m06: "5–15%",  m12: "20–40%", nos: "~3%*",  status: "atn", nota: "Estimativa: headcount real não disponível. Principal alavanca de crescimento" },
    { metrica: "Meta de volume/mês",   m06: "—",      m12: "—",      nos: "77,2%", status: "atn", nota: "Julho: 772 de 1.000. Crescimento acelerado de jun→jul (+13×)" },
  ];

  // header
  const cols = [4.3, 1.8, 1.9, 1.8, 2.85];
  const xs   = [0.5, 4.85, 6.7, 8.65, 10.5];
  const labels = ["Métrica", "Mercado\n0–6 meses", "Mercado\n12+ meses", "Vocês\nhoje", "Avaliação"];
  labels.forEach((l, i) => {
    s.addShape(prs.ShapeType.rect, { x: xs[i], y: 1.32, w: cols[i], h: 0.52,
      fill: { color: C.vd }, line: { color: C.vd } });
    s.addText(l, { x: xs[i] + 0.08, y: 1.35, w: cols[i] - 0.1, h: 0.46,
      fontSize: 9.5, bold: true, color: C.br, fontFace: F, align: "center",
      valign: "middle", lineSpacingMultiple: 1.15 });
  });

  const statusColor = { bom: C.bom_tx, ok: C.v, atn: C.atn_tx };
  const statusBg    = { bom: C.bom_bg, ok: "F0F8F4", atn: C.atn_bg };
  const statusLabel = { bom: "✓  Destaque", ok: "→  Esperado", atn: "▲  Atenção" };

  rows.forEach((r, i) => {
    const ry = 1.84 + i * 0.72;
    const bg = i % 2 === 0 ? C.br : C.pp;
    // row bg
    s.addShape(prs.ShapeType.rect, { x: 0.5, y: ry, w: 12.3, h: 0.72,
      fill: { color: bg }, line: { color: C.fi, width: 0.5 } });

    // metrica
    s.addText(r.metrica, { x: xs[0] + 0.1, y: ry + 0.04, w: cols[0] - 0.15, h: 0.32,
      fontSize: 10.5, bold: true, color: C.ti, fontFace: F });
    s.addText(r.nota, { x: xs[0] + 0.1, y: ry + 0.36, w: cols[0] - 0.15, h: 0.3,
      fontSize: 8.5, color: C.t3, fontFace: F, italic: true, wrap: true });

    // mercado 0-6
    s.addText(r.m06, { x: xs[1] + 0.08, y: ry + 0.2, w: cols[1] - 0.1, h: 0.32,
      fontSize: 11, color: C.t2, fontFace: F, align: "center" });
    // mercado 12+
    s.addText(r.m12, { x: xs[2] + 0.08, y: ry + 0.2, w: cols[2] - 0.1, h: 0.32,
      fontSize: 11, color: C.t2, fontFace: F, align: "center" });
    // nos
    s.addText(r.nos, { x: xs[3] + 0.08, y: ry + 0.16, w: cols[3] - 0.1, h: 0.4,
      fontSize: 13, bold: true, color: statusColor[r.status], fontFace: F, align: "center" });
    // status chip
    const sl = statusLabel[r.status];
    s.addShape(prs.ShapeType.rect, { x: xs[4] + 0.15, y: ry + 0.2, w: 2.55, h: 0.3,
      fill: { color: statusBg[r.status] }, line: { color: statusBg[r.status] } });
    s.addText(sl, { x: xs[4] + 0.15, y: ry + 0.2, w: 2.55, h: 0.3,
      fontSize: 9.5, color: statusColor[r.status], fontFace: F, bold: true, align: "center", valign: "middle" });
  });

  s.addText("* Estimativa baseada em 989 usuários únicos — headcount total não informado.", {
    x: 0.5, y: 7.1, w: 8.0, h: 0.25,
    fontSize: 8.5, color: C.t3, fontFace: F, italic: true,
  });

  s.addNotes("Benchmarks de mercado: Gartner HR Chatbot Survey 2024, Sapient Insights Group HR Systems Survey, análise de casos similares em agro e industrial.");
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 6 — 5 PILARES DE KPIs
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = slight();
  h1(s, "5 pilares para medir o sucesso do produto");
  sub(s, "O painel de gestão organiza esses indicadores com filtro por empresa, diretoria, área e janela de tempo");
  line(s, 1.18);

  const pilares = [
    {
      n: "1", title: "Volume", col: C.az,
      kpis: ["Atendimentos no mês vs meta 1.000", "Atendimentos acumulados vs meta 6.000", "Projeção para fechamento do ano"],
      atual: "Jul: 772 atend. (77% da meta)",
    },
    {
      n: "2", title: "Engajamento", col: C.v,
      kpis: ["Taxa de engajamento: interações ÷ acessos", "Pessoas únicas atendidas", "Taxa de reuso (voltou ≥ 2×)"],
      atual: "Jul: 29% de engajamento",
    },
    {
      n: "3", title: "Efetividade da IA", col: C.vc,
      kpis: ["Taxa de resolução automática", "Taxa de transferência para humano", "Taxa 'Sem Interação' por turno"],
      atual: "99,1% resolução automática",
    },
    {
      n: "4", title: "Satisfação", col: C.am,
      kpis: ["eNPS do canal", "% Promotores / Neutros / Detratores", "Taxa de resposta da pesquisa"],
      atual: "eNPS 86 · 91% promotores",
    },
    {
      n: "5", title: "Cobertura", col: C.tj,
      kpis: ["% diretorias com uso efetivo", "Top temas por volume e crescimento", "Penetração por área e cargo"],
      atual: "10 de 11 diretorias ativas",
    },
  ];

  // 3 top + 2 bottom — heights fill the slide (7.5")
  const positions = [
    { x: 0.5,  y: 1.38, w: 3.95, h: 2.6 },
    { x: 4.6,  y: 1.38, w: 3.95, h: 2.6 },
    { x: 8.7,  y: 1.38, w: 4.1,  h: 2.6 },
    { x: 1.55, y: 4.13, w: 4.55, h: 2.65 },
    { x: 6.25, y: 4.13, w: 4.55, h: 2.65 },
  ];

  pilares.forEach((p, i) => {
    const pos = positions[i];
    s.addShape(prs.ShapeType.rect, { x: pos.x, y: pos.y, w: pos.w, h: pos.h,
      fill: { color: C.pp }, line: { color: C.fi, width: 1 } });
    // top accent bar
    s.addShape(prs.ShapeType.rect, { x: pos.x, y: pos.y, w: pos.w, h: 0.06,
      fill: { color: p.col }, line: { color: p.col } });
    // number
    s.addShape(prs.ShapeType.ellipse, { x: pos.x + 0.17, y: pos.y + 0.13, w: 0.4, h: 0.4,
      fill: { color: p.col }, line: { color: p.col } });
    s.addText(p.n, { x: pos.x + 0.17, y: pos.y + 0.13, w: 0.4, h: 0.4,
      fontSize: 13, bold: true, color: C.br, fontFace: F, align: "center", valign: "middle" });
    // title
    s.addText(p.title, { x: pos.x + 0.66, y: pos.y + 0.16, w: pos.w - 0.78, h: 0.35,
      fontSize: 13, bold: true, color: C.ti, fontFace: F });
    // kpis
    p.kpis.forEach((k, j) => {
      s.addText("· " + k, { x: pos.x + 0.2, y: pos.y + 0.64 + j * 0.34, w: pos.w - 0.35, h: 0.32,
        fontSize: 9.5, color: C.t2, fontFace: F, wrap: true });
    });
    // atual chip
    s.addShape(prs.ShapeType.rect, {
      x: pos.x + 0.17, y: pos.y + pos.h - 0.45, w: pos.w - 0.3, h: 0.3,
      fill: { color: C.bom_bg }, line: { color: C.fi, width: 0.5 } });
    s.addText(p.atual, { x: pos.x + 0.22, y: pos.y + pos.h - 0.44, w: pos.w - 0.36, h: 0.28,
      fontSize: 8.5, bold: true, color: C.bom_tx, fontFace: F });
  });

  s.addNotes("Os 5 pilares serão o esqueleto do painel HTML em construção. Cada pilar tem entre 2-4 KPIs monitorados na mesma janela de tempo (semana/mês/ano).");
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 7 — PLANO DE ATAQUE H1: ESTA SEMANA
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = slight(C.pp);
  h1(s, "Horizonte 1 — Esta semana (ação imediata, sem mexer no produto)");
  sub(s, "Impacto estimado: +70 a 110 interações em 2 semanas · Custo: comunicação interna");
  line(s, 1.18);

  const acoes = [
    {
      n: "01", icon: "↩", title: "Campanha de reengajamento direto", col: C.tj,
      quem: "RH Analytics + Comunicação",
      quando: "Semana 1",
      como: "Identificar as 368 pessoas que acessaram mas nunca interagiram. Enviar mensagem via WhatsApp: \"Você visitou nosso canal de RH. Quer saber o que consigo responder?\" + lista dos 5 temas mais buscados.\n\nConversão esperada: 20–30% → 70 a 110 novas interações.",
      impacto: "ALTO",
    },
    {
      n: "02", icon: "★", title: "Líderes florestais como multiplicadores", col: C.v,
      quem: "GHRP + Liderança Florestal",
      quando: "Semana 1–2",
      como: "59 líderes florestais já usam o canal — são o melhor canal de divulgação para suas equipes (388 colaboradores em Silvicultura, Colheita, etc.).\n\nFormato: pauta de 2 min na próxima reunião de equipe + mensagem modelo para o líder replicar no grupo do WhatsApp da área.",
      impacto: "ALTO",
    },
    {
      n: "03", icon: "🔍", title: "Investigar o gargalo de autenticação", col: C.az,
      quem: "TI + Plataforma do chatbot",
      quando: "Semana 1–2",
      como: "2.266 dos registros \"Sem Interação\" não têm colaborador identificado. Verificar:\n· O bot exige CPF/matrícula antes de mostrar o menu?\n· Qual % falha na autenticação?\n· É possível oferecer menu inicial sem autenticação?\n\nSe confirmado: correção de autenticação > qualquer campanha.",
      impacto: "CRÍTICO",
    },
  ];

  const aw = 3.9, ah = 5.4;
  const cardY = 1.38;
  acoes.forEach((a, i) => {
    const ax = 0.5 + i * (aw + 0.25);
    s.addShape(prs.ShapeType.rect, { x: ax, y: cardY, w: aw, h: ah,
      fill: { color: C.br }, line: { color: a.col, width: 1.5 } });
    // top color bar
    s.addShape(prs.ShapeType.rect, { x: ax, y: cardY, w: aw, h: 0.08,
      fill: { color: a.col }, line: { color: a.col } });
    // number badge
    s.addShape(prs.ShapeType.ellipse, { x: ax + 0.2, y: cardY + 0.15, w: 0.45, h: 0.45,
      fill: { color: a.col }, line: { color: a.col } });
    s.addText(a.n, { x: ax + 0.2, y: cardY + 0.15, w: 0.45, h: 0.45,
      fontSize: 12, bold: true, color: C.br, fontFace: F, align: "center", valign: "middle" });
    s.addText(a.title, { x: ax + 0.74, y: cardY + 0.18, w: aw - 0.88, h: 0.42,
      fontSize: 11, bold: true, color: C.ti, fontFace: F, wrap: true, shrinkText: true });
    // meta info
    s.addText(`👤 ${a.quem}`, { x: ax + 0.2, y: cardY + 0.70, w: aw - 0.3, h: 0.24,
      fontSize: 8.5, color: a.col, fontFace: F, bold: true });
    s.addText(`📅 ${a.quando}`, { x: ax + 0.2, y: cardY + 0.94, w: aw - 0.3, h: 0.24,
      fontSize: 8.5, color: C.t3, fontFace: F });
    // divider
    s.addShape(prs.ShapeType.line, { x: ax + 0.2, y: cardY + 1.24, w: aw - 0.35, h: 0,
      line: { color: C.fi, width: 0.5 } });
    // como — height constrained to stay inside card, above impacto chip
    const chipY = cardY + ah - 0.48;
    const comoH = chipY - (cardY + 1.34) - 0.12;
    s.addText(a.como, { x: ax + 0.2, y: cardY + 1.34, w: aw - 0.3, h: comoH,
      fontSize: 9.5, color: C.t2, fontFace: F, wrap: true, valign: "top" });
    // impacto chip
    const impBg = a.impacto === "CRÍTICO" ? C.cri_bg : C.bom_bg;
    const impTx = a.impacto === "CRÍTICO" ? C.cri_tx : C.bom_tx;
    s.addShape(prs.ShapeType.rect, { x: ax + 0.2, y: chipY, w: 1.5, h: 0.3,
      fill: { color: impBg }, line: { color: impBg } });
    s.addText(a.impacto, { x: ax + 0.2, y: chipY, w: 1.5, h: 0.3,
      fontSize: 8.5, bold: true, color: impTx, fontFace: F, align: "center", valign: "middle" });
  });

  s.addNotes("Ação 03 (autenticação) é a de maior impacto potencial. Se 2.266 registros sem identificação forem falhas de autenticação, corrigir isso multiplica o volume sem campanha.");
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 8 — PLANO H2 + H3: CURTO E MÉDIO PRAZO
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = slight(C.pp);
  h1(s, "Horizontes 2 e 3 — Produto e escala (próximos 2 meses)");
  line(s, 1.08);

  const h2 = [
    {
      n: "04", title: "Auditoria de UX no fluxo", col: C.az, h: "H2 · Semanas 2–4",
      body: "Mapear o ponto exato de abandono: é na tela inicial? Após escolher o tema? Após a resposta?\nDefinir onde o bot perde a pessoa antes de qualquer redesenho.",
    },
    {
      n: "05", title: "Expansão da base de temas", col: C.az, h: "H2 · Semanas 3–5",
      body: "Identificar o que as pessoas buscam que não está no menu. Survey com as 368 do grupo-alvo + análise de mensagens livres.\nPrioridade: temas com >20 buscas sem resposta.",
    },
    {
      n: "06", title: "Ativação por diretoria", col: C.az, h: "H2 · Semana 2",
      body: "Comercial, Jurídico e TI somam 12 interações no período todo. Campanha específica com o BP de RH de cada área, usando dados reais de acesso.",
    },
  ];

  const h3 = [
    {
      n: "07", title: "Notificações proativas", col: C.v, h: "H3 · Mês 2",
      body: "Bot ativo, não só reativo. Evento → mensagem.\nEx: \"Sua férias foi aprovada — quer os detalhes?\"\nCada notificação relevante gera uma interação que hoje não existe.",
    },
    {
      n: "08", title: "Calendário de RH como gatilho", col: C.v, h: "H3 · Mês 2–3",
      body: "Recadastramento de benefícios, holerite, abertura de vagas internas — cada evento é um pico de demanda previsível.\nAgenda RH → pauta de notificações do bot.",
    },
    {
      n: "09", title: "Dashboard self-service para líderes", col: C.v, h: "H3 · Mês 3",
      body: "Líderes de área com acesso ao painel para acompanhar o uso da equipe, os temas mais buscados e o NPS da área.\nAumenta o engajamento da liderança com o canal.",
    },
  ];

  const rowH = 2.5, cardW = 4.05;
  [[h2, 1.22, C.az], [h3, 3.88, C.v]].forEach(([group, startY, col]) => {
    const label = col === C.az ? "Horizonte 2 — Curto prazo (4 semanas)" : "Horizonte 3 — Médio prazo (2 meses)";
    s.addText(label, { x: 0.5, y: startY - 0.0, w: 5.0, h: 0.3,
      fontSize: 10, bold: true, color: col, fontFace: F });

    group.forEach((a, i) => {
      const ax = 0.5 + i * (cardW + 0.22);
      const ay = startY + 0.32;
      s.addShape(prs.ShapeType.rect, { x: ax, y: ay, w: cardW, h: rowH,
        fill: { color: C.br }, line: { color: C.fi, width: 0.75 } });
      s.addShape(prs.ShapeType.rect, { x: ax, y: ay, w: 0.06, h: rowH,
        fill: { color: col }, line: { color: col } });
      s.addShape(prs.ShapeType.ellipse, { x: ax + 0.2, y: ay + 0.12, w: 0.38, h: 0.38,
        fill: { color: col }, line: { color: col } });
      s.addText(a.n, { x: ax + 0.2, y: ay + 0.12, w: 0.38, h: 0.38,
        fontSize: 11, bold: true, color: C.br, fontFace: F, align: "center", valign: "middle" });
      s.addText(a.title, { x: ax + 0.66, y: ay + 0.13, w: cardW - 0.78, h: 0.35,
        fontSize: 10.5, bold: true, color: C.ti, fontFace: F, shrinkText: true });
      s.addText(a.h, { x: ax + 0.66, y: ay + 0.48, w: cardW - 0.78, h: 0.25,
        fontSize: 8.5, color: col, fontFace: F, bold: true });
      s.addText(a.body, { x: ax + 0.2, y: ay + 0.80, w: cardW - 0.32, h: rowH - 0.92,
        fontSize: 9.5, color: C.t2, fontFace: F, wrap: true, valign: "top" });
    });
  });

  s.addNotes("H2 foca no produto e na expansão controlada. H3 é a virada de ativo para proativo — quando o bot passa a gerar demanda, não apenas atendê-la.");
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 9 — ROADMAP DA PLATAFORMA
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = sdark();
  h1d(s, "Roadmap da plataforma — o caminho para a consolidação");
  subd(s, "3 fases · da estabilização à excelência operacional");
  lined(s, 1.18);

  // timeline spine
  const ty = 3.5;
  s.addShape(prs.ShapeType.line, { x: 0.8, y: ty, w: 11.7, h: 0,
    line: { color: "3A5E56", width: 2 } });

  const fases = [
    {
      label: "Fase 1", periodo: "Ago – Set 2026",
      titulo: "Estabilização e\nReengajamento",
      col: C.vc,
      itens: [
        "Correção do fluxo de autenticação",
        "Campanha para as 368 pessoas inativas",
        "Ativação de diretorias sub-rep.",
        "KPIs e painel de gestão operacional",
        "Meta: atingir 1.000/mês em setembro",
      ],
    },
    {
      label: "Fase 2", periodo: "Out – Nov 2026",
      titulo: "Expansão e\nProatividade",
      col: C.az,
      itens: [
        "Expansão da base de temas (>40 temas)",
        "Notificações proativas integradas ao RH",
        "Programa de embaixadores (líderes)",
        "Dashboard self-service por área",
        "Meta: 1.200 atend./mês consistente",
      ],
    },
    {
      label: "Fase 3", periodo: "Dez 2026+",
      titulo: "Inteligência e\nEscala",
      col: "D6C500",
      itens: [
        "IA conversacional (perguntas abertas)",
        "Integração com sistemas RH (SAP/TOTVS)",
        "Histórico de atendimento por colaborador",
        "Análise preditiva de demanda",
        "Meta: 40%+ de adoção da força de trabalho",
      ],
    },
  ];

  const fw = 3.9;
  fases.forEach((f, i) => {
    const fx = 0.6 + i * (fw + 0.3);
    // vertical connector
    s.addShape(prs.ShapeType.line, { x: fx + fw/2, y: ty - 1.5, w: 0, h: 1.5,
      line: { color: f.col, width: 1.5 } });
    // dot on timeline
    s.addShape(prs.ShapeType.ellipse, { x: fx + fw/2 - 0.12, y: ty - 0.12, w: 0.24, h: 0.24,
      fill: { color: f.col }, line: { color: f.col } });
    // period label
    s.addText(f.periodo, { x: fx, y: ty + 0.2, w: fw, h: 0.3,
      fontSize: 10, color: f.col, fontFace: F, bold: true, align: "center" });

    // card above timeline
    s.addShape(prs.ShapeType.rect, { x: fx, y: 1.35, w: fw, h: 2.1,
      fill: { color: "283E39" }, line: { color: f.col, width: 1.5 } });
    s.addText(f.label, { x: fx + 0.15, y: 1.42, w: fw - 0.25, h: 0.28,
      fontSize: 9, bold: true, color: f.col, fontFace: F });
    s.addText(f.titulo, { x: fx + 0.15, y: 1.67, w: fw - 0.25, h: 0.52,
      fontSize: 13, bold: true, color: C.br, fontFace: F, lineSpacingMultiple: 1.15 });

    // items below timeline
    s.addShape(prs.ShapeType.rect, { x: fx, y: ty + 0.6, w: fw, h: 2.6,
      fill: { color: "283E39" }, line: { color: f.col, width: 1 } });
    f.itens.forEach((it, j) => {
      s.addText("·  " + it, { x: fx + 0.15, y: ty + 0.7 + j * 0.44, w: fw - 0.25, h: 0.4,
        fontSize: 9.5, color: C.br, fontFace: F, wrap: true });
    });
  });

  s.addText("O roadmap pressupõe resolução da questão de autenticação na Fase 1. Fases 2 e 3 dependem de capacidade da plataforma (fornecedor) e dos sistemas RH da empresa.", {
    x: 0.5, y: 6.88, w: 12.3, h: 0.4,
    fontSize: 8.5, color: C.t3, fontFace: F, italic: true, wrap: true,
  });

  s.addNotes("Roadmap indicativo. Fase 1 é executável internamente. Fases 2 e 3 dependem de capacidade do fornecedor da plataforma e de integrações com sistemas corporativos.");
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 10 — PRÓXIMOS PASSOS
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = slight();
  h1(s, "Próximos passos — quem faz o quê e quando");
  line(s, 1.08);

  const steps = [
    {
      n: "1", prazo: "Esta semana",
      acao: "Investigar autenticação",
      descricao: "Verificar com o fornecedor da plataforma: qual % dos acessos falha na autenticação? É possível mostrar menu básico antes de autenticar?",
      quem: "TI + Plataforma",
      impacto: "CRÍTICO", ibg: C.cri_bg, itx: C.cri_tx,
    },
    {
      n: "2", prazo: "Semana 1",
      acao: "Campanha para 368 inativas",
      descricao: "Extrair lista de pessoas com acesso mas sem interação. Preparar mensagem de reengajamento com os 5 temas mais usados.",
      quem: "RH Analytics + Comunicação",
      impacto: "ALTO", ibg: C.bom_bg, itx: C.bom_tx,
    },
    {
      n: "3", prazo: "Semana 1–2",
      acao: "Briefing de líderes florestais",
      descricao: "Pauta de 2 min nas reuniões de equipe + mensagem modelo para o líder replicar. 59 líderes × equipes de ~7 pessoas = alcance imediato.",
      quem: "GHRP Florestal",
      impacto: "ALTO", ibg: C.bom_bg, itx: C.bom_tx,
    },
    {
      n: "4", prazo: "Semana 2–3",
      acao: "Ativar Comercial, Jurídico, TI",
      descricao: "Campanha específica com o BP de cada área. Mostrar os dados: 12 interações no período vs potencial de 50–80/mês.",
      quem: "BPs de RH",
      impacto: "MÉDIO", ibg: C.atn_bg, itx: C.atn_tx,
    },
    {
      n: "5", prazo: "Semana 3–4",
      acao: "Painel de KPIs operacional",
      descricao: "Publicar painel HTML com os 5 pilares. Acompanhamento semanal pelas responsáveis de área. Meta visível: 1.000/mês.",
      quem: "RH Analytics",
      impacto: "MÉDIO", ibg: C.atn_bg, itx: C.atn_tx,
    },
  ];

  const sh = 1.02;
  steps.forEach((st, i) => {
    const sy = 1.2 + i * (sh + 0.1);
    const bg = i % 2 === 0 ? C.br : C.pp;
    s.addShape(prs.ShapeType.rect, { x: 0.5, y: sy, w: 12.3, h: sh,
      fill: { color: bg }, line: { color: C.fi, width: 0.75 } });

    // number
    s.addShape(prs.ShapeType.ellipse, { x: 0.62, y: sy + 0.28, w: 0.45, h: 0.45,
      fill: { color: C.v }, line: { color: C.v } });
    s.addText(st.n, { x: 0.62, y: sy + 0.28, w: 0.45, h: 0.45,
      fontSize: 13, bold: true, color: C.br, fontFace: F, align: "center", valign: "middle" });

    // prazo
    s.addShape(prs.ShapeType.rect, { x: 1.22, y: sy + 0.1, w: 1.65, h: 0.28,
      fill: { color: C.bom_bg }, line: { color: C.fi, width: 0.5 } });
    s.addText(st.prazo, { x: 1.22, y: sy + 0.1, w: 1.65, h: 0.28,
      fontSize: 8.5, color: C.bom_tx, fontFace: F, bold: true, align: "center", valign: "middle" });

    // ação
    s.addText(st.acao, { x: 1.22, y: sy + 0.42, w: 2.8, h: 0.35,
      fontSize: 12, bold: true, color: C.ti, fontFace: F, shrinkText: true });

    // descricao
    s.addText(st.descricao, { x: 4.3, y: sy + 0.1, w: 5.7, h: sh - 0.15,
      fontSize: 9.5, color: C.t2, fontFace: F, wrap: true, valign: "middle" });

    // quem
    s.addText("👤 " + st.quem, { x: 10.15, y: sy + 0.12, w: 2.4, h: 0.3,
      fontSize: 9, bold: true, color: C.t2, fontFace: F });

    // impacto
    s.addShape(prs.ShapeType.rect, { x: 10.15, y: sy + 0.48, w: 2.4, h: 0.28,
      fill: { color: st.ibg }, line: { color: st.ibg } });
    s.addText(st.impacto, { x: 10.15, y: sy + 0.48, w: 2.4, h: 0.28,
      fontSize: 9, bold: true, color: st.itx, fontFace: F, align: "center", valign: "middle" });
  });

  s.addText("Meta: atingir 1.000 atendimentos em setembro de 2026 e 6.000 acumulados até dezembro.", {
    x: 0.5, y: 6.92, w: 12.3, h: 0.3,
    fontSize: 10, bold: true, color: C.v, fontFace: F, align: "center",
  });

  s.addNotes("5 ações concretas com dono e prazo. A ação 1 (autenticação) pode multiplicar o volume sem custo de campanha caso a hipótese se confirme.");
}

// ─────────────────────────────────────────────────────────────────────────────
await prs.writeFile({ fileName: "plano-chatbot-rh.pptx" });
console.log("ok — plano-chatbot-rh.pptx gerado (10 slides)");
