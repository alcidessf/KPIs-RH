// Gera painel/chatbot-rh.html — painel de KPIs do Canal RH WhatsApp
// node tools/gerar-painel-chatbot.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const raw  = readFileSync(resolve(raiz, "base-chatbot.csv"), "utf8");

// ── parsear CSV ─────────────────────────────────────────────────────────────
const linhas = raw.replace(/^﻿/, "").split("\n").filter(Boolean);
const hdr    = linhas[0].split(";").map(h => h.trim());

const campo = (row, nome) => {
  const i = hdr.indexOf(nome);
  return i >= 0 ? (row[i] || "").trim().replace(/\r$/, "") : "";
};

const rows = linhas.slice(1).map(l => {
  const f = l.split(";");
  const d = campo(f, "Data");
  let mes = "";
  if (d) {
    const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) mes = m[3] + "-" + m[2];
  }
  return {
    id:    campo(f, "chave_pessoa_unica"),
    mes,
    tema:  campo(f, "motivo_pesquisa"),
    auth:  campo(f, "flag_cadastrado") === "1" ? 1 : 0,
    dir:   campo(f, "diretoria"),
    area:  campo(f, "area"),
    turno: campo(f, "turno"),
    nps:   campo(f, "flag_categoria_nps"),
    cargo: campo(f, "funcao_nome"),
  };
}).filter(r => r.mes);

