#!/usr/bin/env node
/**
 * Apura os KPIs fora do navegador, usando exatamente as mesmas regras do painel.
 *
 * Serve para dois propositos:
 *   1. conferir o painel contra o BI / a planilha oficial;
 *   2. gerar a lista de valores que sustenta os comentarios de cada semana.
 *
 *   node tools/apurar.mjs                          # consolidado, todas as lentes
 *   node tools/apurar.mjs --lente mes
 *   node tools/apurar.mjs --empresa "Empresa Gama"
 *   node tools/apurar.mjs --area "Central de Atendimento" --lente mes
 *   node tools/apurar.mjs --por area --kpi turnover_vol --lente mes
 *   node tools/apurar.mjs --json
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const D = JSON.parse(readFileSync(join(raiz, "dados.json"), "utf8"));

/* ---------------- argumentos ---------------- */
const arg = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith("--")) continue;
  const k = a.slice(2);
  arg[k] = process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[++i] : true;
}

/* ---------------- índices ---------------- */
const SEM = D.semanas;
const IW = new Map(SEM.map((s, i) => [s.id, i]));
const SEG = D.segmentos.linhas.map((l) => ({ empresa: l[0], diretoria: l[1], area: l[2] }));
const MET = D.metricas;
const I_HC = MET.indexOf("hc_fim");
const R = IW.get(D.meta.semanaReferencia);
const REF = SEM[R];
const SEMANAS_MES = 52 / 12;

function montarMatriz(f) {
  const mat = Array.from({ length: SEM.length }, () => new Float64Array(MET.length));
  const ok = SEG.map(
    (s) => (!f.empresa || s.empresa === f.empresa) && (!f.diretoria || s.diretoria === f.diretoria) && (!f.area || s.area === f.area)
  );
  for (const l of D.fatos.linhas) {
    if (!ok[l[0]]) continue;
    const alvo = mat[IW.get(l[1])];
    for (let k = 0; k < MET.length; k++) alvo[k] += l[2 + k];
  }
  return mat;
}

function agregar(mat, idxs) {
  if (!idxs || !idxs.length) return null;
  const soma = {}, ultimo = {};
  const fim = mat[idxs[idxs.length - 1]];
  MET.forEach((m, k) => {
    let s = 0;
    for (const i of idxs) s += mat[i][k];
    soma[m] = s;
    ultimo[m] = fim[k];
  });
  let hc = 0;
  for (const i of idxs) hc += mat[i][I_HC];
  return { soma, ultimo, hcMedio: hc / idxs.length || null, semanas: idxs.length };
}

const cache = new Map();
const compilar = (e) => (cache.has(e) ? cache.get(e) : (cache.set(e, new Function("a", `return (${e});`)), cache.get(e)));

function valorKpi(kpi, a) {
  if (!a) return null;
  try {
    let v = compilar(kpi.formula)(a);
    if (!Number.isFinite(v)) return null;
    if (kpi.escala === "periodo") v *= SEMANAS_MES / a.semanas;
    return v;
  } catch {
    return null;
  }
}
function resolverPorRecorte(mapa, f) {
  if (!mapa) return null;
  const chaves = [];
  if (f.empresa && f.diretoria && f.area) chaves.push(`${f.empresa} > ${f.diretoria} > ${f.area}`);
  if (f.empresa && f.diretoria) chaves.push(`${f.empresa} > ${f.diretoria}`);
  if (f.empresa) chaves.push(f.empresa);
  chaves.push("*");
  for (const k of chaves) if (mapa[k] !== undefined) return { chave: k, valor: mapa[k] };
  return null;
}
function metaKpi(kpi, a, filtro) {
  if (!a) return null;
  if (kpi.metas) {
    const achado = resolverPorRecorte(kpi.metas, filtro || {});
    if (achado) {
      if (typeof achado.valor === "number") return achado.valor;
      try { const v = compilar(achado.valor)(a); return Number.isFinite(v) ? v : null; } catch { return null; }
    }
  }
  if (kpi.metaFormula) { try { const v = compilar(kpi.metaFormula)(a); return Number.isFinite(v) ? v : null; } catch { return null; } }
  if (kpi.metaMes != null) return kpi.metaMes;
  return kpi.meta != null ? kpi.meta : null;
}
function farol(kpi, valor, meta) {
  if (valor == null || meta == null || meta === 0) return "nd";
  const d = (valor - meta) / Math.abs(meta);
  const ex = kpi.direcao === "menor" ? d : kpi.direcao === "maior" ? -d : Math.abs(d) - (kpi.tolerancia || 0);
  return ex <= 0 ? "bom" : ex <= (kpi.limite != null ? kpi.limite : 0.1) ? "atencao" : "critico";
}

