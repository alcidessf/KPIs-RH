// Gera painel/chatbot-rh.html — painel de KPIs do Canal RH WhatsApp
// node tools/gerar-painel-chatbot.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
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
  let mes = "", data = "";
  if (d) {
    const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) { mes = m[3] + "-" + m[2]; data = m[3] + "-" + m[2] + "-" + m[1]; }
  }
  return {
    id:    campo(f, "chave_pessoa_unica"),
    mes, data,
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

const LM = makeLookup("mes");
const LT = makeLookup("tema");
const LD = makeLookup("dir");
const LA = makeLookup("area");
const LR = makeLookup("turno");
const LN = makeLookup("nps");
const LF = makeLookup("data");  // full date YYYY-MM-DD

const pessoaMap = new Map();
let pessoaCtr = 0;
const pessoaId = id => {
  if (!pessoaMap.has(id)) pessoaMap.set(id, pessoaCtr++);
  return pessoaMap.get(id);
};

// compact row: [mesIdx, temaIdx, auth, dirIdx, areaIdx, turnoIdx, npsIdx, pessoaIdx, dataIdx]
const DATA = rows.map(r => [
  LM.idx[r.mes],
  LT.idx[r.tema],
  r.auth,
  LD.idx[r.dir],
  LA.idx[r.area],
  LR.idx[r.turno],
  LN.idx[r.nps],
  pessoaId(r.id),
  LF.idx[r.data],
]);

const LOOKUP = {
  mes:   LM.vals,
  tema:  LT.vals,
  dir:   LD.vals,
  area:  LA.vals,
  turno: LR.vals,
  nps:   LN.vals,
  data:  LF.vals,
};

// ── HC por diretoria (meta dinâmica) ─────────────────────────────────────────
const hcPath = resolve(raiz, "dados", "hc-diretorias.csv");
const HC_DATA = {};
if (existsSync(hcPath)) {
  readFileSync(hcPath, "utf8").split("\n").slice(1).forEach(l => {
    const [dir, hc] = l.split(";").map(s => s.trim().replace(/\r$/, ""));
    if (dir && hc) HC_DATA[dir] = parseInt(hc, 10);
  });
}
const HC_TOTAL = Object.values(HC_DATA).reduce((a, b) => a + b, 0) || 6000;

// ── Campanhas ────────────────────────────────────────────────────────────────
const campPath = resolve(raiz, "dados", "campanhas.json");
const CAMPANHAS = existsSync(campPath)
  ? JSON.parse(readFileSync(campPath, "utf8"))
  : [];

// ── build HTML ───────────────────────────────────────────────────────────────
const js_data = JSON.stringify({ LOOKUP, DATA, HC_DATA, HC_TOTAL, CAMPANHAS });

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Canal RH WhatsApp — KPIs</title>
<style>
/* ============================================================
   Canal RH WhatsApp · Painel de KPIs
   Paleta institucional · app multi-tela · sem dependências
   ============================================================ */
:root {
  --c-bg:       #F4F6F3;
  --c-surface:  #FFFFFF;
  --c-header:   #2E4C46;
  --c-border:   #E2E7DF;
  --c-border2:  #CBD4C8;
  --c-ink:      #1A2820;
  --c-ink2:     #445049;
  --c-ink3:     #6B7870;
  --c-verde:    #00694A;
  --c-verde-l:  #5FB35A;
  --c-azul:     #1C6D96;
  --c-amarelo:  #877C00;
  --c-cri:      #B54728;
  --c-bom-bg:   #E6F2EC; --c-bom-txt: #00563C;
  --c-atn-bg:   #FAF4D0; --c-atn-txt: #6E6400;
  --c-cri-bg:   #F7E7E1; --c-cri-txt: #8E3720;
  --c-neu-bg:   #EDEFEA; --c-neu-txt: #5A6560;
  --c-tab-h:    56px;
  --c-filter-h: 52px;
  --radius:     10px;
  --shadow:     0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.05);
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--c-bg); color: var(--c-ink);
  font: 14px/1.5 "Segoe UI", ui-sans-serif, system-ui, -apple-system, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}
h1,h2,h3,p,dl,dd,dt,ul,li,figure { margin: 0; padding: 0; }
ul { list-style: none; }
button { font: inherit; cursor: pointer; }

/* ── cabeçalho ── */
.app-header {
  background: var(--c-header); color: #fff;
  padding: 0 24px;
  display: flex; align-items: center; gap: 16px; height: 52px;
  position: sticky; top: 0; z-index: 100;
}
.app-logo {
  height: 28px; width: 72px; border: 1px dashed rgba(255,255,255,.3);
  border-radius: 5px; display: flex; align-items: center; justify-content: center;
  font-size: 10px; letter-spacing: .12em; color: rgba(255,255,255,.6); flex: none;
}
.app-header h1 { font-size: 15px; font-weight: 700; letter-spacing: -.01em; }
.app-header .sub { font-size: 12px; color: rgba(255,255,255,.6); margin-top: 1px; }
.app-header .spacer { flex: 1; }
.header-data { font-size: 12px; color: rgba(255,255,255,.6); }

/* ── abas de navegação ── */
.app-tabs {
  background: var(--c-surface); border-bottom: 1px solid var(--c-border);
  padding: 0 24px;
  display: flex; gap: 0; align-items: stretch; height: var(--c-tab-h);
  position: sticky; top: 52px; z-index: 99;
  box-shadow: var(--shadow);
}
.tab-btn {
  display: flex; align-items: center; gap: 7px;
  padding: 0 20px; border: none; background: none;
  color: var(--c-ink3); font-size: 14px; font-weight: 600;
  border-bottom: 3px solid transparent;
  transition: color .15s, border-color .15s;
  white-space: nowrap;
}
.tab-btn:hover { color: var(--c-ink2); }
.tab-btn.ativo {
  color: var(--c-verde); border-bottom-color: var(--c-verde);
}
.tab-btn .tab-icon { font-size: 16px; }

/* ── barra de filtros ── */
.filtros-bar {
  background: var(--c-surface); border-bottom: 1px solid var(--c-border);
  padding: 0 24px;
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  min-height: var(--c-filter-h);
}
.campo {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; color: var(--c-ink3);
}
.campo label { font-weight: 600; white-space: nowrap; }
.campo select {
  font: 13px inherit; color: var(--c-ink2);
  background: var(--c-bg); border: 1px solid var(--c-border2);
  border-radius: 7px; padding: 5px 10px; cursor: pointer; max-width: 180px;
}
.campo select:focus-visible { outline: 2px solid var(--c-azul); outline-offset: 1px; }
.sep { color: var(--c-border2); font-size: 18px; }
.toggle-si {
  display: flex; align-items: center; gap: 5px;
  font-size: 13px; color: var(--c-ink2); font-weight: 600; cursor: pointer;
}
.toggle-si input { accent-color: var(--c-azul); cursor: pointer; }
.regua {
  margin-left: auto; font-size: 12px; color: var(--c-ink3); white-space: nowrap;
  background: var(--c-bg); border: 1px solid var(--c-border);
  border-radius: 20px; padding: 3px 10px;
}

/* ── área principal ── */
.app-main {
  padding: 24px; max-width: 1400px; margin: 0 auto;
}
.screen { display: none; }
.screen.ativa { display: block; }

/* ── cartões ── */
.card {
  background: var(--c-surface); border: 1px solid var(--c-border);
  border-radius: var(--radius); padding: 20px 22px;
  box-shadow: var(--shadow); position: relative; overflow: hidden;
}
.card-topo {
  display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
}
.card-topo h3 {
  font-size: 13px; font-weight: 700; color: var(--c-ink2); letter-spacing: .01em;
}
.card-faixa {
  position: absolute; inset: 0 auto 0 0; width: 4px;
  border-radius: var(--radius) 0 0 var(--radius);
  background: var(--faixa, var(--c-border));
}
.card[data-s="bom"]     { --faixa: var(--c-verde); }
.card[data-s="atencao"] { --faixa: var(--c-amarelo); }
.card[data-s="critico"] { --faixa: var(--c-cri); }
.card[data-s="nd"]      { --faixa: var(--c-ink3); }