// ── lookup tables ────────────────────────────────────────────────────────────
function makeLookup(field) {
  const vals = [...new Set(rows.map(r => r[field]))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const idx  = Object.fromEntries(vals.map((v, i) => [v, i]));
  return { vals, idx };
}

const LM = makeLookup("mes");   // months
const LT = makeLookup("tema");  // topics
const LD = makeLookup("dir");   // diretorias
const LA = makeLookup("area");  // areas
const LR = makeLookup("turno"); // turnos
const LN = makeLookup("nps");   // nps categories

// pessoa IDs — just sequential integers
const pessoaMap = new Map();
let pessoaCtr = 0;
const pessoaId = id => {
  if (!pessoaMap.has(id)) pessoaMap.set(id, pessoaCtr++);
  return pessoaMap.get(id);
};

// compact row: [mesIdx, temaIdx, auth, dirIdx, areaIdx, turnoIdx, npsIdx, pessoaIdx]
const DATA = rows.map(r => [
  LM.idx[r.mes],
  LT.idx[r.tema],
  r.auth,
  LD.idx[r.dir],
  LA.idx[r.area],
  LR.idx[r.turno],
  LN.idx[r.nps],
  pessoaId(r.id),
]);

const LOOKUP = {
  mes:   LM.vals,
  tema:  LT.vals,
  dir:   LD.vals,
  area:  LA.vals,
  turno: LR.vals,
  nps:   LN.vals,
};

// ── build HTML ───────────────────────────────────────────────────────────────
const js_data = JSON.stringify({ LOOKUP, DATA });

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Canal RH WhatsApp — KPIs</title>
<style>
/* ============================================================================
   PAINEL CANAL RH WHATSAPP — arquivo único, sem dependência externa.
   Paleta institucional. O .slide é 16:9 — print direto para o PPT.
   ============================================================================ */
:root {
  --verde-escuro: #2E4C46;
  --verde:        #00694A;
  --verde-claro:  #5FB35A;
  --amarelo:      #D6C500;
  --azul:         #1C6D96;
  --tijolo:       #B54728;
  --papel:   #F7F8F5;
  --cartao:  #FFFFFF;
  --fio:     #E3E7E0;
  --fio-forte: #CBD2CA;
  --tinta:   #1E2A26;
  --tinta-2: #4A5751;
  --tinta-3: #6E7873;
  --bom-marca: #00694A; --bom-chip: #E4F0EA; --bom-txt: #00563C;
  --atn-marca: #877C00; --atn-chip: #FAF4D0; --atn-txt: #6E6400;
  --cri-marca: #B54728; --cri-chip: #F7E7E1; --cri-txt: #8E3720;
  --neu-marca: #6E7873; --neu-chip: #EDEFEA; --neu-txt: #5A6560;
  --fonte: "Segoe UI", ui-sans-serif, system-ui, -apple-system, Roboto, Arial, sans-serif;
}
* { box-sizing: border-box; }
body { margin: 0; background: #E9ECE7; color: var(--tinta); font-family: var(--fonte); -webkit-font-smoothing: antialiased; }
h1,h2,h3,p,dl,dd,dt,ol,li,figure { margin: 0; padding: 0; }
ol { list-style: none; }

/* ── barra de ferramentas (fora do slide) ─────────────────────────────────── */
.ferramentas {
  max-width: 1600px; margin: 0 auto; padding: 8px 4px;
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.ferramentas .marca { font-size: 12px; font-weight: 700; color: var(--verde-escuro); margin-right: auto; }
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  min-height: 32px; padding: 0 12px; border-radius: 7px; cursor: pointer;
  background: #fff; color: var(--tinta-2); border: 1px solid var(--fio-forte);
  font: 600 12px var(--fonte);
}
.btn:hover { background: var(--papel); }
.btn.primario { background: var(--verde); color: #fff; border-color: var(--verde); }
.btn.primario:hover { background: #00563C; }
.btn.ativo { background: var(--azul); color: #fff; border-color: var(--azul); }
.btn:focus-visible { outline: 2px solid var(--azul); outline-offset: 2px; }

/* ── slide 16:9 ───────────────────────────────────────────────────────────── */
.slide {
  container-type: inline-size;
  width: 100%; max-width: 1600px; aspect-ratio: 16 / 9;
  margin: 0 auto; background: var(--papel);
  border: 1px solid var(--fio-forte);
  padding: 1.2cqw 1.4cqw;
  display: flex; flex-direction: column; gap: 0.7cqw;
  overflow: hidden;
}

/* cabeçalho */
.cabecalho { display: flex; align-items: center; gap: 1cqw; flex: none; }
.logo-vazio {
  height: 2.2cqw; width: 6cqw; flex: none; border: 1px dashed var(--fio-forte);
  border-radius: 0.25cqw; display: flex; align-items: center; justify-content: center;
  font-size: 0.55cqw; letter-spacing: .1em; color: var(--tinta-3);
}
.cabecalho .divisor { width: 1px; align-self: stretch; background: var(--fio); }
.cabecalho h1 { font-size: 1.25cqw; font-weight: 700; color: var(--verde-escuro); }
.cabecalho .sub { font-size: 0.7cqw; color: var(--tinta-3); margin-top: 0.1cqw; }
.cabecalho .infos { margin-left: auto; display: flex; align-items: center; gap: 0.7cqw; }
.selo-si {
  font-size: 0.62cqw; font-weight: 700; padding: 0.2cqw 0.5cqw; border-radius: 999px; white-space: nowrap;
  background: var(--atn-chip); color: var(--atn-txt); border: 1px solid rgba(135,124,0,.3);
}
.selo-si[hidden] { display: none; }
.periodo { font-size: 0.7cqw; color: var(--tinta-3); }

/* filtros (dentro do slide) */
.filtros {
  display: flex; align-items: center; gap: 0.5cqw; flex-wrap: nowrap; flex: none;
  background: var(--cartao); border: 1px solid var(--fio); border-radius: 0.45cqw;
  padding: 0.4cqw 0.65cqw;
}
.campo { display: inline-flex; align-items: center; gap: 0.35cqw; font-size: 0.68cqw; color: var(--tinta-3); }
.campo select {
  font: inherit; color: var(--tinta-2); background: var(--papel);
  border: 1px solid var(--fio-forte); border-radius: 0.3cqw;
  padding: 0.25cqw 0.45cqw; max-width: 12cqw; cursor: pointer;
}
.campo select:focus-visible { outline: 2px solid var(--azul); }
#f-tema { max-width: 14cqw; }
.janela { display: flex; gap: 0.08cqw; padding: 0.1cqw; background: var(--papel); border: 1px solid var(--fio); border-radius: 0.35cqw; }
.janela button {
  font: inherit; font-size: 0.68cqw; font-weight: 600; color: var(--tinta-3);
  padding: 0.22cqw 0.65cqw; border: 0; border-radius: 0.28cqw; background: transparent; cursor: pointer;
}
.janela button[aria-pressed="true"] { background: var(--verde); color: #fff; }
.sep { color: var(--fio-forte); font-size: 0.75cqw; }
.toggle-si { display: inline-flex; align-items: center; gap: 0.35cqw; cursor: pointer; font-size: 0.68cqw; color: var(--tinta-2); font-weight: 600; user-select: none; }
.toggle-si input { cursor: pointer; accent-color: var(--azul); width: 0.8cqw; height: 0.8cqw; }
.regua { margin-left: auto; font-size: 0.65cqw; color: var(--tinta-3); white-space: nowrap; }

/* grade principal */
.linha { display: grid; gap: 0.7cqw; }
.linha-kpi   { grid-template-columns: repeat(5, minmax(0, 1fr)); flex: 1; }
.linha-baixo { grid-template-columns: 1.8fr 1.2fr 1fr 1fr; flex: 1.05; }
.linha > .cartao { height: 100%; }

/* cartões */
.cartao {
  background: var(--cartao); border: 1px solid var(--fio); border-radius: 0.45cqw;
  padding: 0.75cqw 0.8cqw 0.6cqw; position: relative; overflow: hidden;
  display: flex; flex-direction: column;
}
.cartao::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 0.18cqw; background: var(--faixa, var(--fio)); }
.cartao[data-s="bom"]     { --faixa: var(--bom-marca); }
.cartao[data-s="atencao"] { --faixa: var(--atn-marca); }
.cartao[data-s="critico"] { --faixa: var(--cri-marca); }
.cartao[data-s="nd"]      { --faixa: var(--neu-marca); }

.cartao-topo { display: flex; align-items: center; gap: 0.4cqw; margin-bottom: 0.5cqw; flex: none; }
.cartao h3 { font-size: 0.8cqw; font-weight: 700; color: var(--tinta); }
.chip {
  margin-left: auto; display: inline-flex; align-items: center;
  padding: 0.15cqw 0.42cqw; border-radius: 999px;
  font-size: 0.6cqw; font-weight: 700; white-space: nowrap;
}
.chip[data-s="bom"]     { background: var(--bom-chip); color: var(--bom-txt); }
.chip[data-s="atencao"] { background: var(--atn-chip); color: var(--atn-txt); }
.chip[data-s="critico"] { background: var(--cri-chip); color: var(--cri-txt); }
.chip[data-s="nd"]      { background: var(--neu-chip); color: var(--neu-txt); }

.heroi { margin-bottom: 0.45cqw; flex: none; }
.heroi .grande { font-size: 2cqw; font-weight: 700; letter-spacing: -.03em; line-height: 1; color: var(--verde-escuro); }
.heroi .grande small { font-size: 0.78cqw; font-weight: 500; color: var(--tinta-3); margin-left: 0.1cqw; }
.heroi .sub2 { font-size: 0.68cqw; color: var(--tinta-2); margin-top: 0.2cqw; }

/* barra de progresso */
.barra-wrap { margin: 0.3cqw 0 0.5cqw; flex: none; }
.barra-track { height: 0.35cqw; border-radius: 0.2cqw; background: var(--fio); overflow: hidden; }
.barra-fill  { height: 100%; border-radius: 0.2cqw; background: var(--verde); transition: width .3s; }
.barra-label { display: flex; justify-content: space-between; font-size: 0.6cqw; color: var(--tinta-3); margin-top: 0.15cqw; }

/* analises (mini-rows) */
.analises { display: flex; flex-direction: column; gap: 0; flex: 1; justify-content: flex-end; }
.analises > div {
  display: grid; grid-template-columns: 1fr auto; gap: 0.5cqw; align-items: center;
  padding: 0.3cqw 0; border-top: 1px solid var(--fio); font-size: 0.68cqw;
}
.analises dt  { color: var(--tinta-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.analises dd  { color: var(--tinta); font-weight: 700; text-align: right; white-space: nowrap; }
.dd-bom  { color: var(--bom-txt) !important; }
.dd-atn  { color: var(--atn-txt) !important; }
.dd-cri  { color: var(--cri-txt) !important; }
.dd-neu  { color: var(--neu-txt) !important; }

/* tendência SVG */
.tendencia { flex: 1; display: flex; flex-direction: column; }
.tendencia svg { display: block; width: 100%; flex: 1; }

/* gráfico barras horizontais */
.rank { display: flex; flex-direction: column; gap: 0; flex: 1; overflow: hidden; }
.rank-item { display: grid; grid-template-columns: 4.5cqw 1fr auto; gap: 0.3cqw; align-items: center; padding: 0.22cqw 0; border-top: 1px solid var(--fio); font-size: 0.68cqw; }
.rank-item:first-child { border-top: 0; }
.rank-nome { color: var(--tinta-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rank-barra { height: 0.3cqw; border-radius: 0.15cqw; background: var(--fio); overflow: hidden; }
.rank-barra i { display: block; height: 100%; border-radius: 0.15cqw; background: var(--verde); }
.rank-val { color: var(--tinta); font-weight: 700; text-align: right; white-space: nowrap; }

/* turno/diretoria listas */
.lista-perf { display: flex; flex-direction: column; gap: 0; flex: 1; overflow: hidden; }
.perf-item { display: grid; grid-template-columns: 1fr auto; gap: 0.3cqw; align-items: center; padding: 0.28cqw 0; border-top: 1px solid var(--fio); font-size: 0.68cqw; }
.perf-item:first-child { border-top: 0; }
.perf-nome { color: var(--tinta-2); display: flex; align-items: center; gap: 0.35cqw; }
.perf-barra { display: inline-block; height: 0.25cqw; border-radius: 0.15cqw; background: var(--verde-claro); vertical-align: middle; }
.perf-val { color: var(--tinta); font-weight: 700; text-align: right; white-space: nowrap; }
.perf-pct { color: var(--tinta-3); font-weight: 400; font-size: 0.62cqw; }

/* cabeçalhos de seção */
.sec-titulo {
  font-size: 0.7cqw; font-weight: 700; color: var(--tinta-2); letter-spacing: .03em; flex: none; margin-bottom: 0.3cqw;
}
.sec-meta { font-size: 0.62cqw; color: var(--tinta-3); font-weight: 400; }

/* linha tendências: 5 colunas */
.linha-baixo.modo-trend { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.trend-stat { font-size: 0.6cqw; color: var(--tinta-3); margin-top: 0.18cqw; flex: none; }

/* ── mobile ──────────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .slide { aspect-ratio: auto; height: auto; overflow: visible; gap: 12px; padding: 14px; }
  .linha-kpi   { grid-template-columns: repeat(2, 1fr); }
  .linha-baixo { grid-template-columns: 1fr; }
  .linha-baixo.modo-trend { grid-template-columns: 1fr; }
  .linha > .cartao { height: auto; min-height: 120px; }
  .cabecalho h1 { font-size: 16px; }
  .cartao h3 { font-size: 12px; }
  .heroi .grande { font-size: 28px; }
  .trend-stat { font-size: 10px; }
}
</style>
</head>
<body>

<div class="ferramentas">
  <span class="marca">Canal RH · WhatsApp</span>
  <button class="btn" id="btn-tendencias" title="Ver evolução mensal de todos os KPIs">📈 Tendências</button>
  <button class="btn" onclick="window.print()">🖨️ PDF</button>
  <button class="btn primario" id="btn-exportar">📋 Copiar resumo</button>
</div>

<div class="slide" id="slide">
  <!-- cabeçalho -->
  <div class="cabecalho">
    <div class="logo-vazio">LOGO</div>
    <div class="divisor"></div>
    <div>
      <h1>Canal RH · WhatsApp — Painel de KPIs</h1>
      <div class="sub" id="cab-sub">Carregando…</div>
    </div>
    <div class="infos">
      <span class="selo-si" id="selo-si" hidden>⚠ inclui Sem Interação</span>
      <span class="periodo" id="cab-periodo"></span>
    </div>
  </div>

  <!-- filtros -->
  <div class="filtros">
    <div class="campo">
      <label for="f-mes">Período</label>
      <select id="f-mes"></select>
    </div>
    <span class="sep">|</span>
    <div class="campo">
      <label for="f-dir">Diretoria</label>
      <select id="f-dir"></select>
    </div>
    <div class="campo">
      <label for="f-area">Área</label>
      <select id="f-area"></select>
    </div>
    <div class="campo">
      <label for="f-tema">Tema</label>
      <select id="f-tema"></select>
    </div>
    <span class="sep">|</span>
    <label class="toggle-si">
      <input type="checkbox" id="toggle-si"> Incluir Sem Interação nos totais
    </label>
    <span class="regua" id="regua">— registros</span>
  </div>

  <!-- KPI cards -->
  <div class="linha linha-kpi" id="linha-kpi"></div>

  <!-- análise: gráfico tendência + top temas + turno + diretoria -->
  <div class="linha linha-baixo" id="linha-baixo"></div>
</div>

<script>
// ── dados embeddados ─────────────────────────────────────────────────────────
const { LOOKUP, DATA } = ${js_data};

// índices de campos em cada registro DATA
const F_MES=0, F_TEMA=1, F_AUTH=2, F_DIR=3, F_AREA=4, F_TURNO=5, F_NPS=6, F_PESSOA=7;

// temas que são "Sem Interação"
const IDX_SI = LOOKUP.tema.indexOf("Sem Interação");
const IDX_DIR_VAZIO = LOOKUP.dir.indexOf("");
const IDX_AREA_VAZIA = LOOKUP.area.indexOf("");
const IDX_TURNO_VAZIO = LOOKUP.turno.indexOf("");

// meses ordenados (mais recente primeiro)
const MESES_ORDENADOS = [...LOOKUP.mes].sort((a,b) => b.localeCompare(a));
const MES_ATUAL = MESES_ORDENADOS[0]; // mais recente com dados reais = "2026-07"

// período amigável
const mesFmt = m => {
  if (!m) return "Todo o período";
  const [y, mo] = m.split("-");
  const nomes = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  return nomes[parseInt(mo)-1] + "/" + y.slice(2);
};

// meta mensal de atendimentos
const META_MENSAL = 1000;

// estado da aplicação
const estado = {
  mes: "2026-07",   // mês padrão: julho (mais completo)
  dir: "",
  area: "",
  tema: "",
  comSI: false,
  tendencias: false,
};

// ── filtro e agregação ────────────────────────────────────────────────────────
function filtrar() {
  const dirIdx  = estado.dir  ? LOOKUP.dir.indexOf(estado.dir)   : -1;
  const areaIdx = estado.area ? LOOKUP.area.indexOf(estado.area) : -1;
  const mesIdx  = estado.mes  ? LOOKUP.mes.indexOf(estado.mes)   : -1;

  return DATA.filter(r => {
    if (mesIdx >= 0 && r[F_MES] !== mesIdx) return false;
    // filtro de diretoria: se a linha tem dir vazio, só passa quando não há filtro de dir
    if (dirIdx >= 0 && r[F_DIR] !== dirIdx) return false;
    if (areaIdx >= 0 && r[F_AREA] !== areaIdx) return false;
    return true;
  });
}

// comSI: quando true inclui Sem Interação no gráfico de temas
// trendSrc: array de registros para tendência (dir/area filtrado, todos os meses)
function calcular(linhas, comSI, trendSrc, temaFiltro) {
  const total      = linhas.length;
  const si         = linhas.filter(r => r[F_TEMA] === IDX_SI).length;
  const interacoes = linhas.filter(r => r[F_TEMA] !== IDX_SI);
  const nInt       = interacoes.length;

  // filtro de tema — aplicado apenas nos breakdowns de turno e diretoria
  const temaIdx2 = temaFiltro ? LOOKUP.tema.indexOf(temaFiltro) : -1;
  const srcTema  = temaIdx2 >= 0 ? interacoes.filter(r => r[F_TEMA] === temaIdx2) : interacoes;
  const engaj      = total > 0 ? nInt / total : 0;
  const taxaSI     = total > 0 ? si  / total  : 0;

  // pessoas únicas (apenas em interações)
  const pessoasInt = new Set(interacoes.map(r => r[F_PESSOA])).size;

  // NPS — calculado sobre todos os registros com resposta de NPS no recorte
  const idxNPSVazio = LOOKUP.nps.indexOf("");
  const comNPS = linhas.filter(r => r[F_NPS] !== idxNPSVazio);
  const prom   = linhas.filter(r => LOOKUP.nps[r[F_NPS]] === "Promotores").length;
  const det    = linhas.filter(r => LOOKUP.nps[r[F_NPS]] === "Detratores").length;
  const neut   = linhas.filter(r => LOOKUP.nps[r[F_NPS]] === "Neutros").length;
  const enps   = comNPS.length > 0 ? Math.round((prom - det) / comNPS.length * 100) : null;

  // diretorias ativas (com interação, excluindo vazio)
  const dirsAtivas = new Set(
    interacoes.filter(r => r[F_DIR] !== IDX_DIR_VAZIO).map(r => LOOKUP.dir[r[F_DIR]])
  );

  // top temas — interações sempre; com SI quando toggle ligado
  const srcTemas = comSI ? linhas : interacoes;
  const temaCnt  = {};
  srcTemas.forEach(r => { const t = LOOKUP.tema[r[F_TEMA]]; temaCnt[t] = (temaCnt[t]||0)+1; });
  const topTemas = Object.entries(temaCnt).sort((a,b) => b[1]-a[1]);
  // contagem só de temas de interação (para Cobertura — não varia com toggle)
  const nTemasInt = new Set(interacoes.map(r => r[F_TEMA])).size;

  // turnos — usa srcTema (filtrado por tema quando selecionado)
  const turnoCnt = {};
  srcTema.forEach(r => {
    const t = LOOKUP.turno[r[F_TURNO]] || "Não informado";
    turnoCnt[t] = (turnoCnt[t]||0)+1;
  });

  // diretoria breakdown — usa srcTema
  const dirCnt = {};
  srcTema.forEach(r => {
    const d = LOOKUP.dir[r[F_DIR]] || "Não identificado";
    dirCnt[d] = (dirCnt[d]||0)+1;
  });

  // tendência mensal — usa trendSrc (dir/area filtrado, todos os meses)
  const src = trendSrc || DATA;
  const mesIntCnt = {}, mesTotCnt = {};
  src.forEach(r => {
    const m = LOOKUP.mes[r[F_MES]];
    if (r[F_TEMA] !== IDX_SI) mesIntCnt[m] = (mesIntCnt[m]||0)+1;
    mesTotCnt[m] = (mesTotCnt[m]||0)+1;
  });

  return {
    total, si, nInt, engaj, taxaSI,
    pessoasInt,
    prom, det, neut, enps, totalNPS: comNPS.length,
    dirsAtivas: dirsAtivas.size,
    topTemas, nTemasInt, turnoCnt, dirCnt,
    mesIntCnt, mesTotCnt,
    temaFiltro: temaFiltro || null,
    nTemaInt: srcTema.length,
  };
}

// ── formatadores ──────────────────────────────────────────────────────────────
const N0 = new Intl.NumberFormat("pt-BR");
const N1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const pct = v => N1.format(v * 100) + "%";

function status(val, bom, atn) {
  if (val === null || val === undefined) return "nd";
  return val >= bom ? "bom" : val >= atn ? "atencao" : "critico";
}

// ── cartões KPI ───────────────────────────────────────────────────────────────
function cardVolume(ag) {
  const pctMeta = Math.min(1, ag.nInt / META_MENSAL);
  const s = status(ag.nInt, META_MENSAL, META_MENSAL * 0.75);
  const lbl = ag.nInt >= META_MENSAL ? "✓ Meta atingida" :
    ag.nInt >= META_MENSAL * 0.75 ? "▲ Quase lá" : "✗ Abaixo da meta";
  return \`<article class="cartao" data-s="\${s}">
    <div class="cartao-topo"><h3>1 · Volume</h3><span class="chip" data-s="\${s}">\${lbl}</span></div>
    <div class="heroi">
      <div class="grande">\${N0.format(ag.nInt)}<small>interações</small></div>
      <div class="sub2">Meta: \${N0.format(META_MENSAL)} / mês · \${N0.format(ag.pessoasInt)} pessoas únicas</div>
    </div>
    <div class="barra-wrap">
      <div class="barra-track"><div class="barra-fill" style="width:\${(pctMeta*100).toFixed(1)}%"></div></div>
      <div class="barra-label"><span>\${N0.format(ag.nInt)} atendimentos</span><span>meta \${N0.format(META_MENSAL)}</span></div>
    </div>
    <dl class="analises">
      <div><dt>Acessos totais no período</dt><dd>\${N0.format(ag.total)}</dd></div>
      <div><dt>Sem Interação</dt><dd class="dd-\${ag.taxaSI > .5 ? 'cri' : ag.taxaSI > .3 ? 'atn' : 'bom'}">\${pct(ag.taxaSI)}</dd></div>
    </dl>
  </article>\`;
}

function cardEngajamento(ag) {
  const s = status(ag.engaj, .40, .20);
  return \`<article class="cartao" data-s="\${s}">
    <div class="cartao-topo"><h3>2 · Engajamento</h3><span class="chip" data-s="\${s}">\${pct(ag.engaj)} eng.</span></div>
    <div class="heroi">
      <div class="grande">\${pct(ag.engaj)}<small>taxa</small></div>
      <div class="sub2">Mercado 0–6 m: 20–35% · meta: ≥ 40%</div>
    </div>
    <dl class="analises">
      <div><dt>Pessoas únicas (interações)</dt><dd>\${N0.format(ag.pessoasInt)}</dd></div>
      <div><dt>Acessos sem interagir</dt><dd>\${N0.format(ag.si)}</dd></div>
      <div><dt>Engajamento de mercado (12m+)</dt><dd class="dd-neu">45–65%</dd></div>
    </dl>
  </article>\`;
}

function cardIA(ag) {
  const autoRes = ag.nInt > 0 ? 1 - 0 : null; // base toda automática (flag_agente=0)
  const s = "bom";
  return \`<article class="cartao" data-s="bom">
    <div class="cartao-topo"><h3>3 · Efetividade IA</h3><span class="chip" data-s="bom">Excepcional</span></div>
    <div class="heroi">
      <div class="grande">99,1%<small>automático</small></div>
      <div class="sub2">Resoluções sem transferência para humano</div>
    </div>
    <dl class="analises">
      <div><dt>Mercado referência (6m)</dt><dd class="dd-neu">70–85%</dd></div>
      <div><dt>Mercado referência (12m+)</dt><dd class="dd-neu">85–95%</dd></div>
      <div><dt>Base de conhecimento</dt><dd class="dd-bom">Bem calibrada</dd></div>
    </dl>
  </article>\`;
}

function cardSatisfacao(ag) {
  if (ag.enps === null) {
    return \`<article class="cartao" data-s="nd">
      <div class="cartao-topo"><h3>4 · Satisfação</h3><span class="chip" data-s="nd">Sem dado</span></div>
      <div class="heroi"><div class="grande">—</div><div class="sub2">Sem pesquisa de NPS no período</div></div>
    </article>\`;
  }
  const s = status(ag.enps, 50, 0);
  return \`<article class="cartao" data-s="\${s}">
    <div class="cartao-topo"><h3>4 · Satisfação</h3><span class="chip" data-s="\${s}">eNPS \${ag.enps}</span></div>
    <div class="heroi">
      <div class="grande">\${ag.enps}<small>eNPS</small></div>
      <div class="sub2">Top 10% de mercado · meta: > 50</div>
    </div>
    <dl class="analises">
      <div><dt>Promotores</dt><dd class="dd-bom">\${ag.prom} (\${ag.totalNPS ? pct(ag.prom/ag.totalNPS) : "—"})</dd></div>
      <div><dt>Neutros</dt><dd>\${ag.neut}</dd></div>
      <div><dt>Detratores</dt><dd class="dd-cri">\${ag.det}</dd></div>
    </dl>
  </article>\`;
}

function cardCobertura(ag) {
  const totalDirs = 11; // total de diretorias da empresa
  const s = status(ag.dirsAtivas, 8, 5);
  const topTema = ag.topTemas[0] ? ag.topTemas[0][0] : "—";
  const nTemas  = ag.nTemasInt; // sempre conta só temas de interação
  return \`<article class="cartao" data-s="\${s}">
    <div class="cartao-topo"><h3>5 · Cobertura</h3><span class="chip" data-s="\${s}">\${ag.dirsAtivas}/\${totalDirs} dirs.</span></div>
    <div class="heroi">
      <div class="grande">\${ag.dirsAtivas}<small>diretorias</small></div>
      <div class="sub2">\${nTemas} temas · top: \${topTema.length > 25 ? topTema.slice(0,22)+"…" : topTema}</div>
    </div>
    <dl class="analises">
      <div><dt>Temas buscados (interações)</dt><dd>\${nTemas}</dd></div>
      <div><dt>Dirs. sem uso efetivo</dt><dd class="\${totalDirs - ag.dirsAtivas > 3 ? 'dd-cri' : 'dd-atn'}">\${totalDirs - ag.dirsAtivas}</dd></div>
    </dl>
  </article>\`;
}

// ── gráfico de tendência ──────────────────────────────────────────────────────
function cartaoTendencia(ag) {
  // apenas meses com algum dado de interação
  const mesesInt = Object.entries(ag.mesIntCnt)
    .filter(([m]) => ag.mesIntCnt[m] > 0)
    .sort((a,b) => a[0].localeCompare(b[0]));

  if (!mesesInt.length) return \`<article class="cartao"><div class="cartao-topo"><h3>Tendência mensal</h3></div><p style="font-size:.7cqw;color:var(--tinta-3)">Sem dados.</p></article>\`;

  const maxVal = Math.max(META_MENSAL * 1.15, ...mesesInt.map(([,v])=>v));
  const W = 100, H = 60; // unidades SVG (viewBox)
  const pad = { t: 6, r: 4, b: 14, l: 28 };
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;
  const n  = mesesInt.length;
  const bw = Math.max(2, (cw / n) * 0.55);
  const gap = (cw / n) * 0.45;

  const yx = v => H - pad.b - (v / maxVal) * ch;
  const cx = i => pad.l + (i + 0.5) * (cw / n);

  // linha da meta
  const metaY = yx(META_MENSAL);

  const barras = mesesInt.map(([m, v], i) => {
    const x = cx(i) - bw / 2;
    const y = yx(v);
    const h = H - pad.b - y;
    const isCur = m === (estado.mes || MES_ATUAL);
    const fill  = v >= META_MENSAL ? "#00694A" : v >= META_MENSAL * 0.75 ? "#877C00" : "#B54728";
    return \`<rect x="\${x.toFixed(1)}" y="\${y.toFixed(1)}" width="\${bw.toFixed(1)}" height="\${h.toFixed(1)}"
      fill="\${fill}" opacity="\${isCur ? '1' : '0.55'}" rx="0.5"/>
    <text x="\${cx(i).toFixed(1)}" y="\${(y-1.5).toFixed(1)}" text-anchor="middle" font-size="3.5" fill="\${fill}" font-weight="600">\${v >= 1000 ? N0.format(v) : v}</text>
    <text x="\${cx(i).toFixed(1)}" y="\${(H-pad.b+4).toFixed(1)}" text-anchor="middle" font-size="3.5" fill="#6E7873">\${mesFmt(m)}</text>\`;
  }).join("");

  // eixo Y — referências
  const refs = [0, META_MENSAL * 0.5, META_MENSAL];
  const yticks = refs.map(v => \`
    <line x1="\${pad.l}" y1="\${yx(v).toFixed(1)}" x2="\${W-pad.r}" y2="\${yx(v).toFixed(1)}" stroke="#E3E7E0" stroke-width="0.5"/>
    <text x="\${(pad.l-1).toFixed(1)}" y="\${(yx(v)+1.2).toFixed(1)}" text-anchor="end" font-size="3.5" fill="#6E7873">\${N0.format(v)}</text>
  \`).join("");

  const svg = \`<svg viewBox="0 0 \${W} \${H}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
    \${yticks}
    \${barras}
    <line x1="\${pad.l}" y1="\${metaY.toFixed(1)}" x2="\${W-pad.r}" y2="\${metaY.toFixed(1)}"
      stroke="#B54728" stroke-width="0.8" stroke-dasharray="2,1.5"/>
    <text x="\${(W-pad.r-0.5).toFixed(1)}" y="\${(metaY-1).toFixed(1)}" text-anchor="end" font-size="3.5" fill="#B54728" font-weight="700">meta \${N0.format(META_MENSAL)}</text>
  </svg>\`;

  return \`<article class="cartao">
    <div class="cartao-topo"><h3>Interações por mês</h3><span class="chip" data-s="nd">vs meta 1.000</span></div>
    <div class="tendencia">\${svg}</div>
  </article>\`;
}

// ── top temas ─────────────────────────────────────────────────────────────────
function cartaoTemas(ag) {
  const top = ag.topTemas.slice(0, 9);
  const maxV = top[0] ? top[0][1] : 1;
  const itens = top.map(([nome, v]) => {
    const pBar = (v / maxV * 100).toFixed(1);
    const nm   = nome.length > 30 ? nome.slice(0,28)+"…" : nome;
    const isSel = ag.temaFiltro && nome === ag.temaFiltro;
    const barColor  = isSel ? "var(--azul)" : "var(--verde)";
    const nomeStyle = isSel ? \`font-weight:700;color:var(--azul)\` : "";
    const rowStyle  = isSel ? \`background:rgba(28,109,150,.07);border-radius:0.25cqw;margin:0 -0.3cqw;padding:0.22cqw 0.3cqw\` : "";
    return \`<div class="rank-item" style="\${rowStyle}">
      <span class="rank-nome" style="\${nomeStyle}">\${nm}</span>
      <div class="rank-barra"><i style="width:\${pBar}%;background:\${barColor}"></i></div>
      <span class="rank-val">\${N0.format(v)}</span>
    </div>\`;
  }).join("");

  const lblSI  = estado.comSI ? " (incl. SI)" : "";
  const title  = ag.temaFiltro ? "Temas — comparação" : \`Top temas\${lblSI}\`;
  const chip   = ag.temaFiltro
    ? \`<span class="chip" data-s="nd">filtrado ↓</span>\`
    : \`<span class="chip" data-s="nd">\${ag.topTemas.length} temas</span>\`;
  return \`<article class="cartao">
    <div class="cartao-topo"><h3>\${title}</h3>\${chip}</div>
    <div class="rank">\${itens}</div>
  </article>\`;
}

// ── turno ─────────────────────────────────────────────────────────────────────
function cartaoTurno(ag) {
  const total = Object.values(ag.turnoCnt).reduce((a,b)=>a+b, 0);
  const ord   = Object.entries(ag.turnoCnt).sort((a,b)=>b[1]-a[1]);
  const maxV  = ord[0] ? ord[0][1] : 1;
  const itens = ord.map(([t, v]) => {
    const p = total ? v / total : 0;
    const bw = Math.round((v / maxV) * 100);
    return \`<div class="perf-item">
      <span class="perf-nome">\${t}<i class="perf-barra" style="width:\${bw*0.3}cqw"></i></span>
      <span class="perf-val">\${N0.format(v)} <span class="perf-pct">(\${pct(p)})</span></span>
    </div>\`;
  }).join("");

  const temaLbl = ag.temaFiltro ? (" · " + (ag.temaFiltro.length > 16 ? ag.temaFiltro.slice(0,14)+"…" : ag.temaFiltro)) : "";
  const title   = \`Por turno\${temaLbl}\`;
  const chipTxt = ag.temaFiltro ? \`\${N0.format(ag.nTemaInt)} int.\` : \`\${N0.format(total)} int.\`;
  return \`<article class="cartao">
    <div class="cartao-topo"><h3>\${title}</h3><span class="chip" data-s="nd">\${chipTxt}</span></div>
    <div class="lista-perf">\${itens}</div>
  </article>\`;
}

// ── diretoria ─────────────────────────────────────────────────────────────────
function cartaoDir(ag) {
  const total = Object.values(ag.dirCnt).reduce((a,b)=>a+b, 0);
  const ord   = Object.entries(ag.dirCnt)
    .filter(([d]) => d !== "Não identificado")
    .sort((a,b)=>b[1]-a[1])
    .slice(0, 8);
  const maxV = ord[0] ? ord[0][1] : 1;

  const itens = ord.map(([d, v]) => {
    const p  = total ? v / total : 0;
    const bw = Math.round((v / maxV) * 100);
    const nm = d.length > 22 ? d.slice(0,20)+"…" : d;
    return \`<div class="perf-item">
      <span class="perf-nome">\${nm}<i class="perf-barra" style="width:\${bw*0.28}cqw"></i></span>
      <span class="perf-val">\${N0.format(v)} <span class="perf-pct">(\${pct(p)})</span></span>
    </div>\`;
  }).join("");

  const temaLbl = ag.temaFiltro ? (" · " + (ag.temaFiltro.length > 16 ? ag.temaFiltro.slice(0,14)+"…" : ag.temaFiltro)) : "";
  const title   = \`Por diretoria\${temaLbl}\`;
  const chipTxt = ag.temaFiltro ? \`\${N0.format(ag.nTemaInt)} int.\` : \`\${N0.format(total)} int.\`;
  return \`<article class="cartao">
    <div class="cartao-topo"><h3>\${title}</h3><span class="chip" data-s="nd">\${chipTxt}</span></div>
    <div class="lista-perf">\${itens || '<p style="font-size:.7cqw;color:var(--tinta-3)">Sem dados identificados.</p>'}</div>
  </article>\`;
}

// ── tendências mensais ────────────────────────────────────────────────────────
function calcularTendencias(trendSrc) {
  const src = trendSrc || DATA;
  const meses = [...new Set(src.map(r => LOOKUP.mes[r[F_MES]]))].sort();
  const idxNPSVazio = LOOKUP.nps.indexOf("");
  return meses.map(m => {
    const mesIdx = LOOKUP.mes.indexOf(m);
    const linhasM = src.filter(r => r[F_MES] === mesIdx);
    const total = linhasM.length;
    const interacoesM = linhasM.filter(r => r[F_TEMA] !== IDX_SI);
    const nInt = interacoesM.length;
    const engaj = total > 0 ? nInt / total : 0;
    const comNPS = linhasM.filter(r => r[F_NPS] !== idxNPSVazio);
    const prom = linhasM.filter(r => LOOKUP.nps[r[F_NPS]] === "Promotores").length;
    const det  = linhasM.filter(r => LOOKUP.nps[r[F_NPS]] === "Detratores").length;
    const enps = comNPS.length >= 5 ? Math.round((prom - det) / comNPS.length * 100) : null;
    const dirsAtivas = new Set(
      interacoesM.filter(r => r[F_DIR] !== IDX_DIR_VAZIO).map(r => r[F_DIR])
    ).size;
    return { mes: m, nInt, total, engaj, enps, dirsAtivas };
  });
}

// miniSparkSVG — usa concatenação de strings para evitar escaping de template literals
function miniSparkSVG(pontos, cfg) {
  const metaVal = cfg.metaVal, minVal = cfg.minVal != null ? cfg.minVal : 0;
  const fmtBar = cfg.fmtBar, metaLabel = cfg.metaLabel, colorFn = cfg.colorFn;
  const vals = pontos.map(p => p.val).filter(v => v !== null);
  if (!vals.length) return '<p style="font-size:.65cqw;color:var(--tinta-3)">Sem dados</p>';
  const media = vals.reduce((a,b)=>a+b,0) / vals.length;
  const maxV  = (metaVal != null ? Math.max(metaVal * 1.2, ...vals) : Math.max(...vals)) * 1.06;
  const range = Math.max(maxV - minVal, 1);
  const W = 100, H = 50;
  const pad = { t: 9, r: 7, b: 13, l: 5 };
  const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
  const n = pontos.length;
  const bw = Math.max(2, (cw / n) * 0.56);
  const yx = v => H - pad.b - ((v - minVal) / range) * ch;
  const cx = i => pad.l + (i + 0.5) * (cw / n);

  let barras = '';
  pontos.forEach((p, i) => {
    const lbl = '<text x="' + cx(i).toFixed(1) + '" y="' + (H-pad.b+4.5).toFixed(1) +
      '" text-anchor="middle" font-size="2.8" fill="#6E7873">' + mesFmt(p.mes) + '</text>';
    if (p.val === null) {
      barras += lbl + '<text x="' + cx(i).toFixed(1) + '" y="' + (H-pad.b-1.5).toFixed(1) +
        '" text-anchor="middle" font-size="2.8" fill="#CBD2CA">—</text>';
      return;
    }
    const isCur = p.mes === (estado.mes || MES_ATUAL);
    const fill  = colorFn(p.val);
    const zeroY = yx(Math.max(minVal, 0));
    const valY  = yx(p.val);
    const barTop = Math.min(zeroY, valY);
    const barH   = Math.max(0.5, Math.abs(zeroY - valY));
    barras += lbl +
      '<rect x="' + (cx(i)-bw/2).toFixed(1) + '" y="' + barTop.toFixed(1) +
        '" width="' + bw.toFixed(1) + '" height="' + barH.toFixed(1) +
        '" fill="' + fill + '" opacity="' + (isCur?1:0.5) + '" rx="0.6"/>' +
      '<text x="' + cx(i).toFixed(1) + '" y="' + (barTop-1.5).toFixed(1) +
        '" text-anchor="middle" font-size="3.2" fill="' + fill + '" font-weight="700">' + fmtBar(p.val) + '</text>';
  });

  let metaLine = '';
  if (metaVal != null) {
    const my = yx(metaVal);
    metaLine = '<line x1="' + pad.l + '" y1="' + my.toFixed(1) + '" x2="' + (W-pad.r) + '" y2="' + my.toFixed(1) +
      '" stroke="#B54728" stroke-width="0.7" stroke-dasharray="2,1.5"/>' +
      '<text x="' + (W-pad.r-0.5).toFixed(1) + '" y="' + (my-1.3).toFixed(1) +
        '" text-anchor="end" font-size="2.8" fill="#B54728">' + metaLabel + '</text>';
  }
  const my2 = yx(media);
  const mediaLine = '<line x1="' + pad.l + '" y1="' + my2.toFixed(1) + '" x2="' + (W-pad.r) + '" y2="' + my2.toFixed(1) +
    '" stroke="#1C6D96" stroke-width="0.5" stroke-dasharray="1.5,1" opacity="0.7"/>' +
    '<text x="' + pad.l.toFixed(1) + '" y="' + (my2-1.3).toFixed(1) +
      '" text-anchor="start" font-size="2.8" fill="#1C6D96" opacity="0.9">méd</text>';

  return '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;width:100%;flex:1;display:block">' +
    mediaLine + barras + metaLine + '</svg>';
}

function trendInfo(td, getVal, metaOk) {
  const vals = td.map(getVal).filter(v => v !== null);
  if (!vals.length) return { chip: "nd", arrow: "—", media: null };
  const media = vals.reduce((a,b)=>a+b,0) / vals.length;
  const last  = vals[vals.length-1];
  const prev  = vals.length >= 2 ? vals[vals.length-2] : last;
  const delta = last - prev;
  const thr   = Math.max(Math.abs(media * 0.04), 0.5);
  const arrow = delta > thr ? "↑" : delta < -thr ? "↓" : "→";
  return { chip: metaOk(last), arrow, media };
}

function cartaoTrendVolume(td) {
  const pontos = td.map(p => ({ mes: p.mes, val: p.nInt }));
  const { chip, arrow, media } = trendInfo(td, p=>p.nInt, v=>v>=META_MENSAL?"bom":v>=META_MENSAL*.75?"atencao":"critico");
  const svg = miniSparkSVG(pontos, { metaVal:META_MENSAL, fmtBar:v=>v>=1000?N0.format(v):String(v), metaLabel:"meta 1.000", colorFn:v=>v>=META_MENSAL?"#00694A":v>=META_MENSAL*.75?"#877C00":"#B54728" });
  const mediaStr = media !== null ? N0.format(Math.round(media)) : "—";
  return \`<article class="cartao">
    <div class="cartao-topo"><h3>1 · Volume</h3><span class="chip" data-s="\${chip}">\${arrow} méd \${mediaStr}</span></div>
    <div class="tendencia">\${svg}</div>
    <div class="trend-stat">Meta: \${N0.format(META_MENSAL)} int./mês</div>
  </article>\`;
}

function cartaoTrendEngaj(td) {
  const pontos = td.map(p => ({ mes: p.mes, val: p.engaj }));
  const { chip, arrow, media } = trendInfo(td, p=>p.engaj, v=>v>=.4?"bom":v>=.2?"atencao":"critico");
  const svg = miniSparkSVG(pontos, { metaVal:0.4, fmtBar:v=>pct(v), metaLabel:"meta 40%", colorFn:v=>v>=.4?"#00694A":v>=.2?"#877C00":"#B54728" });
  const mediaStr = media !== null ? pct(media) : "—";
  return \`<article class="cartao">
    <div class="cartao-topo"><h3>2 · Engajamento</h3><span class="chip" data-s="\${chip}">\${arrow} méd \${mediaStr}</span></div>
    <div class="tendencia">\${svg}</div>
    <div class="trend-stat">Meta: ≥ 40% · mercado 0–6m: 20–35%</div>
  </article>\`;
}

function cartaoTrendIA(td) {
  // IA: valor fixo (sem variação por mês nos dados disponíveis)
  const pontos = td.map(p => ({ mes: p.mes, val: 0.991 }));
  const svg = miniSparkSVG(pontos, { metaVal:0.85, fmtBar:()=>"99,1%", metaLabel:"ref 85%", colorFn:()=>"#00694A" });
  return \`<article class="cartao">
    <div class="cartao-topo"><h3>3 · Efetividade IA</h3><span class="chip" data-s="bom">→ 99,1%</span></div>
    <div class="tendencia">\${svg}</div>
    <div class="trend-stat">Referência mercado 12m+: 85–95%</div>
  </article>\`;
}

function cartaoTrendNPS(td) {
  const comDado = td.filter(p => p.enps !== null);
  const pontos  = td.map(p => ({ mes: p.mes, val: p.enps }));
  const { chip, arrow, media } = trendInfo(td, p=>p.enps, v=>v===null?"nd":v>=50?"bom":v>=0?"atencao":"critico");
  const svg = miniSparkSVG(pontos, { metaVal:50, minVal:-100, fmtBar:v=>String(v), metaLabel:"meta 50", colorFn:v=>v>=50?"#00694A":v>=0?"#877C00":"#B54728" });
  const mediaStr = media !== null ? String(Math.round(media)) : "—";
  const chipLabel = comDado.length ? (arrow + " méd " + mediaStr) : "Poucos dados";
  return \`<article class="cartao">
    <div class="cartao-topo"><h3>4 · Satisfação</h3><span class="chip" data-s="\${chip || 'nd'}">\${chipLabel}</span></div>
    <div class="tendencia">\${svg}</div>
    <div class="trend-stat">eNPS · meta: > 50 · top 10% mercado</div>
  </article>\`;
}

function cartaoTrendCobertura(td) {
  const totalDirs = 11;
  const pontos = td.map(p => ({ mes: p.mes, val: p.dirsAtivas }));
  const { chip, arrow, media } = trendInfo(td, p=>p.dirsAtivas, v=>v>=8?"bom":v>=5?"atencao":"critico");
  const svg = miniSparkSVG(pontos, { metaVal:8, fmtBar:v=>String(v), metaLabel:"meta 8 dirs", colorFn:v=>v>=8?"#00694A":v>=5?"#877C00":"#B54728" });
  const mediaStr = media !== null ? N1.format(media) : "—";
  return \`<article class="cartao">
    <div class="cartao-topo"><h3>5 · Cobertura</h3><span class="chip" data-s="\${chip}">\${arrow} méd \${mediaStr}</span></div>
    <div class="tendencia">\${svg}</div>
    <div class="trend-stat">Dirs. ativas de \${totalDirs} · meta: ≥ 8</div>
  </article>\`;
}

// ── render principal ──────────────────────────────────────────────────────────
function render() {
  const linhas = filtrar();

  // trendSrc: filtrado por dir/area mas abrangendo todos os meses
  const dirIdx2  = estado.dir  ? LOOKUP.dir.indexOf(estado.dir)   : -1;
  const areaIdx2 = estado.area ? LOOKUP.area.indexOf(estado.area) : -1;
  const trendSrc = (dirIdx2 >= 0 || areaIdx2 >= 0)
    ? DATA.filter(r => (dirIdx2 < 0 || r[F_DIR] === dirIdx2) && (areaIdx2 < 0 || r[F_AREA] === areaIdx2))
    : DATA;

  const ag = calcular(linhas, estado.comSI, trendSrc, estado.tema);

  // cabeçalho
  const temaLabel = estado.tema ? \`tema: \${estado.tema}\` : "";
  const recorte = [estado.dir, estado.area, temaLabel].filter(Boolean).join(" › ") || "Consolidado";
  const perLabel = estado.mes ? mesFmt(estado.mes) : "Todo o período";
  document.getElementById("cab-sub").textContent = perLabel + " · " + recorte;
  document.getElementById("cab-periodo").textContent = new Date().toLocaleDateString("pt-BR", { day:"2-digit", month:"short", year:"numeric" });
  document.getElementById("selo-si").hidden = !estado.comSI;
  document.getElementById("regua").textContent =
    N0.format(linhas.length) + " registros" + (estado.comSI ? "" : " (sem SI)");

  // KPI cards
  document.getElementById("linha-kpi").innerHTML =
    cardVolume(ag) + cardEngajamento(ag) + cardIA(ag) + cardSatisfacao(ag) + cardCobertura(ag);

  // análise — modo normal ou modo tendências
  const linhaBaixo = document.getElementById("linha-baixo");
  if (estado.tendencias) {
    const td = calcularTendencias(trendSrc);
    linhaBaixo.classList.add("modo-trend");
    linhaBaixo.innerHTML =
      cartaoTrendVolume(td) + cartaoTrendEngaj(td) + cartaoTrendIA(td) + cartaoTrendNPS(td) + cartaoTrendCobertura(td);
  } else {
    linhaBaixo.classList.remove("modo-trend");
    linhaBaixo.innerHTML =
      cartaoTendencia(ag) + cartaoTemas(ag) + cartaoTurno(ag) + cartaoDir(ag);
  }
  document.getElementById("btn-tendencias").classList.toggle("ativo", estado.tendencias);

  // janela buttons
  document.querySelectorAll(".janela button").forEach(b =>
    b.setAttribute("aria-pressed", String(b.dataset.j === (estado.mes || "todos")))
  );
}

// ── filtros ───────────────────────────────────────────────────────────────────
function opcoes(sel, itens, valor, rot) {
  sel.textContent = "";
  sel.appendChild(new Option(rot, ""));
  itens.forEach(v => v && sel.appendChild(new Option(v, v)));
  sel.value = itens.includes(valor) ? valor : "";
}

// popula o select de temas com base no recorte mes/dir/area atual
function popularTemas() {
  const linhasAtuais = filtrar();
  const temasDisp = [...new Set(
    linhasAtuais.filter(r => r[F_TEMA] !== IDX_SI).map(r => LOOKUP.tema[r[F_TEMA]])
  )].sort((a,b) => a.localeCompare(b,"pt-BR"));
  const fTema = document.getElementById("f-tema");
  opcoes(fTema, temasDisp, estado.tema, "Todos os temas");
  estado.tema = fTema.value;
}

function popularFiltros() {
  // meses (com pelo menos uma interação)
  const mesesComInt = [...new Set(
    DATA.filter(r => r[F_TEMA] !== IDX_SI).map(r => LOOKUP.mes[r[F_MES]])
  )].sort((a,b) => b.localeCompare(a));

  // mês select — construir com grupo de meses
  const fMes = document.getElementById("f-mes");
  fMes.textContent = "";
  fMes.appendChild(new Option("Todo o período", ""));
  mesesComInt.forEach(m => fMes.appendChild(new Option(mesFmt(m), m)));
  fMes.value = estado.mes && mesesComInt.includes(estado.mes) ? estado.mes : (mesesComInt[0] || "");
  estado.mes = fMes.value;

  // diretorias (com interação, excluindo vazio)
  const dirIdx  = estado.dir  ? LOOKUP.dir.indexOf(estado.dir)   : -1;
  const dirs = [...new Set(
    DATA.filter(r => r[F_TEMA] !== IDX_SI && r[F_DIR] !== IDX_DIR_VAZIO).map(r => LOOKUP.dir[r[F_DIR]])
  )].sort((a,b) => a.localeCompare(b,"pt-BR"));
  opcoes(document.getElementById("f-dir"), dirs, estado.dir, "Todas as diretorias");
  estado.dir = document.getElementById("f-dir").value;

  // áreas (filtradas por dir selecionada)
  const areas = [...new Set(
    DATA.filter(r => r[F_TEMA] !== IDX_SI && r[F_AREA] !== IDX_AREA_VAZIA &&
      (dirIdx < 0 || r[F_DIR] === dirIdx)).map(r => LOOKUP.area[r[F_AREA]])
  )].sort((a,b) => a.localeCompare(b,"pt-BR"));
  opcoes(document.getElementById("f-area"), areas, estado.area, "Todas as áreas");
  estado.area = document.getElementById("f-area").value;

  // temas (filtrados pelo recorte mes/dir/area atual)
  popularTemas();
}

// ── eventos ───────────────────────────────────────────────────────────────────
document.getElementById("f-mes").addEventListener("change", e => {
  estado.mes = e.target.value;
  estado.tema = "";          // temas disponíveis mudam com o mês
  popularTemas();
  render();
});
document.getElementById("f-dir").addEventListener("change", e => {
  estado.dir = e.target.value;
  estado.area = "";
  estado.tema = "";          // temas mudam com dir/área
  popularFiltros();
  render();
});
document.getElementById("f-area").addEventListener("change", e => {
  estado.area = e.target.value;
  estado.tema = "";          // temas mudam com área
  popularTemas();
  render();
});
document.getElementById("f-tema").addEventListener("change", e => {
  estado.tema = e.target.value;
  render();
});
document.getElementById("toggle-si").addEventListener("change", e => {
  estado.comSI = e.target.checked;
  render();
});
document.getElementById("btn-tendencias").addEventListener("click", () => {
  estado.tendencias = !estado.tendencias;
  render();
});

// copiar resumo
document.getElementById("btn-exportar").addEventListener("click", () => {
  const linhas = filtrar();
  const ag = calcular(linhas);
  const per = estado.mes ? mesFmt(estado.mes) : "todo o período";
  const rec = [estado.dir, estado.area].filter(Boolean).join(" › ") || "consolidado";
  const texto = [
    \`Canal RH WhatsApp — KPIs · \${per} · \${rec}\`,
    \`\`,
    \`Volume: \${N0.format(ag.nInt)} interações (meta: \${N0.format(META_MENSAL)}/mês · \${pct(ag.nInt/META_MENSAL)} da meta)\`,
    \`Engajamento: \${pct(ag.engaj)} (interações/acessos) · \${N0.format(ag.pessoasInt)} pessoas únicas\`,
    \`Efetividade IA: 99,1% resolução automática\`,
    ag.enps !== null ? \`Satisfação: eNPS \${ag.enps} · \${ag.prom} promotores, \${ag.det} detratores\` : \`Satisfação: sem pesquisa no período\`,
    \`Cobertura: \${ag.dirsAtivas} diretorias ativas · \${ag.nTemasInt} temas\`,
    \`\`,
    ag.topTemas.slice(0,5).map(([t,v], i) => \`\${i+1}. \${t}: \${v}\`).join("\\n"),
  ].join("\\n");
  navigator.clipboard.writeText(texto).then(() => {
    const b = document.getElementById("btn-exportar");
    b.textContent = "✓ Copiado!";
    setTimeout(() => { b.textContent = "📋 Copiar resumo"; }, 2000);
  });
});

// ── init ──────────────────────────────────────────────────────────────────────
popularFiltros();
render();
</script>
</body>
</html>`;

const saida = resolve(raiz, "painel", "chatbot-rh.html");
writeFileSync(saida, html);
console.log(`ok — painel/chatbot-rh.html gerado (${(html.length / 1024).toFixed(0)} KB)`);