/* ---------------- janelas ---------------- */
const semanasDoMes = (mes) => SEM.reduce((a, s, i) => (s.mes === mes ? (a.push(i), a) : a), []);
function mesAnterior(mes) {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
const mesAnoAnterior = (m) => `${+m.slice(0, 4) - 1}-${m.slice(5)}`;
const ytd = (ano, ate) => SEM.reduce((a, s, i) => (s.ano === ano && s.semana <= ate ? (a.push(i), a) : a), []);
const janelaMes = semanasDoMes(REF.mes).filter((i) => i <= R);
const kMes = janelaMes.length;

const LENTES = {
  semana: {
    rotulo: `Semana ${REF.semana}/${REF.ano} (${REF.inicio} a ${REF.fim})`,
    atual: [R],
    anterior: { rotulo: `S${SEM[R - 1].semana}`, idxs: [R - 1] },
    anoAnt: { rotulo: `S${REF.semana}/${REF.ano - 1}`, idxs: IW.has(`${REF.ano - 1}-W${String(REF.semana).padStart(2, "0")}`) ? [IW.get(`${REF.ano - 1}-W${String(REF.semana).padStart(2, "0")}`)] : null },
  },
  mes: {
    rotulo: `${REF.mes} até a S${REF.semana} (${kMes} semanas)`,
    atual: janelaMes,
    anterior: { rotulo: mesAnterior(REF.mes), idxs: semanasDoMes(mesAnterior(REF.mes)).slice(0, kMes) },
    anoAnt: { rotulo: mesAnoAnterior(REF.mes), idxs: semanasDoMes(mesAnoAnterior(REF.mes)).slice(0, kMes) },
  },
  ano: {
    rotulo: `${REF.ano} acumulado até a S${REF.semana}`,
    atual: ytd(REF.ano, REF.semana),
    anterior: { rotulo: `${REF.ano - 1} fechado`, idxs: SEM.reduce((a, s, i) => (s.ano === REF.ano - 1 ? (a.push(i), a) : a), []) },
    anoAnt: { rotulo: `${REF.ano - 1} acum.`, idxs: ytd(REF.ano - 1, REF.semana) },
  },
};

/* ---------------- saída ---------------- */
const fmt = (kpi, v) =>
  v == null ? "—" : (kpi.unidade === "R$" ? "R$ " : "") + v.toLocaleString("pt-BR", { minimumFractionDigits: kpi.casas, maximumFractionDigits: kpi.casas }) + (kpi.unidade === "%" ? "%" : "");
const MARCA = { bom: "verde  ", atencao: "amarelo", critico: "VERMELHO", nd: "n/d    " };

function apurar(filtro, lente) {
  const mat = montarMatriz(filtro);
  const L = LENTES[lente];
  return D.kpis.map((kpi) => {
    const a = agregar(mat, L.atual);
    const valor = valorKpi(kpi, a), meta = metaKpi(kpi, a, filtro);
    const aAnt = agregar(mat, L.anterior.idxs), aAA = agregar(mat, L.anoAnt.idxs);
    return {
      id: kpi.id, nome: kpi.nome, unidade: kpi.unidade, casas: kpi.casas,
      valor, meta, farol: farol(kpi, valor, meta),
      anterior: valorKpi(kpi, aAnt), rotAnterior: L.anterior.rotulo,
      anoAnt: valorKpi(kpi, aAA), rotAnoAnt: L.anoAnt.rotulo,
      kpi,
    };
  });
}

const filtro = { empresa: arg.empresa || "", diretoria: arg.diretoria || "", area: arg.area || "" };
const lentes = arg.lente ? [arg.lente] : ["semana", "mes", "ano"];
const recorte = [filtro.empresa, filtro.diretoria, filtro.area].filter(Boolean).join(" > ") || "Consolidado";

if (arg.por) {
  /* Comparação de um KPI entre segmentos de uma dimensão */
  const dim = arg.por;
  const lente = arg.lente || "mes";
  const valores = [...new Set(SEG.map((s) => s[dim]))].sort();
  const alvo = arg.kpi;
  console.log(`\n${LENTES[lente].rotulo} — por ${dim}${alvo ? " — " + alvo : ""}\n`);
  for (const v of valores) {
    const linhas = apurar({ ...filtro, [dim]: v }, lente).filter((r) => !alvo || r.id === alvo);
    for (const r of linhas) {
      const vsAA = r.valor != null && r.anoAnt != null ? ((r.valor / r.anoAnt - 1) * 100).toFixed(1).replace(".", ",") + "%" : "—";
      console.log(`  ${MARCA[r.farol]}  ${v.padEnd(24)} ${fmt(r.kpi, r.valor).padStart(12)}  meta ${fmt(r.kpi, r.meta).padStart(10)}  vs ${r.rotAnoAnt}: ${vsAA.padStart(8)}${alvo ? "" : "  " + r.nome}`);
    }
  }
  console.log();
} else if (arg.json) {
  console.log(JSON.stringify(Object.fromEntries(lentes.map((l) => [l, apurar(filtro, l).map(({ kpi, ...r }) => r)])), null, 1));
} else {
  for (const lente of lentes) {
    console.log(`\n${recorte} — ${LENTES[lente].rotulo}\n`);
    for (const r of apurar(filtro, lente)) {
      const d = (b) => (r.valor != null && b != null ? (r.valor - b >= 0 ? "+" : "−") + Math.abs(((r.valor / b - 1) * 100)).toFixed(1).replace(".", ",") + "%" : "—");
      console.log(
        `  ${MARCA[r.farol]}  ${r.nome.padEnd(32)} ${fmt(r.kpi, r.valor).padStart(12)}` +
          `  meta ${fmt(r.kpi, r.meta).padStart(11)}` +
          `  ${r.rotAnterior}: ${fmt(r.kpi, r.anterior).padStart(11)} (${d(r.anterior).padStart(7)})` +
          `  ${r.rotAnoAnt}: ${fmt(r.kpi, r.anoAnt).padStart(11)} (${d(r.anoAnt).padStart(7)})`
      );
    }
  }
  console.log();
}