/* chip */
.chip {
  margin-left: auto; display: inline-flex; align-items: center;
  padding: 3px 10px; border-radius: 999px;
  font-size: 12px; font-weight: 700; white-space: nowrap;
}
.chip[data-s="bom"]     { background: var(--c-bom-bg); color: var(--c-bom-txt); }
.chip[data-s="atencao"] { background: var(--c-atn-bg); color: var(--c-atn-txt); }
.chip[data-s="critico"] { background: var(--c-cri-bg); color: var(--c-cri-txt); }
.chip[data-s="nd"]      { background: var(--c-neu-bg); color: var(--c-neu-txt); }

/* ── TELA 1: Visão Geral ── */
.kpi-grid {
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px;
  margin-bottom: 16px;
}
.kpi-valor { font-size: 42px; font-weight: 800; letter-spacing: -.03em; line-height: 1; color: var(--c-header); margin-bottom: 4px; }
.kpi-valor small { font-size: 16px; font-weight: 500; color: var(--c-ink3); margin-left: 4px; }
.kpi-sub { font-size: 12px; color: var(--c-ink3); margin-bottom: 14px; }
.barra-wrap { margin-bottom: 14px; }
.barra-track { height: 6px; border-radius: 3px; background: var(--c-border); overflow: hidden; }
.barra-fill  { height: 100%; border-radius: 3px; background: var(--c-verde); transition: width .4s; }
.barra-labels { display: flex; justify-content: space-between; font-size: 11px; color: var(--c-ink3); margin-top: 4px; }
.analises { display: flex; flex-direction: column; gap: 0; }
.analise-row {
  display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center;
  padding: 7px 0; border-top: 1px solid var(--c-border); font-size: 12px;
}
.analise-row dt { color: var(--c-ink3); }
.analise-row dd { font-weight: 700; text-align: right; white-space: nowrap; }
.val-bom { color: var(--c-bom-txt); }
.val-atn { color: var(--c-atn-txt); }
.val-cri { color: var(--c-cri-txt); }
.val-neu { color: var(--c-neu-txt); }

/* ── TELA 2: Canal ── */
.canal-grid {
  display: grid; grid-template-columns: 1.6fr 1fr; gap: 16px;
}
.canal-chart-wrap { height: 320px; }

/* Top temas list */
.rank-list { display: flex; flex-direction: column; gap: 0; }
.rank-item {
  display: grid; grid-template-columns: 1fr auto; gap: 8px;
  align-items: center; padding: 9px 0; border-top: 1px solid var(--c-border);
  font-size: 13px;
}
.rank-item:first-child { border-top: 0; padding-top: 0; }
.rank-nome-wrap { display: flex; flex-direction: column; gap: 3px; }
.rank-nome { color: var(--c-ink2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px; }
.rank-barra { height: 4px; border-radius: 2px; background: var(--c-border); overflow: hidden; }
.rank-barra i { display: block; height: 100%; border-radius: 2px; background: var(--c-verde); }
.rank-val { font-weight: 700; color: var(--c-ink); text-align: right; white-space: nowrap; }

/* ── TELA 3: Organização ── */
.org-grid { display: grid; grid-template-columns: 1fr 1.4fr; gap: 16px; }
.org-list { display: flex; flex-direction: column; gap: 0; }
.org-item {
  display: grid; grid-template-columns: 140px 1fr 90px; gap: 10px;
  align-items: center; padding: 10px 0; border-top: 1px solid var(--c-border);
  font-size: 13px;
}
.org-item:first-child { border-top: 0; padding-top: 0; }
.org-nome { color: var(--c-ink2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
.org-barra { height: 6px; border-radius: 3px; background: var(--c-border); overflow: hidden; }
.org-barra i { display: block; height: 100%; border-radius: 3px; }
.org-val { font-weight: 700; color: var(--c-ink); text-align: right; font-size: 12px; white-space: nowrap; }
.org-pct { color: var(--c-ink3); font-weight: 400; }
.drill-label {
  font-size: 12px; color: var(--c-azul); font-weight: 600;
  display: flex; align-items: center; gap: 6px; margin-bottom: 10px;
}
.drill-label span { cursor: pointer; text-decoration: underline; }

/* ── TELA 4: Tendências ── */
.trend-list { display: flex; flex-direction: column; gap: 12px; }
.trend-row {
  background: var(--c-surface); border: 1px solid var(--c-border);
  border-radius: var(--radius); padding: 18px 22px 14px;
  box-shadow: var(--shadow); position: relative; overflow: hidden;
}
.trend-row .card-faixa { border-radius: var(--radius) 0 0 var(--radius); }
.trend-header {
  display: flex; align-items: center; gap: 12px; margin-bottom: 12px;
}
.trend-header h3 { font-size: 14px; font-weight: 700; color: var(--c-ink2); }
.trend-header .chip { margin-left: 0; }
.trend-meta { margin-left: auto; font-size: 12px; color: var(--c-ink3); }
.trend-chart { height: 90px; }

/* ── TELA 5: Diário ── */
.diario-header {
  display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 4px;
}
.kpi-diario {
  background: var(--c-surface); border: 1px solid var(--c-border);
  border-radius: var(--radius); padding: 14px 20px; flex: 1; min-width: 160px;
  box-shadow: var(--shadow);
}
.kpi-diario h4 { font-size: 11px; font-weight: 700; color: var(--c-ink3); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 6px; }
.kpi-diario .val { font-size: 28px; font-weight: 800; letter-spacing: -.02em; color: var(--c-header); }
.kpi-diario .val small { font-size: 13px; font-weight: 400; color: var(--c-ink3); margin-left: 3px; }
.kpi-diario .sub { font-size: 11px; color: var(--c-ink3); margin-top: 3px; }
.diario-chart-wrap { overflow-x: auto; padding-bottom: 4px; }
.camp-legend {
  display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px;
}
.camp-pill {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
  border: 1.5px solid; background: transparent;
}
.camp-pill .camp-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }

/* ── botão exportar ── */
.btn-exportar {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 8px; border: 1px solid var(--c-border2);
  background: var(--c-surface); color: var(--c-ink2); font-size: 13px; font-weight: 600;
  cursor: pointer;
}
.btn-exportar:hover { background: var(--c-bg); }

/* ── tooltip seleccionado (tema highlight) ── */
.rank-item.sel { background: rgba(28,109,150,.07); border-radius: 7px; margin: 0 -8px; padding: 9px 8px; }
.rank-item.sel .rank-nome { color: var(--c-azul); font-weight: 700; }
.rank-item.sel .rank-barra i { background: var(--c-azul); }
</style>
</head>
<body>

<!-- ── cabeçalho ── -->
<header class="app-header">
  <div class="app-logo">LOGO</div>
  <div>
    <h1>Canal RH · WhatsApp — Painel de KPIs</h1>
    <div class="sub" id="cab-sub">Carregando…</div>
  </div>
  <div class="spacer"></div>
  <div class="header-data" id="cab-data"></div>
</header>

<!-- ── abas ── -->
<nav class="app-tabs" role="tablist">
  <button class="tab-btn ativo" data-tab="geral" role="tab">
    <span class="tab-icon">📊</span> Visão Geral
  </button>
  <button class="tab-btn" data-tab="canal" role="tab">
    <span class="tab-icon">💬</span> Canal
  </button>
  <button class="tab-btn" data-tab="org" role="tab">
    <span class="tab-icon">🏢</span> Organização
  </button>
  <button class="tab-btn" data-tab="tendencias" role="tab">
    <span class="tab-icon">📈</span> Tendências
  </button>
  <button class="tab-btn" data-tab="diario" role="tab">
    <span class="tab-icon">📅</span> Diário
  </button>
</nav>

<!-- ── filtros ── -->
<div class="filtros-bar">
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
    <select id="f-tema" style="max-width:200px"></select>
  </div>
  <span class="sep">|</span>
  <label class="toggle-si">
    <input type="checkbox" id="toggle-si"> Incluir Sem Interação
  </label>
  <span class="regua" id="regua">— registros</span>
</div>

<!-- ── conteúdo principal ── -->
<main class="app-main">

  <!-- TELA 1 · Visão Geral -->
  <section class="screen ativa" id="screen-geral">
    <div class="kpi-grid" id="kpi-grid"></div>
  </section>

  <!-- TELA 2 · Canal -->
  <section class="screen" id="screen-canal">
    <div class="canal-grid">
      <div class="card">
        <div class="card-faixa"></div>
        <div class="card-topo">
          <h3>Interações por mês</h3>
          <span class="chip" data-s="nd" id="canal-chip">meta 1.000</span>
        </div>
        <div class="canal-chart-wrap"><svg id="canal-svg" style="width:100%;height:100%;display:block;overflow:visible"></svg></div>
      </div>
      <div class="card" id="card-temas">
        <div class="card-faixa"></div>
      </div>
    </div>
  </section>

  <!-- TELA 3 · Organização -->
  <section class="screen" id="screen-org">
    <div class="org-grid">
      <div class="card" id="card-turno">
        <div class="card-faixa" style="background:var(--c-verde-l)"></div>
      </div>
      <div class="card" id="card-dir">
        <div class="card-faixa" style="background:var(--c-azul)"></div>
      </div>
    </div>
  </section>

  <!-- TELA 4 · Tendências -->
  <section class="screen" id="screen-tendencias">
    <div class="trend-list" id="trend-list"></div>
  </section>

  <!-- TELA 5 · Diário -->
  <section class="screen" id="screen-diario">
    <div class="diario-header" id="diario-header"></div>
    <div class="card" style="margin-top:16px">
      <div class="card-faixa" id="diario-faixa"></div>
      <div class="card-topo">
        <h3 id="diario-titulo">Acessos por dia</h3>
        <span class="chip" data-s="nd" id="diario-chip"></span>
      </div>
      <div class="diario-chart-wrap">
        <svg id="diario-svg" style="width:100%;display:block;overflow:visible"></svg>
      </div>
    </div>
    <div class="camp-legend" id="camp-legend"></div>
  </section>

</main>

<script>
// ── dados embeddados ─────────────────────────────────────────
const { LOOKUP, DATA, HC_DATA, HC_TOTAL, CAMPANHAS } = ${js_data};
const F_MES=0,F_TEMA=1,F_AUTH=2,F_DIR=3,F_AREA=4,F_TURNO=5,F_NPS=6,F_PESSOA=7,F_DATA=8;
const IDX_SI = LOOKUP.tema.indexOf("Sem Interação");
const IDX_DIR_VAZIO   = LOOKUP.dir.indexOf("");
const IDX_AREA_VAZIA  = LOOKUP.area.indexOf("");
const IDX_TURNO_VAZIO = LOOKUP.turno.indexOf("");
const MESES_ORD = [...LOOKUP.mes].sort((a,b) => b.localeCompare(a));
const MES_ATUAL = MESES_ORD[0];
const META_MENSAL = 1000;

const mesFmt = m => {
  if (!m) return "Todo o período";
  const [y, mo] = m.split("-");
  return ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"][+mo-1] + "/" + y.slice(2);
};
const N0  = new Intl.NumberFormat("pt-BR");
const N1  = new Intl.NumberFormat("pt-BR",{maximumFractionDigits:1});
const pct = v => N1.format(v*100)+"%";
const st  = (v,bom,atn) => v==null?"nd":v>=bom?"bom":v>=atn?"atencao":"critico";

// estado
const E = { mes:"2026-07", dir:"", area:"", tema:"", comSI:false, tela:"geral" };

// ── meta efetiva (proporcional ao HC da diretoria) ────────────
function metaEfetiva() {
  if (E.dir && HC_DATA[E.dir] != null && HC_TOTAL > 0) {
    return Math.max(1, Math.round(META_MENSAL * HC_DATA[E.dir] / HC_TOTAL));
  }
  return META_MENSAL;
}
function metaLabel() {
  const m = metaEfetiva();
  if (E.dir && HC_DATA[E.dir] != null) {
    return "meta " + N0.format(m) + " (HC " + N0.format(HC_DATA[E.dir]) + ")";
  }
  return "meta " + N0.format(m);
}

// ── filtrar ────────────────────────────────────────────────────
function filtrar() {
  const di = E.dir  ? LOOKUP.dir.indexOf(E.dir)   : -1;
  const ai = E.area ? LOOKUP.area.indexOf(E.area) : -1;
  const mi = E.mes  ? LOOKUP.mes.indexOf(E.mes)   : -1;
  return DATA.filter(r =>
    (mi<0||r[F_MES]===mi) && (di<0||r[F_DIR]===di) && (ai<0||r[F_AREA]===ai)
  );
}

function trendSrcFn() {
  const di = E.dir  ? LOOKUP.dir.indexOf(E.dir)   : -1;
  const ai = E.area ? LOOKUP.area.indexOf(E.area) : -1;
  return (di<0&&ai<0)?DATA:DATA.filter(r=>(di<0||r[F_DIR]===di)&&(ai<0||r[F_AREA]===ai));
}

// ── calcular ──────────────────────────────────────────────────
function calcular(linhas) {
  const total = linhas.length;
  const si    = linhas.filter(r=>r[F_TEMA]===IDX_SI).length;
  const inter = linhas.filter(r=>r[F_TEMA]!==IDX_SI);
  const nInt  = inter.length;
  const engaj = total>0 ? nInt/total : 0;
  const pessoasInt = new Set(inter.map(r=>r[F_PESSOA])).size;
  const tiIdx = E.tema ? LOOKUP.tema.indexOf(E.tema) : -1;
  const srcT  = tiIdx>=0 ? inter.filter(r=>r[F_TEMA]===tiIdx) : inter;

  const idxNV = LOOKUP.nps.indexOf("");
  const comNPS= linhas.filter(r=>r[F_NPS]!==idxNV);
  const prom  = linhas.filter(r=>LOOKUP.nps[r[F_NPS]]==="Promotores").length;
  const det   = linhas.filter(r=>LOOKUP.nps[r[F_NPS]]==="Detratores").length;
  const neut  = linhas.filter(r=>LOOKUP.nps[r[F_NPS]]==="Neutros").length;
  const enps  = comNPS.length>0 ? Math.round((prom-det)/comNPS.length*100) : null;
  const dirsAtivas = new Set(inter.filter(r=>r[F_DIR]!==IDX_DIR_VAZIO).map(r=>LOOKUP.dir[r[F_DIR]])).size;

  const srcTemas = E.comSI ? linhas : inter;
  const temaCnt = {};
  srcTemas.forEach(r=>{ const t=LOOKUP.tema[r[F_TEMA]]; temaCnt[t]=(temaCnt[t]||0)+1; });
  const topTemas = Object.entries(temaCnt).sort((a,b)=>b[1]-a[1]);
  const nTemasInt = new Set(inter.map(r=>r[F_TEMA])).size;

  const turnoCnt = {};
  srcT.forEach(r=>{ const t=LOOKUP.turno[r[F_TURNO]]||"Não informado"; turnoCnt[t]=(turnoCnt[t]||0)+1; });
  const dirCnt = {};
  srcT.forEach(r=>{ const d=LOOKUP.dir[r[F_DIR]]||"Não identificado"; dirCnt[d]=(dirCnt[d]||0)+1; });

  // área breakdown — usada quando dir está selecionada
  const areaCnt = {};
  srcT.forEach(r=>{ const a=LOOKUP.area[r[F_AREA]]||"Não informada"; areaCnt[a]=(areaCnt[a]||0)+1; });

  // tendência mensal (trendSrc)
  const tsd = trendSrcFn();
  const mesIntCnt={}, mesTotCnt={};
  tsd.forEach(r=>{ const m=LOOKUP.mes[r[F_MES]]; if(r[F_TEMA]!==IDX_SI) mesIntCnt[m]=(mesIntCnt[m]||0)+1; mesTotCnt[m]=(mesTotCnt[m]||0)+1; });

  return { total,si,nInt,engaj,pessoasInt,prom,det,neut,enps,totalNPS:comNPS.length,
    dirsAtivas,topTemas,nTemasInt,turnoCnt,dirCnt,areaCnt,mesIntCnt,mesTotCnt,
    temaFiltro:E.tema||null, nTemaInt:srcT.length };
}

// ── tendências mensais ────────────────────────────────────────
function calcularTendencias(temaFiltro) {
  const src = trendSrcFn();
  const meses = [...new Set(src.map(r=>LOOKUP.mes[r[F_MES]]))].sort();
  const idxNV = LOOKUP.nps.indexOf("");
  const ti = temaFiltro ? LOOKUP.tema.indexOf(temaFiltro) : -1;
  return meses.map(m => {
    const mi = LOOKUP.mes.indexOf(m);
    const lM = src.filter(r=>r[F_MES]===mi);
    const tot = lM.length;
    const iM  = lM.filter(r=>r[F_TEMA]!==IDX_SI);
    const nIT = iM.length;
    const tiM = ti>=0 ? iM.filter(r=>r[F_TEMA]===ti) : iM;
    const nI  = tiM.length;
    const engaj = ti>=0 ? (nIT>0?nI/nIT:0) : (tot>0?nIT/tot:0);
    const nL = ti>=0 ? tiM : lM;
    const cN = nL.filter(r=>r[F_NPS]!==idxNV);
    const pr = nL.filter(r=>LOOKUP.nps[r[F_NPS]]==="Promotores").length;
    const dt = nL.filter(r=>LOOKUP.nps[r[F_NPS]]==="Detratores").length;
    const enps = cN.length>=5 ? Math.round((pr-dt)/cN.length*100) : null;
    const dirs = new Set(tiM.filter(r=>r[F_DIR]!==IDX_DIR_VAZIO).map(r=>r[F_DIR])).size;
    return { mes:m, nInt:nI, nIntTotal:nIT, total:tot, engaj, enps, dirsAtivas:dirs };
  });
}

// ── SVG: gráfico de barras mensal (tela Canal) ────────────────
function drawCanalChart(mesIntCnt) {
  const svg = document.getElementById("canal-svg");
  const W = svg.clientWidth || 600;
  const H = svg.clientHeight || 300;
  const entries = Object.entries(mesIntCnt).sort((a,b)=>a[0].localeCompare(b[0]));
  if (!entries.length) { svg.innerHTML = ""; return; }

  const meta = metaEfetiva();
  const maxV = Math.max(meta*1.1, ...entries.map(([,v])=>v));
  const pad = { t:30, r:16, b:36, l:8 };
  const cw = W-pad.l-pad.r, ch = H-pad.t-pad.b;
  const n = entries.length;
  const bw = Math.min(60, Math.max(20, (cw/n)*0.55));
  const yx = v => H - pad.b - (v/maxV)*ch;
  const cx = i => pad.l + (i+0.5)*(cw/n);

  let out = "";

  // grade sutil
  [0, 0.5, 1].forEach(f => {
    const v = Math.round(meta * f * 0.5);
    const y = yx(meta * f);
    out += '<line x1="'+pad.l+'" y1="'+y.toFixed(1)+'" x2="'+(W-pad.r)+'" y2="'+y.toFixed(1)+'" stroke="#E2E7DF" stroke-width="1"/>';
  });

  // meta
  const my = yx(meta);
  out += '<line x1="'+pad.l+'" y1="'+my.toFixed(1)+'" x2="'+(W-pad.r)+'" y2="'+my.toFixed(1)+'" stroke="#B54728" stroke-width="1.5" stroke-dasharray="6,4"/>';
  out += '<text x="'+(W-pad.r-2)+'" y="'+(my-4).toFixed(1)+'" text-anchor="end" font-size="11" fill="#B54728" font-weight="700">'+metaLabel()+'</text>';

  // barras
  entries.forEach(([m, v], i) => {
    const isCur = m === (E.mes||MES_ATUAL);
    const fill = v>=meta?"#00694A":v>=meta*.75?"#877C00":"#B54728";
    const x = cx(i)-bw/2;
    const y = yx(v);
    const bh = H-pad.b-y;
    const opacity = isCur ? "1" : "0.55";
    out += '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh.toFixed(1)+'" fill="'+fill+'" opacity="'+opacity+'" rx="4"/>';
    // valor acima da barra
    const lblY = (y-6).toFixed(1);
    out += '<text x="'+cx(i).toFixed(1)+'" y="'+lblY+'" text-anchor="middle" font-size="12" font-weight="700" fill="'+fill+'">'+N0.format(v)+'</text>';
    // label mês
    out += '<text x="'+cx(i).toFixed(1)+'" y="'+(H-pad.b+14).toFixed(1)+'" text-anchor="middle" font-size="11" fill="#6B7870">'+mesFmt(m)+'</text>';
  });

  svg.setAttribute("viewBox","0 0 "+W+" "+H);
  svg.innerHTML = out;
}

// ── SVG: sparkline tendência (tela Tendências) ────────────────
// Mostra rótulo apenas no pico, no mínimo, e no mês atual
function trendBarSVG(pontos, cfg) {
  const vals = pontos.map(p=>p.val).filter(v=>v!==null);
  if (!vals.length) return '<p style="color:#6B7870;font-size:13px">Sem dados</p>';

  const minVal = cfg.minVal!=null?cfg.minVal:0;
  const metaV  = cfg.metaVal;
  const colorFn= cfg.colorFn;
  const fmtV   = cfg.fmtV;

  const maxV = Math.max(metaV!=null?metaV*1.15:0, ...vals)*1.06;
  const range = Math.max(maxV-minVal,1);

  const W=500, H=80;
  const pad={t:22,r:8,b:20,l:6};
  const cw=W-pad.l-pad.r, ch=H-pad.t-pad.b;
  const n=pontos.length;
  const bw=Math.max(10,Math.min(40,(cw/n)*0.6));
  const yx=v=>H-pad.b-((v-minVal)/range)*ch;
  const cx=i=>pad.l+(i+0.5)*(cw/n);

  // índices especiais
  const idxMax = vals.indexOf(Math.max(...vals));
  const idxMin = vals.indexOf(Math.min(...vals));
  const idxLast = pontos.length-1;
  // encontrar índice do mês atual no array pontos
  const idxCur = pontos.findIndex(p=>p.mes===(E.mes||MES_ATUAL));

  let out="";

  // meta
  if (metaV!=null) {
    const my=yx(metaV);
    out+='<line x1="'+pad.l+'" y1="'+my.toFixed(1)+'" x2="'+(W-pad.r)+'" y2="'+my.toFixed(1)+'" stroke="#B54728" stroke-width="1" stroke-dasharray="4,3"/>';
    out+='<text x="'+(W-pad.r)+'" y="'+(my-3).toFixed(1)+'" text-anchor="end" font-size="8" fill="#B54728">'+cfg.metaLabel+'</text>';
  }

  // média
  const media = vals.reduce((a,b)=>a+b,0)/vals.length;
  const medy = yx(media);
  out+='<line x1="'+pad.l+'" y1="'+medy.toFixed(1)+'" x2="'+(W-pad.r)+'" y2="'+medy.toFixed(1)+'" stroke="#1C6D96" stroke-width="0.8" stroke-dasharray="2,2" opacity="0.7"/>';

  // barras
  pontos.forEach((p,i)=>{
    const isCur = i===idxCur || i===idxLast;
    const lbl='<text x="'+cx(i).toFixed(1)+'" y="'+(H-pad.b+10).toFixed(1)+'" text-anchor="middle" font-size="7.5" fill="#6B7870">'+mesFmt(p.mes)+'</text>';
    if (p.val===null) { out+=lbl; return; }
    const fill=colorFn(p.val);
    const zeroY=yx(Math.max(minVal,0));
    const valY=yx(p.val);
    const top=Math.min(zeroY,valY);
    const bh=Math.max(0.5,Math.abs(zeroY-valY));
    out+='<rect x="'+(cx(i)-bw/2).toFixed(1)+'" y="'+top.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh.toFixed(1)+'" fill="'+fill+'" opacity="'+(isCur?1:0.5)+'" rx="2"/>';
    out+=lbl;
    // rótulo apenas em pico, mínimo e atual
    const isSpec = i===idxMax || i===idxMin || i===idxCur || i===idxLast;
    if (isSpec) {
      const lblTxt = fmtV(p.val);
      const suffix = i===idxMax&&i!==idxLast?" ↑":i===idxMin&&i!==idxLast?" ↓":"";
      out+='<text x="'+cx(i).toFixed(1)+'" y="'+(top-4).toFixed(1)+'" text-anchor="middle" font-size="9" font-weight="700" fill="'+fill+'">'+lblTxt+suffix+'</text>';
    }
  });

  return '<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;overflow:visible">'+out+'</svg>';
}

// ── KPI cards (tela Visão Geral) ──────────────────────────────
function cardVolume(ag) {
  const meta=metaEfetiva();
  const pm=Math.min(1,ag.nInt/meta);
  const s=st(ag.nInt,meta,meta*.75);
  const lbl=ag.nInt>=meta?"✓ Meta atingida":ag.nInt>=meta*.75?"▲ Quase lá":"✗ Abaixo da meta";
  return '<div class="card" data-s="'+s+'"><div class="card-faixa"></div>'+
    '<div class="card-topo"><h3>1 · Volume</h3><span class="chip" data-s="'+s+'">'+lbl+'</span></div>'+
    '<div class="kpi-valor">'+N0.format(ag.nInt)+'<small>int.</small></div>'+
    '<div class="kpi-sub">'+metaLabel()+'/mês · '+N0.format(ag.pessoasInt)+' pessoas únicas</div>'+
    '<div class="barra-wrap"><div class="barra-track"><div class="barra-fill" style="width:'+(pm*100).toFixed(1)+'%"></div></div>'+
    '<div class="barra-labels"><span>'+N0.format(ag.nInt)+'</span><span>'+metaLabel()+'</span></div></div>'+
    '<dl class="analises">'+
    '<div class="analise-row"><dt>Acessos totais</dt><dd>'+N0.format(ag.total)+'</dd></div>'+
    '<div class="analise-row"><dt>Sem interação</dt><dd class="'+(ag.si/ag.total>.5?"val-cri":ag.si/ag.total>.3?"val-atn":"val-bom")+'">'+pct(ag.total?ag.si/ag.total:0)+'</dd></div>'+
    '</dl></div>';
}
function cardEngajamento(ag) {
  const s=st(ag.engaj,.40,.20);
  return '<div class="card" data-s="'+s+'"><div class="card-faixa"></div>'+
    '<div class="card-topo"><h3>2 · Engajamento</h3><span class="chip" data-s="'+s+'">'+pct(ag.engaj)+'</span></div>'+
    '<div class="kpi-valor">'+pct(ag.engaj)+'<small>taxa</small></div>'+
    '<div class="kpi-sub">Mercado 0–6m: 20–35% · meta ≥ 40%</div>'+
    '<dl class="analises">'+
    '<div class="analise-row"><dt>Pessoas únicas</dt><dd>'+N0.format(ag.pessoasInt)+'</dd></div>'+
    '<div class="analise-row"><dt>Sem interagir</dt><dd>'+N0.format(ag.si)+'</dd></div>'+
    '<div class="analise-row"><dt>Mercado maduro</dt><dd class="val-neu">45–65%</dd></div>'+
    '</dl></div>';
}
function cardIA(ag) {
  return '<div class="card" data-s="bom"><div class="card-faixa"></div>'+
    '<div class="card-topo"><h3>3 · Efetividade IA</h3><span class="chip" data-s="bom">Excepcional</span></div>'+
    '<div class="kpi-valor">99,1%<small>auto</small></div>'+
    '<div class="kpi-sub">Resoluções sem transferência humana</div>'+
    '<dl class="analises">'+
    '<div class="analise-row"><dt>Referência mercado 6m</dt><dd class="val-neu">70–85%</dd></div>'+
    '<div class="analise-row"><dt>Referência mercado 12m+</dt><dd class="val-neu">85–95%</dd></div>'+
    '<div class="analise-row"><dt>Base de conhecimento</dt><dd class="val-bom">Bem calibrada</dd></div>'+
    '</dl></div>';
}
function cardSatisfacao(ag) {
  if (ag.enps===null) return '<div class="card" data-s="nd"><div class="card-faixa"></div><div class="card-topo"><h3>4 · Satisfação</h3><span class="chip" data-s="nd">Sem dado</span></div><div class="kpi-valor">—</div><div class="kpi-sub">Sem pesquisa de NPS no período</div></div>';
  const s=st(ag.enps,50,0);
  return '<div class="card" data-s="'+s+'"><div class="card-faixa"></div>'+
    '<div class="card-topo"><h3>4 · Satisfação</h3><span class="chip" data-s="'+s+'">eNPS '+ag.enps+'</span></div>'+
    '<div class="kpi-valor">'+ag.enps+'<small>eNPS</small></div>'+
    '<div class="kpi-sub">Top 10% de mercado · meta &gt; 50</div>'+
    '<dl class="analises">'+
    '<div class="analise-row"><dt>Promotores</dt><dd class="val-bom">'+ag.prom+' ('+pct(ag.totalNPS?ag.prom/ag.totalNPS:0)+')</dd></div>'+
    '<div class="analise-row"><dt>Neutros</dt><dd>'+ag.neut+'</dd></div>'+
    '<div class="analise-row"><dt>Detratores</dt><dd class="val-cri">'+ag.det+'</dd></div>'+
    '</dl></div>';
}
function cardCobertura(ag) {
  const tot=11;
  const s=st(ag.dirsAtivas,8,5);
  const topT=ag.topTemas[0]?ag.topTemas[0][0]:"—";
  return '<div class="card" data-s="'+s+'"><div class="card-faixa"></div>'+
    '<div class="card-topo"><h3>5 · Cobertura</h3><span class="chip" data-s="'+s+'">'+ag.dirsAtivas+'/'+tot+' dirs.</span></div>'+
    '<div class="kpi-valor">'+ag.dirsAtivas+'<small>dirs.</small></div>'+
    '<div class="kpi-sub">'+ag.nTemasInt+' temas · top: '+(topT.length>28?topT.slice(0,26)+"…":topT)+'</div>'+
    '<dl class="analises">'+
    '<div class="analise-row"><dt>Temas de interação</dt><dd>'+ag.nTemasInt+'</dd></div>'+
    '<div class="analise-row"><dt>Dirs. sem uso</dt><dd class="'+(tot-ag.dirsAtivas>3?"val-cri":"val-atn")+'">'+( tot-ag.dirsAtivas)+'</dd></div>'+
    '</dl></div>';
}

// ── tela Canal: temas ─────────────────────────────────────────
function renderTemas(ag) {
  const top = ag.topTemas.slice(0,10);
  const maxV = top[0]?top[0][1]:1;
  const lblSI = E.comSI?" (incl. SI)":"";
  const title = ag.temaFiltro?"Temas — comparação":"Top temas"+lblSI;
  let itens = top.map(([nome,v])=>{
    const pBar=(v/maxV*100).toFixed(1);
    const nm=nome.length>32?nome.slice(0,30)+"…":nome;
    const isSel=ag.temaFiltro&&nome===ag.temaFiltro;
    return '<div class="rank-item'+(isSel?" sel":"")+'">'+
      '<div class="rank-nome-wrap">'+
        '<span class="rank-nome">'+nm+'</span>'+
        '<div class="rank-barra"><i style="width:'+pBar+'%'+(isSel?';background:var(--c-azul)':'')+'"></i></div>'+
      '</div>'+
      '<span class="rank-val">'+N0.format(v)+'</span>'+
    '</div>';
  }).join("");
  const card = document.getElementById("card-temas");
  card.innerHTML = '<div class="card-faixa"></div>'+
    '<div class="card-topo"><h3>'+title+'</h3><span class="chip" data-s="nd">'+ag.topTemas.length+' temas</span></div>'+
    '<div class="rank-list">'+itens+'</div>';
}

// ── tela Org: turno ──────────────────────────────────────────
function renderTurno(ag) {
  const total=Object.values(ag.turnoCnt).reduce((a,b)=>a+b,0);
  const ord=Object.entries(ag.turnoCnt).sort((a,b)=>b[1]-a[1]);
  const maxV=ord[0]?ord[0][1]:1;
  const temaLbl=ag.temaFiltro?" · "+(ag.temaFiltro.length>20?ag.temaFiltro.slice(0,18)+"…":ag.temaFiltro):"";
  const itens=ord.map(([t,v])=>{
    const p=total?v/total:0;
    const pBar=(v/maxV*100).toFixed(1);
    return '<div class="org-item">'+
      '<span class="org-nome">'+t+'</span>'+
      '<div class="org-barra"><i style="width:'+pBar+'%;background:var(--c-verde-l)"></i></div>'+
      '<span class="org-val">'+N0.format(v)+' <span class="org-pct">('+pct(p)+')</span></span>'+
    '</div>';
  }).join("");
  document.getElementById("card-turno").innerHTML =
    '<div class="card-faixa" style="background:var(--c-verde-l)"></div>'+
    '<div class="card-topo"><h3>Por turno'+temaLbl+'</h3><span class="chip" data-s="nd">'+N0.format(total)+' int.</span></div>'+
    '<div class="org-list">'+itens+'</div>';
}

// ── tela Org: diretoria / área (drill-down) ──────────────────
function renderDir(ag) {
  const card = document.getElementById("card-dir");
  const temaLbl=ag.temaFiltro?" · "+(ag.temaFiltro.length>20?ag.temaFiltro.slice(0,18)+"…":ag.temaFiltro):"";

  if (E.dir) {
    // drill-down: mostrar áreas dentro da diretoria selecionada
    const entries=Object.entries(ag.areaCnt)
      .filter(([a])=>a!=="Não informada"||Object.keys(ag.areaCnt).length===1)
      .sort((a,b)=>b[1]-a[1]);
    const total=entries.reduce((s,[,v])=>s+v,0);
    const maxV=entries[0]?entries[0][1]:1;
    const itens=entries.map(([a,v])=>{
      const p=total?v/total:0;
      const pBar=(v/maxV*100).toFixed(1);
      const nm=a.length>30?a.slice(0,28)+"…":a;
      return '<div class="org-item">'+
        '<span class="org-nome" title="'+a+'">'+nm+'</span>'+
        '<div class="org-barra"><i style="width:'+pBar+'%;background:var(--c-azul)"></i></div>'+
        '<span class="org-val">'+N0.format(v)+' <span class="org-pct">('+pct(p)+')</span></span>'+
      '</div>';
    }).join("");
    card.innerHTML =
      '<div class="card-faixa" style="background:var(--c-azul)"></div>'+
      '<div class="drill-label">📍 '+E.dir+' — <span onclick="voltarDir()">↩ ver todas as dirs.</span></div>'+
      '<div class="card-topo"><h3>Por área'+temaLbl+'</h3><span class="chip" data-s="nd">'+N0.format(total)+' int.</span></div>'+
      '<div class="org-list">'+itens+'</div>';
  } else {
    // lista de diretorias
    const ord=Object.entries(ag.dirCnt)
      .filter(([d])=>d!=="Não identificado")
      .sort((a,b)=>b[1]-a[1]).slice(0,10);
    const total=ord.reduce((s,[,v])=>s+v,0);
    const maxV=ord[0]?ord[0][1]:1;
    const itens=ord.map(([d,v])=>{
      const p=total?v/total:0;
      const pBar=(v/maxV*100).toFixed(1);
      const nm=d.length>30?d.slice(0,28)+"…":d;
      return '<div class="org-item" style="cursor:pointer" data-dir="'+d.replace(/"/g,'&quot;')+'" onclick="drillDir(this.dataset.dir)" title="Clique para ver áreas de '+d+'">'+
        '<span class="org-nome">'+nm+'</span>'+
        '<div class="org-barra"><i style="width:'+pBar+'%;background:var(--c-azul)"></i></div>'+
        '<span class="org-val">'+N0.format(v)+' <span class="org-pct">('+pct(p)+')</span></span>'+
      '</div>';
    }).join("");
    card.innerHTML =
      '<div class="card-faixa" style="background:var(--c-azul)"></div>'+
      '<div class="card-topo"><h3>Por diretoria'+temaLbl+'</h3><span class="chip" data-s="nd">'+N0.format(total)+' int.</span></div>'+
      '<div style="font-size:12px;color:var(--c-ink3);margin-bottom:8px">Clique em uma diretoria para ver o detalhamento por área ↓</div>'+
      '<div class="org-list">'+itens+'</div>';
  }
}

function drillDir(dir) {
  // selecionar diretoria no filtro e re-renderizar
  const sel=document.getElementById("f-dir");
  sel.value=dir;
  E.dir=dir; E.area=""; E.tema="";
  popularFiltros();
  render();
}
function voltarDir() {
  const sel=document.getElementById("f-dir");
  sel.value="";
  E.dir=""; E.area=""; E.tema="";
  popularFiltros();
  render();
}

// ── tela Tendências ───────────────────────────────────────────
function renderTendencias() {
  const td=calcularTendencias(E.tema);
  const comTema=!!E.tema;
  const list=document.getElementById("trend-list");

  const kpis=[
    {
      id:"vol", title:"1 · Volume", faixa:"var(--c-verde)",
      pontos:td.map(p=>({mes:p.mes,val:p.nInt})),
      metaV:comTema?null:metaEfetiva(), metaLabel:metaLabel(),
      colorFn:comTema?()=>"#1C6D96":v=>{const m=metaEfetiva();return v>=m?"#00694A":v>=m*.75?"#877C00":"#B54728";},
      fmtV:v=>v>=1000?N0.format(v):String(v),
      stat:comTema?"Buscas pelo tema por mês":"Meta: "+metaLabel()+" int./mês",
      chipFn:v=>{if(v==null)return"nd";const m=metaEfetiva();return v>=m?"bom":v>=m*.75?"atencao":"critico";},
    },
    {
      id:"eng", title:comTema?"2 · Participação":"2 · Engajamento", faixa:"var(--c-verde)",
      pontos:td.map(p=>({mes:p.mes,val:p.engaj})),
      metaV:comTema?null:0.4, metaLabel:"meta 40%",
      colorFn:comTema?()=>"#1C6D96":v=>v>=.4?"#00694A":v>=.2?"#877C00":"#B54728",
      fmtV:v=>pct(v),
      stat:comTema?"% das interações sobre este tema":"Meta: ≥ 40% · mercado 0–6m: 20–35%",
      chipFn:comTema?()=>"nd":v=>v>=.4?"bom":v>=.2?"atencao":"critico",
    },
    {
      id:"ia", title:"3 · Efetividade IA", faixa:"var(--c-verde)",
      pontos:td.map(p=>({mes:p.mes,val:.991})),
      metaV:.85, metaLabel:"ref 85%",
      colorFn:()=>"#00694A",
      fmtV:()=>"99,1%",
      stat:"Referência mercado 12m+: 85–95%",
      chipFn:()=>"bom",
    },
    {
      id:"nps", title:"4 · Satisfação (eNPS)", faixa:"var(--c-azul)",
      pontos:td.map(p=>({mes:p.mes,val:p.enps})),
      minVal:-100, metaV:50, metaLabel:"meta 50",
      colorFn:v=>v>=50?"#00694A":v>=0?"#877C00":"#B54728",
      fmtV:v=>String(v),
      stat:comTema?"eNPS do tema · meta > 50":"eNPS · meta > 50 · top 10% mercado",
      chipFn:v=>v==null?"nd":v>=50?"bom":v>=0?"atencao":"critico",
    },
    {
      id:"cob", title:"5 · Cobertura", faixa:"var(--c-azul)",
      pontos:td.map(p=>({mes:p.mes,val:p.dirsAtivas})),
      metaV:comTema?5:8, metaLabel:"meta "+(comTema?5:8),
      colorFn:comTema?v=>v>=5?"#00694A":v>=3?"#877C00":"#B54728"
                     :v=>v>=8?"#00694A":v>=5?"#877C00":"#B54728",
      fmtV:v=>String(v),
      stat:comTema?"Dirs. usando este tema (de 11)":"Dirs. ativas de 11 · meta ≥ 8",
      chipFn:comTema?v=>v>=5?"bom":v>=3?"atencao":"critico"
                   :v=>v>=8?"bom":v>=5?"atencao":"critico",
    },
  ];

  list.innerHTML = kpis.map(k => {
    const vals=k.pontos.map(p=>p.val).filter(v=>v!==null);
    const last=vals.length?vals[vals.length-1]:null;
    const prev=vals.length>=2?vals[vals.length-2]:last;
    const media=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
    const chip=k.chipFn(last);
    const delta=last!=null&&prev!=null?last-prev:0;
    const thr=Math.max(Math.abs((media||0)*.04),.5);
    const arrow=last==null?"—":delta>thr?"↑":delta<-thr?"↓":"→";
    const mediaStr=media!=null?k.fmtV(media):"—";
    const svg=trendBarSVG(k.pontos,k);
    return '<div class="trend-row"><div class="card-faixa" style="background:'+k.faixa+'"></div>'+
      '<div class="trend-header">'+
        '<h3>'+k.title+'</h3>'+
        '<span class="chip" data-s="'+chip+'">'+arrow+' méd '+mediaStr+'</span>'+
        '<span class="trend-meta">'+k.stat+'</span>'+
      '</div>'+
      '<div class="trend-chart">'+svg+'</div>'+
    '</div>';
  }).join("");
}

// ── tela Diário ───────────────────────────────────────────────
function calcularDiario() {
  if (!E.mes) return { days:[], daysInMonth:0, total:0, peak:0, peakDay:"", avg:0, aboveMeta:0, dailyMeta:0 };
  const rows = filtrar(); // já filtra por mes/dir/area
  const [ano, mesNum] = E.mes.split("-").map(Number);
  const daysInMonth = new Date(ano, mesNum, 0).getDate();
  const counts = {};
  rows.forEach(r => {
    const d = LOOKUP.data ? LOOKUP.data[r[F_DATA]] : null;
    if (d) counts[d] = (counts[d]||0) + 1;
  });
  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dd = String(d).padStart(2,"0");
    const key = E.mes+"-"+dd;
    days.push({ date:key, day:d, count:counts[key]||0 });
  }
  const total = days.reduce((a,b)=>a+b.count,0);
  const meta = metaEfetiva();
  const dailyMeta = meta / daysInMonth;
  const peakCount = Math.max(...days.map(d=>d.count), 0);
  const peakDay = days.find(d=>d.count===peakCount) || null;
  const avg = total / daysInMonth;
  const aboveMeta = days.filter(d=>d.count>=dailyMeta).length;
  return { days, daysInMonth, total, peak:peakCount, peakDay:peakDay?peakDay.date:"", avg, aboveMeta, dailyMeta };
}

function drawDiarioChart(days, daysInMonth, dailyMeta, avg) {
  const svg = document.getElementById("diario-svg");
  const minW = Math.max(600, daysInMonth * 28);
  svg.style.minWidth = minW+"px";
  const W = minW, H = 220;
  const pad = { t:38, r:20, b:44, l:38 };
  const cw = W-pad.l-pad.r, ch = H-pad.t-pad.b;
  const maxV = Math.max(dailyMeta*2, avg*2, ...days.map(d=>d.count), 1);
  const bw = Math.max(12, Math.min(34, (cw/daysInMonth)*0.65));
  const yx = v => H-pad.b-(v/maxV)*ch;
  const cx = i => pad.l+(i+0.5)*(cw/daysInMonth);

  const campsMes = (CAMPANHAS||[]).filter(c=>c.data&&c.data.startsWith(E.mes));
  const campMap = {};
  campsMes.forEach(c=>{ campMap[c.data]=(campMap[c.data]||[]); campMap[c.data].push(c); });

  let out = "";

  // grade horizontal sutil com labels eixo Y
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f=>Math.round(maxV*f));
  ticks.forEach(v=>{
    const y = yx(v);
    out += '<line x1="'+pad.l+'" y1="'+y.toFixed(1)+'" x2="'+(W-pad.r)+'" y2="'+y.toFixed(1)+'" stroke="#E2E7DF" stroke-width="1"/>';
    out += '<text x="'+(pad.l-6)+'" y="'+(y+3.5).toFixed(1)+'" text-anchor="end" font-size="9" fill="#9BAD9A">'+N0.format(v)+'</text>';
  });

  // linhas verticais de campanhas (fundo)
  campsMes.forEach((c,ci)=>{
    const x = cx(parseInt(c.data.slice(8),10)-1);
    out += '<line x1="'+x.toFixed(1)+'" y1="'+pad.t+'" x2="'+x.toFixed(1)+'" y2="'+(H-pad.b)+'" stroke="'+c.cor+'" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.65"/>';
  });

  // barras
  days.forEach((d,i)=>{
    const fill = d.count>=dailyMeta?"#00694A":d.count>=dailyMeta*.5?"#877C00":"#B54728";
    const x = cx(i)-bw/2;
    const y = yx(d.count);
    const bh = Math.max(1,H-pad.b-y);
    out += '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh.toFixed(1)+'" fill="'+fill+'" rx="3"/>';
    // rótulo valor: exibir em campanhas, pico e barras altas
    const isCamp = !!campMap[d.date];
    const isPeak = d.count===Math.max(...days.map(x=>x.count)) && d.count>0;
    if (d.count>0 && (isPeak||isCamp||d.count>=avg*1.25)) {
      out += '<text x="'+cx(i).toFixed(1)+'" y="'+(y-4).toFixed(1)+'" text-anchor="middle" font-size="9" font-weight="700" fill="'+fill+'">'+d.count+'</text>';
    }
    // eixo X — dia (a cada 5 dias + dia 1 + campanhas)
    if (d.day===1||d.day%5===0||d.day===daysInMonth||isCamp) {
      out += '<text x="'+cx(i).toFixed(1)+'" y="'+(H-pad.b+13).toFixed(1)+'" text-anchor="middle" font-size="9" fill="'+(isCamp?"#6B7870":"#9BAD9A")+'">'+d.day+'</text>';
    }
  });

  // rótulos de campanha no topo
  campsMes.forEach((c,ci)=>{
    const x = cx(parseInt(c.data.slice(8),10)-1);
    const labelY = (pad.t-6-(ci%2)*13).toFixed(1);
    out += '<text x="'+x.toFixed(1)+'" y="'+labelY+'" text-anchor="middle" font-size="8.5" font-weight="700" fill="'+c.cor+'">'+c.nome.slice(0,18)+'</text>';
    out += '<circle cx="'+x.toFixed(1)+'" cy="'+(H-pad.b)+'" r="3.5" fill="'+c.cor+'"/>';
  });

  // linha alvo diário
  const ty = yx(dailyMeta);
  out += '<line x1="'+pad.l+'" y1="'+ty.toFixed(1)+'" x2="'+(W-pad.r)+'" y2="'+ty.toFixed(1)+'" stroke="#B54728" stroke-width="1.5" stroke-dasharray="5,3"/>';
  out += '<text x="'+(W-pad.r-2)+'" y="'+(ty-4).toFixed(1)+'" text-anchor="end" font-size="9" font-weight="700" fill="#B54728">alvo '+dailyMeta.toFixed(0)+'/dia</text>';

  // linha média
  const ay = yx(avg);
  out += '<line x1="'+pad.l+'" y1="'+ay.toFixed(1)+'" x2="'+(W-pad.r)+'" y2="'+ay.toFixed(1)+'" stroke="#1C6D96" stroke-width="1.2" stroke-dasharray="3,3" opacity="0.8"/>';
  out += '<text x="'+(pad.l+4)+'" y="'+(ay-4).toFixed(1)+'" text-anchor="start" font-size="9" fill="#1C6D96">méd '+avg.toFixed(0)+'/dia</text>';

  svg.setAttribute("viewBox","0 0 "+W+" "+H);
  svg.setAttribute("height",H);
  svg.innerHTML = out;
}

function renderDiario() {
  if (!E.mes) {
    document.getElementById("diario-header").innerHTML = '<p style="color:var(--c-ink3);font-size:14px;padding:8px 0">Selecione um mês para ver o acompanhamento diário.</p>';
    document.getElementById("diario-chip").textContent=""; document.getElementById("diario-chip").dataset.s="nd";
    document.getElementById("diario-faixa").style.background="var(--c-ink3)";
    document.getElementById("diario-svg").innerHTML="";
    document.getElementById("camp-legend").innerHTML="";
    return;
  }
  const { days, daysInMonth, total, peak, peakDay, avg, aboveMeta, dailyMeta } = calcularDiario();
  const meta = metaEfetiva();
  const s = st(total, meta, meta*.75);
  const colors = { bom:"var(--c-verde)", atencao:"var(--c-amarelo)", critico:"var(--c-cri)", nd:"var(--c-ink3)" };

  document.getElementById("diario-faixa").style.background = colors[s]||colors.nd;
  document.getElementById("diario-chip").dataset.s = s;
  document.getElementById("diario-chip").textContent = total>=meta?"✓ Meta atingida":total>=meta*.75?"▲ Quase lá":"✗ Abaixo da meta";
  document.getElementById("diario-titulo").textContent = "Acessos por dia — "+mesFmt(E.mes);

  const peakDayFmt = peakDay ? peakDay.slice(8)+"/"+peakDay.slice(5,7) : "—";
  const pctAcima = daysInMonth ? Math.round(aboveMeta/daysInMonth*100) : 0;
  document.getElementById("diario-header").innerHTML =
    '<div class="kpi-diario"><h4>Total do mês</h4><div class="val">'+N0.format(total)+'<small>int.</small></div><div class="sub">'+metaLabel()+'</div></div>'+
    '<div class="kpi-diario"><h4>Pico diário</h4><div class="val">'+N0.format(peak)+'<small>dia '+peakDayFmt+'</small></div><div class="sub">dia de maior volume</div></div>'+
    '<div class="kpi-diario"><h4>Média / dia</h4><div class="val">'+Math.round(avg)+'<small>int.</small></div><div class="sub">alvo '+Math.round(dailyMeta)+'/dia</div></div>'+
    '<div class="kpi-diario"><h4>Dias ≥ alvo</h4><div class="val">'+aboveMeta+'<small>/'+daysInMonth+'</small></div><div class="sub">'+pctAcima+'% dos dias do mês</div></div>';

  drawDiarioChart(days, daysInMonth, dailyMeta, avg);

  // legenda campanhas do mês
  const campsMes = (CAMPANHAS||[]).filter(c=>c.data&&c.data.startsWith(E.mes));
  document.getElementById("camp-legend").innerHTML = campsMes.length
    ? '<p style="font-size:11px;font-weight:700;color:var(--c-ink3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Campanhas do mês</p>'+
      campsMes.map(c=>'<div class="camp-pill" style="border-color:'+c.cor+';color:'+c.cor+'">'+
        '<div class="camp-dot" style="background:'+c.cor+'"></div>'+
        c.data.slice(8)+'/'+c.data.slice(5,7)+' · <strong>'+c.nome+'</strong> · '+c.canal+
      '</div>').join("")
    : '<p style="font-size:12px;color:var(--c-ink3)">Nenhuma campanha registrada para este mês. Edite <code>dados/campanhas.json</code> para adicionar.</p>';
}

// ── render principal ──────────────────────────────────────────
function render() {
  const linhas=filtrar();
  const ag=calcular(linhas);

  // cabeçalho
  const recorte=[E.dir,E.area,E.tema?("tema: "+E.tema):""].filter(Boolean).join(" › ")||"Consolidado";
  const perLabel=E.mes?mesFmt(E.mes):"Todo o período";
  document.getElementById("cab-sub").textContent=perLabel+" · "+recorte;
  document.getElementById("cab-data").textContent=new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"});
  document.getElementById("regua").textContent=N0.format(linhas.length)+" registros"+(E.comSI?"":" (sem SI)");

  // tela Visão Geral
  document.getElementById("kpi-grid").innerHTML=
    cardVolume(ag)+cardEngajamento(ag)+cardIA(ag)+cardSatisfacao(ag)+cardCobertura(ag);

  // tela Canal
  drawCanalChart(ag.mesIntCnt);
  renderTemas(ag);

  // tela Org
  renderTurno(ag);
  renderDir(ag);

  // tela Tendências
  renderTendencias();

  // tela Diário
  renderDiario();
}

// ── navegação de abas ─────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    const tela=btn.dataset.tab;
    E.tela=tela;
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.toggle("ativo",b===btn));
    document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("ativa",s.id==="screen-"+tela));
    if (tela==="canal") setTimeout(()=>{ drawCanalChart(calcular(filtrar()).mesIntCnt); },50);
    if (tela==="diario") setTimeout(()=>{ renderDiario(); },50);
  });
});

// ── filtros ───────────────────────────────────────────────────
function opcoes(sel,itens,val,rot){
  sel.textContent="";
  sel.appendChild(new Option(rot,""));
  itens.forEach(v=>v&&sel.appendChild(new Option(v,v)));
  sel.value=itens.includes(val)?val:"";
}
function popularTemas(){
  const l=filtrar();
  const ts=[...new Set(l.filter(r=>r[F_TEMA]!==IDX_SI).map(r=>LOOKUP.tema[r[F_TEMA]]))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
  const fT=document.getElementById("f-tema");
  opcoes(fT,ts,E.tema,"Todos os temas");
  E.tema=fT.value;
}
function popularFiltros(){
  const meses=[...new Set(DATA.filter(r=>r[F_TEMA]!==IDX_SI).map(r=>LOOKUP.mes[r[F_MES]]))].sort((a,b)=>b.localeCompare(a));
  const fM=document.getElementById("f-mes");
  fM.textContent="";
  fM.appendChild(new Option("Todo o período",""));
  meses.forEach(m=>fM.appendChild(new Option(mesFmt(m),m)));
  fM.value=E.mes&&meses.includes(E.mes)?E.mes:(meses[0]||"");
  E.mes=fM.value;

  const di=E.dir?LOOKUP.dir.indexOf(E.dir):-1;
  const dirs=[...new Set(DATA.filter(r=>r[F_TEMA]!==IDX_SI&&r[F_DIR]!==IDX_DIR_VAZIO).map(r=>LOOKUP.dir[r[F_DIR]]))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
  opcoes(document.getElementById("f-dir"),dirs,E.dir,"Todas as diretorias");
  E.dir=document.getElementById("f-dir").value;

  const areas=[...new Set(DATA.filter(r=>r[F_TEMA]!==IDX_SI&&r[F_AREA]!==IDX_AREA_VAZIA&&(di<0||r[F_DIR]===di)).map(r=>LOOKUP.area[r[F_AREA]]))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
  opcoes(document.getElementById("f-area"),areas,E.area,"Todas as áreas");
  E.area=document.getElementById("f-area").value;

  popularTemas();
}

document.getElementById("f-mes").addEventListener("change",e=>{E.mes=e.target.value;E.tema="";popularTemas();render();});
document.getElementById("f-dir").addEventListener("change",e=>{E.dir=e.target.value;E.area="";E.tema="";popularFiltros();render();});
document.getElementById("f-area").addEventListener("change",e=>{E.area=e.target.value;E.tema="";popularTemas();render();});
document.getElementById("f-tema").addEventListener("change",e=>{E.tema=e.target.value;render();});
document.getElementById("toggle-si").addEventListener("change",e=>{E.comSI=e.target.checked;render();});

// re-renderizar gráfico canal quando janela redimensiona
window.addEventListener("resize",()=>{
  if(E.tela==="canal"||E.tela==="geral") render();
});

// ── init ──────────────────────────────────────────────────────
popularFiltros();
render();
</script>
</body>
</html>`;

const saida = resolve(raiz, "painel", "chatbot-rh.html");
writeFileSync(saida, html);
console.log(`ok — painel/chatbot-rh.html gerado (${(html.length / 1024).toFixed(0)} KB)`);
