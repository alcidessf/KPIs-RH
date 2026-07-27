#!/usr/bin/env node
/**
 * Gerador do conjunto de dados de exemplo do Farol de KPIs de RH.
 *
 * Produz `dados.json` na raiz do projeto e injeta o mesmo conteudo dentro do
 * bloco <script id="kpi-dados"> de `index.html`, de forma que o painel continue
 * sendo um unico arquivo auto-contido (abre por file://, GitHub Pages, etc.).
 *
 *   node tools/gerar-dados.mjs
 *
 * Para plugar dados reais, substitua a montagem de `fatos` por uma leitura do
 * seu extrator (CSV/BigQuery/SAP/Protheus). O contrato esta em
 * docs/MODELO-DE-DADOS.md e nao muda.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ------------------------------------------------------------------ *
 * 1. Calendario ISO
 * ------------------------------------------------------------------ */

const DIA = 86400000;

function segundaDaSemanaIso(ano, semana) {
  const jan4 = new Date(Date.UTC(ano, 0, 4));
  const diaSemana = (jan4.getUTCDay() + 6) % 7; // segunda = 0
  const semana1 = new Date(jan4.getTime() - diaSemana * DIA);
  return new Date(semana1.getTime() + (semana - 1) * 7 * DIA);
}

function semanasNoAnoIso(ano) {
  const ultimo = new Date(Date.UTC(ano, 11, 28)); // 28/12 sempre cai na ultima semana ISO
  const jan4 = new Date(Date.UTC(ano, 0, 4));
  const diaSemana = (jan4.getUTCDay() + 6) % 7;
  const semana1 = new Date(jan4.getTime() - diaSemana * DIA);
  return Math.floor((ultimo - semana1) / (7 * DIA)) + 1;
}

const ISO = (d) => d.toISOString().slice(0, 10);

/** Lista de semanas de 2025-W01 ate 2026-W30 (ultima semana fechada em 27/07/2026). */
function montarSemanas() {
  const out = [];
  for (const [ano, ate] of [
    [2025, semanasNoAnoIso(2025)],
    [2026, 30],
  ]) {
    for (let s = 1; s <= ate; s++) {
      const inicio = segundaDaSemanaIso(ano, s);
      const quinta = new Date(inicio.getTime() + 3 * DIA); // mes ISO = mes da quinta-feira
      out.push({
        id: `${ano}-W${String(s).padStart(2, "0")}`,
        ano,
        semana: s,
        inicio: ISO(inicio),
        fim: ISO(new Date(inicio.getTime() + 6 * DIA)),
        mes: `${quinta.getUTCFullYear()}-${String(quinta.getUTCMonth() + 1).padStart(2, "0")}`,
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 2. Estrutura organizacional
 * ------------------------------------------------------------------ */

/**
 * hc      headcount inicial (jan/2025)
 * sal     salario medio mensal com encargos (R$)
 * turn    rotatividade mensal base (fracao do HC)
 * vol     parcela voluntaria da rotatividade
 * abs     absenteismo base (fracao das horas previstas)
 * he      horas extras base (fracao das horas previstas)
 * risco   exposicao a acidentes (0 = administrativo)
 * lid     proporcao de cargos de lideranca
 * lidFem  proporcao de mulheres na lideranca (jan/2025)
 * enps    e-NPS base
 * hist    narrativa de 2026 aplicada sobre a base
 */
const AREAS = [
  { area: "Produção",               diretoria: "Operações",      empresa: "Empresa Alfa", hc: 612, sal: 5200,  turn: 0.018, vol: 0.55, abs: 0.041, he: 0.062, risco: 1.0, lid: 0.055, lidFem: 0.19, enps: 12, hist: "he_alta_seguranca_melhora" },
  { area: "Manutenção",             diretoria: "Operações",      empresa: "Empresa Alfa", hc: 148, sal: 7100,  turn: 0.014, vol: 0.50, abs: 0.036, he: 0.088, risco: 0.9, lid: 0.070, lidFem: 0.12, enps: 8,  hist: "he_alta" },
  { area: "Qualidade",              diretoria: "Operações",      empresa: "Empresa Alfa", hc: 74,  sal: 6800,  turn: 0.011, vol: 0.60, abs: 0.028, he: 0.031, risco: 0.4, lid: 0.095, lidFem: 0.38, enps: 21, hist: "estavel" },
  { area: "Projetos",               diretoria: "Engenharia",     empresa: "Empresa Alfa", hc: 96,  sal: 12400, turn: 0.010, vol: 0.72, abs: 0.017, he: 0.024, risco: 0.2, lid: 0.115, lidFem: 0.26, enps: 27, hist: "estavel" },
  { area: "Vendas Indústria",       diretoria: "Comercial",      empresa: "Empresa Alfa", hc: 118, sal: 9800,  turn: 0.021, vol: 0.66, abs: 0.019, he: 0.014, risco: 0.0, lid: 0.100, lidFem: 0.31, enps: 18, hist: "estavel" },
  { area: "Financeiro",             diretoria: "Administrativo", empresa: "Empresa Alfa", hc: 62,  sal: 10600, turn: 0.009, vol: 0.70, abs: 0.015, he: 0.019, risco: 0.0, lid: 0.130, lidFem: 0.44, enps: 25, hist: "estavel" },
  { area: "Gente & Gestão",         diretoria: "Administrativo", empresa: "Empresa Alfa", hc: 41,  sal: 9700,  turn: 0.008, vol: 0.75, abs: 0.014, he: 0.011, risco: 0.0, lid: 0.145, lidFem: 0.62, enps: 34, hist: "lideranca_fem_sobe" },
  { area: "Loja Centro",            diretoria: "Lojas",          empresa: "Empresa Beta", hc: 214, sal: 3600,  turn: 0.038, vol: 0.62, abs: 0.048, he: 0.043, risco: 0.3, lid: 0.062, lidFem: 0.48, enps: 4,  hist: "turnover_melhora" },
  { area: "Loja Shopping",          diretoria: "Lojas",          empresa: "Empresa Beta", hc: 187, sal: 3550,  turn: 0.042, vol: 0.64, abs: 0.052, he: 0.051, risco: 0.3, lid: 0.060, lidFem: 0.51, enps: 2,  hist: "turnover_melhora" },
  { area: "CD Expedição",           diretoria: "Logística",      empresa: "Empresa Beta", hc: 268, sal: 4100,  turn: 0.029, vol: 0.58, abs: 0.058, he: 0.079, risco: 0.8, lid: 0.048, lidFem: 0.16, enps: 6,  hist: "absenteismo_alto" },
  { area: "Vendas Varejo",          diretoria: "Comercial",      empresa: "Empresa Beta", hc: 88,  sal: 6900,  turn: 0.026, vol: 0.68, abs: 0.022, he: 0.018, risco: 0.0, lid: 0.090, lidFem: 0.42, enps: 15, hist: "estavel" },
  { area: "Desenvolvimento",        diretoria: "Tecnologia",     empresa: "Empresa Gama", hc: 154, sal: 15200, turn: 0.019, vol: 0.84, abs: 0.013, he: 0.021, risco: 0.0, lid: 0.105, lidFem: 0.24, enps: 22, hist: "turnover_vol_piora" },
  { area: "Infraestrutura",         diretoria: "Tecnologia",     empresa: "Empresa Gama", hc: 67,  sal: 13100, turn: 0.015, vol: 0.80, abs: 0.014, he: 0.058, risco: 0.1, lid: 0.110, lidFem: 0.18, enps: 19, hist: "estavel" },
  { area: "Central de Atendimento", diretoria: "Atendimento",    empresa: "Empresa Gama", hc: 342, sal: 3300,  turn: 0.047, vol: 0.71, abs: 0.061, he: 0.036, risco: 0.1, lid: 0.052, lidFem: 0.57, enps: -8, hist: "turnover_vol_piora" },
];

/* ------------------------------------------------------------------ *
 * 3. Simulacao
 * ------------------------------------------------------------------ */

function mulberry32(semente) {
  let a = semente >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ruido suave centrado em 1. */
const ruido = (rnd, amplitude) => 1 + (rnd() - 0.5) * 2 * amplitude;

/** Fator sazonal por mes (1 = janeiro). Ferias/13o inflam ausencia e desligamento. */
const SAZONAL_ABS = [1.18, 1.06, 0.97, 0.95, 0.94, 0.96, 1.02, 0.99, 0.97, 1.0, 1.04, 1.15];
const SAZONAL_TURN = [1.22, 1.12, 1.02, 0.96, 0.93, 0.92, 0.98, 1.0, 1.02, 1.06, 1.1, 1.28];
const SAZONAL_HE = [0.92, 0.96, 1.03, 1.0, 1.02, 1.05, 1.08, 1.06, 1.09, 1.14, 1.22, 1.1];

/**
 * Multiplicadores da narrativa de 2026 (progressao linear ao longo do ano).
 * Retorna fatores aplicados sobre a base de 2025.
 */
function narrativa(hist, ano, progresso) {
  const f = { turn: 1, vol: 1, abs: 1, he: 1, acid: 1, treino: 1, lidFem: 0, enps: 0, tmv: 1 };
  if (ano < 2026) return f;
  const p = progresso; // 0 -> 1 ao longo de 2026
  switch (hist) {
    case "turnover_vol_piora":
      f.turn = 1 + 0.5 * p;
      f.vol = 1 + 0.34 * p;
      f.tmv = 1 + 0.2 * p;
      f.enps = -7 * p;
      break;
    case "turnover_melhora":
      f.turn = 1 - 0.14 * p;
      f.vol = 1 - 0.08 * p;
      f.tmv = 1 - 0.12 * p;
      f.enps = 15 * p;
      break;
    case "absenteismo_alto":
      f.abs = 1 + 0.29 * p;
      f.he = 1 + 0.24 * p;
      f.tmv = 1 - 0.1 * p;
      f.enps = -3 * p;
      break;
    case "he_alta_seguranca_melhora":
      f.he = 1 + 0.31 * p;
      f.acid = 1 - 0.66 * p;
      f.treino = 1 + 0.28 * p;
      f.tmv = 1 - 0.12 * p;
      f.enps = 7 * p;
      break;
    case "he_alta":
      f.he = 1 + 0.27 * p;
      f.acid = 1 - 0.5 * p;
      f.tmv = 1 - 0.12 * p;
      break;
    case "lideranca_fem_sobe":
      f.lidFem = 0.09 * p;
      f.enps = 8 * p;
      f.tmv = 1 - 0.14 * p;
      break;
    default:
      f.enps = 5 * p;
      f.acid = 1 - 0.35 * p;
      f.treino = 1 + 0.08 * p;
      f.tmv = 1 - 0.14 * p;
  }
  return f;
}

const METRICAS = [
  "hc_fim",         // headcount ativo no fim da semana (estoque)
  "hc_orcado",      // headcount previsto no orcamento (estoque)
  "adm",            // admissoes (fluxo)
  "desl",           // desligamentos totais (fluxo)
  "desl_vol",       // desligamentos a pedido (fluxo)
  "h_prev",         // horas previstas de trabalho (fluxo)
  "h_aus",          // horas de ausencia nao justificada + atestado (fluxo)
  "h_extra",        // horas extras pagas (fluxo)
  "custo",          // custo de folha com encargos, R$ (fluxo)
  "vagas_abertas",  // vagas em aberto no fim da semana (estoque)
  "vagas_fech",     // vagas fechadas na semana (fluxo)
  "dias_fech",      // soma dos dias de abertura das vagas fechadas (fluxo)
  "h_treino",       // horas de treinamento realizadas (fluxo)
  "acid",           // acidentes com afastamento (fluxo)
  "hc_lid",         // posicoes de lideranca ocupadas (estoque)
  "hc_lid_fem",     // posicoes de lideranca ocupadas por mulheres (estoque)
  "enps_resp",      // respostas do pulso de e-NPS (fluxo)
  "enps_prom",      // promotores (fluxo)
  "enps_detr",      // detratores (fluxo)
];

function simular(semanas) {
  const segmentos = AREAS.map((a) => [a.empresa, a.diretoria, a.area]);
  const linhas = [];
  const semanasPorAno = { 2025: semanasNoAnoIso(2025), 2026: semanasNoAnoIso(2026) };

  AREAS.forEach((perfil, iSeg) => {
    const rnd = mulberry32(1000 + iSeg * 37);
    let hc = perfil.hc;
    let lidFem = perfil.lidFem;
    // ciclo de recrutamento em semanas, por faixa salarial
    const tmvNominal = perfil.sal > 11000 ? 62 : perfil.sal > 6500 ? 45 : 31;
    // estoque inicial no equilibrio da fila: entrada semanal x tempo de ciclo
    let vagasAbertas = Math.max(1, Math.round(((perfil.hc * perfil.turn) / 4.33) * 0.9 * (tmvNominal / 7)));

    semanas.forEach((sem, iSem) => {
      const mesIdx = Number(sem.mes.slice(5)) - 1;
      const progresso = (sem.semana - 1) / (semanasPorAno[sem.ano] - 1);
      const n = narrativa(perfil.hist, sem.ano, progresso);

      // crescimento organico do quadro
      const crescimento = 1 + (sem.ano === 2026 ? 0.0009 : 0.0006) * (perfil.hist === "turnover_vol_piora" ? 1.6 : 1);
      const hcAlvo = perfil.hc * Math.pow(crescimento, iSem);

      // desligamentos (fluxo semanal = base mensal / 4.33)
      const taxaTurn = (perfil.turn / 4.33) * SAZONAL_TURN[mesIdx] * n.turn * ruido(rnd, 0.35);
      const desl = Math.max(0, Math.round(hc * taxaTurn));
      const deslVol = Math.round(desl * Math.min(0.95, perfil.vol * n.vol));

      // fila de recrutamento: cada saida abre requisicao, o estoque escoa pelo tempo de ciclo.
      // No equilibrio, vagas em aberto = entrada semanal x ciclo (Lei de Little) — por isso o
      // estoque de vagas reage tanto a rotatividade quanto ao tempo de preenchimento.
      const expansao = Math.max(0, (hcAlvo - hc) * 0.1);
      const novasVagas = Math.max(0, Math.round(desl * 0.9 + expansao));
      const tmvBase = tmvNominal * n.tmv;
      const cicloSemanas = Math.max(1.2, tmvBase / 7);
      vagasAbertas += novasVagas;
      const vagasFech = Math.min(vagasAbertas, Math.max(0, Math.round((vagasAbertas / cicloSemanas) * ruido(rnd, 0.3))));
      vagasAbertas -= vagasFech;
      const diasFech = Math.round(vagasFech * tmvBase * ruido(rnd, 0.15));
      const adm = vagasFech; // admissao = vaga preenchida

      hc = Math.max(10, hc + adm - desl);

      const hPrev = Math.round(hc * 44);
      const hAus = Math.round(hPrev * perfil.abs * SAZONAL_ABS[mesIdx] * n.abs * ruido(rnd, 0.22));
      const hExtra = Math.round(hPrev * perfil.he * SAZONAL_HE[mesIdx] * n.he * ruido(rnd, 0.28));

      // dissidio de 5,1% aplicado em maio de cada ano
      const dissidio = sem.ano === 2026 ? (mesIdx >= 4 ? 1.051 : 1.0) * 1.048 : mesIdx >= 4 ? 1.048 : 1.0;
      const custoBase = (hc * perfil.sal * dissidio) / 4.33;
      const custoHe = (hExtra * ((perfil.sal * dissidio) / 220)) * 1.6;
      const custo = Math.round(custoBase + custoHe);

      const hTreino = Math.round(hc * (perfil.risco > 0.5 ? 0.46 : 0.29) * n.treino * ruido(rnd, 0.45));
      const acid = perfil.risco === 0 ? 0 : rnd() < perfil.risco * 0.16 * n.acid ? 1 : 0;

      const hcLid = Math.max(1, Math.round(hc * perfil.lid));
      lidFem = Math.min(0.85, perfil.lidFem + n.lidFem + (sem.ano === 2026 ? 0.03 * progresso : 0));
      const hcLidFem = Math.round(hcLid * lidFem);

      // pulso trimestral de e-NPS: semanas 6, 19, 32, 45
      const pulso = [6, 19, 32, 45].includes(sem.semana);
      const enpsResp = pulso ? Math.round(hc * (0.58 + rnd() * 0.2)) : 0;
      const enpsScore = Math.max(-100, Math.min(100, perfil.enps + n.enps + (rnd() - 0.5) * 6));
      // score = (%prom - %detr); passivos completam a base
      const fracPassivos = 0.34 + rnd() * 0.1;
      const fracProm = Math.max(0, Math.min(1 - fracPassivos, (1 - fracPassivos + enpsScore / 100) / 2));
      const fracDetr = Math.max(0, 1 - fracPassivos - fracProm);
      const enpsProm = Math.round(enpsResp * fracProm);
      const enpsDetr = Math.round(enpsResp * fracDetr);

      const hcOrcado = Math.round(perfil.hc * Math.pow(1 + (sem.ano === 2026 ? 0.0011 : 0.0008), iSem));

      linhas.push([
        iSeg,
        sem.id,
        hc, hcOrcado, adm, desl, deslVol,
        hPrev, hAus, hExtra, custo,
        vagasAbertas, vagasFech, diasFech,
        hTreino, acid, hcLid, hcLidFem,
        enpsResp, enpsProm, enpsDetr,
      ]);
    });
  });

  return { segmentos, linhas };
}

/* ------------------------------------------------------------------ *
 * 4. Definicao dos KPIs
 * ------------------------------------------------------------------ *
 * formula: expressao avaliada sobre o objeto de agregados `a`, onde
 *   a.soma.<metrica>    soma da metrica na janela (fluxos)
 *   a.ultimo.<metrica>  valor do ultimo periodo da janela (estoques)
 *   a.hcMedio           media do headcount ativo nas semanas da janela
 * direcao: "menor" | "maior" | "faixa"  (faixa = perto da meta e melhor)
 * escala : "periodo"   valor depende do tamanho da janela (fluxos)
 *          "instante"  valor e um estoque / razao independente da janela
 */
const KPIS = [
  {
    id: "headcount",
    nome: "Headcount ativo",
    grupo: "Quadro",
    formula: "a.ultimo.hc_fim",
    unidade: "pessoas",
    casas: 0,
    direcao: "faixa",
    escala: "instante",
    metaFormula: "a.ultimo.hc_orcado",
    metaRotulo: "orçado",
    tolerancia: 0.02,
    limite: 0.05,
    fonte: "Folha de pagamento — base de ativos",
    metodo: "Colaboradores com vínculo ativo no último dia do período. Farol pelo desvio frente ao headcount orçado.",
  },
  {
    id: "turnover_total",
    nome: "Rotatividade total",
    grupo: "Movimentação",
    formula: "a.soma.desl / a.hcMedio * 100",
    unidade: "%",
    casas: 2,
    direcao: "menor",
    escala: "periodo",
    metaMes: 2.7,
    metaRotulo: "meta",
    tolerancia: 0.1,
    limite: 0.25,
    destaque: true,
    fonte: "Folha de pagamento — movimentações",
    metodo: "Desligamentos do período ÷ headcount médio do período. Meta expressa em base mensal e reescalada pelo número de semanas da janela.",
  },
  {
    id: "turnover_vol",
    nome: "Rotatividade voluntária",
    grupo: "Movimentação",
    formula: "a.soma.desl_vol / a.hcMedio * 100",
    unidade: "%",
    casas: 2,
    direcao: "menor",
    escala: "periodo",
    metaMes: 1.45,
    metaRotulo: "meta",
    tolerancia: 0.1,
    limite: 0.25,
    destaque: true,
    fonte: "Folha de pagamento — motivo do desligamento",
    metodo: "Desligamentos a pedido ÷ headcount médio do período. É o indicador que mede retenção; a rotatividade total inclui decisões da empresa.",
  },
  {
    id: "absenteismo",
    nome: "Absenteísmo",
    grupo: "Presença",
    formula: "a.soma.h_aus / a.soma.h_prev * 100",
    unidade: "%",
    casas: 2,
    direcao: "menor",
    escala: "instante",
    meta: 3.85,
    metaRotulo: "meta",
    tolerancia: 0.1,
    limite: 0.25,
    destaque: true,
    fonte: "Ponto eletrônico",
    metodo: "Horas de ausência (faltas + atestados) ÷ horas previstas de trabalho.",
  },
  {
    id: "horas_extras",
    nome: "Horas extras",
    grupo: "Presença",
    formula: "a.soma.h_extra / a.soma.h_prev * 100",
    unidade: "%",
    casas: 2,
    direcao: "menor",
    escala: "instante",
    meta: 4.1,
    metaRotulo: "meta",
    tolerancia: 0.1,
    limite: 0.22,
    destaque: true,
    fonte: "Ponto eletrônico",
    metodo: "Horas extras pagas ÷ horas previstas de trabalho.",
  },
  {
    id: "custo_colab",
    nome: "Custo médio por colaborador",
    grupo: "Custo",
    formula: "a.soma.custo / a.hcMedio",
    unidade: "R$",
    casas: 0,
    direcao: "menor",
    escala: "periodo",
    // orçado de folha por colaborador: definido por empresa, porque o mix de
    // cargos muda completamente entre indústria, varejo e tecnologia
    metas: { "*": 7020, "Empresa Alfa": 8140, "Empresa Beta": 4820, "Empresa Gama": 8700 },
    metaRotulo: "orçado",
    tolerancia: 0.03,
    limite: 0.07,
    fonte: "Folha de pagamento — custo total com encargos",
    metodo: "Custo de folha com encargos ÷ headcount médio. Meta em base mensal, reescalada pela janela.",
  },
  {
    id: "tmv",
    nome: "Tempo médio de preenchimento",
    grupo: "Atração",
    formula: "a.soma.vagas_fech ? a.soma.dias_fech / a.soma.vagas_fech : null",
    unidade: "dias",
    casas: 1,
    direcao: "menor",
    escala: "instante",
    meta: 40,
    metaRotulo: "meta",
    tolerancia: 0.1,
    limite: 0.25,
    fonte: "ATS — vagas encerradas",
    metodo: "Dias entre abertura e aceite da proposta, média das vagas fechadas no período.",
  },
  {
    id: "vagas_abertas",
    nome: "Vagas em aberto",
    grupo: "Atração",
    formula: "a.ultimo.vagas_abertas",
    unidade: "vagas",
    casas: 0,
    direcao: "menor",
    escala: "instante",
    // teto proporcional ao quadro (2,22%), para que o farol continue válido
    // quando o painel é filtrado por empresa, diretoria ou área
    metas: { "*": "a.ultimo.hc_fim * 0.0222" },
    metaRotulo: "teto",
    tolerancia: 0.08,
    limite: 0.2,
    fonte: "ATS — requisições ativas",
    metodo: "Requisições aprovadas e ainda não preenchidas no fim do período.",
  },
  {
    id: "treino_colab",
    nome: "Treinamento por colaborador",
    grupo: "Desenvolvimento",
    formula: "a.soma.h_treino / a.hcMedio",
    unidade: "h",
    casas: 1,
    direcao: "maior",
    escala: "periodo",
    metaMes: 1.7,
    metaRotulo: "meta",
    tolerancia: 0.1,
    limite: 0.25,
    fonte: "LMS + registros de treinamento presencial",
    metodo: "Horas de treinamento realizadas ÷ headcount médio. Meta em base mensal, reescalada pela janela.",
  },
  {
    id: "taxa_acidentes",
    nome: "Taxa de frequência de acidentes",
    grupo: "Segurança",
    formula: "a.soma.h_prev ? a.soma.acid / a.soma.h_prev * 1e6 : null",
    unidade: "por milhão h",
    casas: 2,
    direcao: "menor",
    escala: "instante",
    meta: 6.0,
    metaRotulo: "meta",
    tolerancia: 0.12,
    limite: 0.3,
    destaque: true,
    fonte: "SESMT — CAT emitidas",
    metodo: "Acidentes com afastamento × 1.000.000 ÷ horas-homem de exposição.",
  },
  {
    id: "enps",
    nome: "e-NPS",
    grupo: "Engajamento",
    formula: "a.soma.enps_resp ? (a.soma.enps_prom - a.soma.enps_detr) / a.soma.enps_resp * 100 : null",
    unidade: "pts",
    casas: 0,
    direcao: "maior",
    escala: "instante",
    meta: 9,
    metaRotulo: "meta",
    tolerancia: 0.15,
    limite: 0.4,
    destaque: true,
    fonte: "Pulso trimestral de clima",
    metodo: "% promotores − % detratores considerando todos os pulsos de clima dentro do período. Sem pulso na janela, o indicador não é apurado — é o comportamento correto para um indicador trimestral em leitura semanal.",
  },
  {
    id: "lideranca_fem",
    nome: "Mulheres em liderança",
    grupo: "Diversidade",
    formula: "a.ultimo.hc_lid ? a.ultimo.hc_lid_fem / a.ultimo.hc_lid * 100 : null",
    unidade: "%",
    casas: 1,
    direcao: "maior",
    escala: "instante",
    meta: 35,
    metaRotulo: "meta 2026",
    tolerancia: 0.1,
    limite: 0.25,
    fonte: "Estrutura organizacional — cargos de gestão",
    metodo: "Posições de liderança ocupadas por mulheres ÷ total de posições de liderança ocupadas.",
  },
];

/* ------------------------------------------------------------------ *
 * 5. Comentarios (motivos e analises)
 * ------------------------------------------------------------------ *
 * Chave "*" vale para qualquer recorte. Chaves mais especificas
 * ("Empresa Gama", "Empresa Gama > Tecnologia") sobrepoem a geral.
 */
const COMENTARIOS = {
  turnover_vol: {
    "*": {
      texto:
        "1,91% no mês, 32% acima da meta de 1,45% e 18,4% acima de julho de 2025 (1,61%). No acumulado do ano, porém, o indicador empata com 2025: 1,86% contra 1,88%. " +
        "Esse empate é a média de dois movimentos opostos e é exatamente o que o consolidado esconde: as Lojas melhoraram 6,9% no ano, enquanto a Empresa Gama piorou 7,7% e, em julho, disparou 39,5%. " +
        "A concentração é nítida — Central de Atendimento em 4,06% (+43,8% sobre julho/25) e Desenvolvimento em 2,58% (+22,0%). Gama responde por 39% de todos os pedidos de demissão do mês com 23% do quadro. " +
        "A composição não mudou: 71% das saídas seguem sendo a pedido, mesma proporção de 2025. O que mudou foi onde elas acontecem, e é por isso que a leitura por diretoria importa mais que o número do grupo.",
      acoes: [
        "Revisão da faixa salarial de Desenvolvimento — comitê de remuneração em 05/08",
        "Onboarding estruturado de 90 dias na Central de Atendimento — piloto iniciado na S28",
        "Entrevista de desligamento obrigatória com codificação de motivo a partir de agosto",
      ],
      responsavel: "Business Partner — Gama",
    },
    "Empresa Beta": {
      texto:
        "2,05% no mês, ainda acima da meta, mas em queda consistente: −4,1% sobre julho/25 e −6,9% no acumulado do ano. " +
        "A revisão de escala nas lojas e a trilha de carreira de operador para líder de turno reduziram as saídas na faixa de até 6 meses de casa, que era a maior fonte de perda.",
      acoes: ["Estender a trilha de carreira ao CD Expedição no 4º trimestre"],
      responsavel: "Business Partner — Beta",
    },
    "Empresa Gama": {
      texto:
        "3,20% no mês contra 2,30% em julho/25 — alta de 39,5% e o epicentro do problema do grupo. Central de Atendimento em 4,06% e Desenvolvimento em 2,58%. " +
        "As duas causas são distintas e pedem respostas distintas: na Central, saídas concentradas nos primeiros 90 dias, o que aponta para seleção e integração; " +
        "em Desenvolvimento, contrapropostas de mercado acima da nossa faixa, o que aponta para remuneração. Tratar as duas com o mesmo plano não vai funcionar.",
      acoes: [
        "Diagnóstico de perfil de contratação da Central de Atendimento até 15/08",
        "Benchmark salarial de tecnologia com consultoria externa — resultado em 29/08",
      ],
      responsavel: "Business Partner — Gama",
    },
  },
  turnover_total: {
    "*": {
      texto:
        "2,53% no mês, dentro da meta de 2,70%, e 2,2% melhor que 2025 fechado. É o indicador que costuma ir para o comitê, e é o menos informativo dos dois. " +
        "Ele está verde porque a meta acomoda o perfil de varejo e atendimento do grupo, e porque a queda de desligamentos por iniciativa da empresa compensa a alta dos pedidos de demissão. " +
        "A decisão relevante está na voluntária, que é a parcela sobre a qual temos alguma alavanca.",
      acoes: ["Reportar sempre os dois indicadores juntos, nunca o total isolado"],
      responsavel: "Analytics de RH",
    },
  },
  absenteismo: {
    "*": {
      texto:
        "4,01% no mês contra meta de 3,85%, praticamente igual a julho/25 (4,02%) — ou seja, não é uma piora, é um patamar que não cede há doze meses. " +
        "A concentração explica por quê: CD Expedição em 6,54% (+22,1% sobre julho/25) e Central de Atendimento em 5,80% respondem por 38,4% de todas as horas ausentes do grupo com 25,2% do quadro. " +
        "O padrão é de atestados de curta duração, compatível com carga física no CD e com escala 6x1 no atendimento. Sem tratar essas duas áreas, o indicador do grupo não se move.",
      acoes: [
        "Cruzamento de atestados com escala e turno no CD — SESMT com Analytics, entrega em 20/08",
        "Ginástica laboral no CD retomada na S29",
      ],
      responsavel: "Saúde Ocupacional",
    },
  },
  horas_extras: {
    "*": {
      texto:
        "5,75% no mês, 40% acima da meta de 4,10% e o pior resultado dos últimos dezoito meses. As 26.379 horas extras pagas em julho equivalem a 150 posições de 44h/semana. " +
        "O gap de quadro contra o orçado é de 90 posições. Estamos pagando hora extra equivalente a mais gente do que a que falta — a hora extra deixou de ser ajuste de pico e passou a ser a forma como a operação cobre vaga não preenchida. " +
        "Três áreas concentram 64% de toda a hora extra: Manutenção (11,03%), CD Expedição (9,13%) e Produção (8,19%).",
      acoes: [
        "Antecipar para agosto as 30 contratações da Produção previstas para setembro",
        "Teto de hora extra por gestor, com alçada de aprovação acima do teto, a partir de agosto",
      ],
      responsavel: "Diretoria de Operações",
    },
  },
  taxa_acidentes: {
    "*": {
      texto:
        "4,36 acidentes por milhão de horas no mês, contra meta de 6,00 e 13,73 em julho de 2025. No acumulado do ano, 5,61 contra 7,35 — queda de 23,7% e melhor marca da série. " +
        "Dois fatores identificados: o programa de bloqueio e etiquetagem na Produção e o novo layout de picking no CD. " +
        "Fica registrada uma ressalva que o farol não captura sozinho: alta de horas extras historicamente antecede alta de acidentes em três a seis meses, e as horas extras estão no pior patamar do período. Este verde é o que tem maior risco de virar.",
      acoes: [
        "Manter auditoria semanal de bloqueio e etiquetagem",
        "Alerta cruzado horas extras x acidentes no farol semanal",
      ],
      responsavel: "SESMT",
    },
  },
  enps: {
    "*": {
      texto:
        "10 pontos no acumulado de 2026, acima da meta de 9 e 8,5% melhor que o mesmo ponto de 2025. O número do grupo, no entanto, é a média de três realidades: Alfa em 17, Beta em 7 (+34,7% no ano) e Gama em 2 (−47,9%). " +
        "A recuperação de Beta vem das lojas, e é o mesmo movimento que aparece na rotatividade voluntária de lá. A queda de Gama é o mesmo movimento que aparece na voluntária de Gama — os dois indicadores estão contando a mesma história. " +
        "Nas lentes de semana e de mês o indicador aparece como não apurado, e isso é correto: o pulso é trimestral e o próximo é na S32.",
      acoes: ["Plano de ação de clima da Central de Atendimento com prazo até 30/09"],
      responsavel: "Cultura & Engajamento",
    },
  },
  treino_colab: {
    "*": {
      texto:
        "1,7 h por colaborador no mês — 4.075 horas realizadas — praticamente na meta, e 10,1% acima de julho/25. No acumulado do ano, 1,6 h contra 1,5 h em 2025 (+5,6%). " +
        "O ritmo de julho caiu frente a junho porque as turmas de NR-12 foram remarcadas para agosto por indisponibilidade de instrutor; não houve queda de demanda.",
      acoes: ["Duas turmas extras de NR-12 em agosto para recompor o acumulado"],
      responsavel: "Desenvolvimento Organizacional",
    },
  },
  vagas_abertas: {
    "*": {
      texto:
        "74 vagas em aberto contra um teto de 58 (2,2% do quadro), e 21,3% acima de julho/25. Distribuição: Atendimento 19, Operações 15, Tecnologia 13, Lojas 10. " +
        "É a variável de amarração da semana. Ela é alimentada pela rotatividade voluntária e alimenta, por sua vez, horas extras, absenteísmo e custo médio. " +
        "Dos três indicadores vermelhos, é o único em que uma decisão isolada — capacidade de recrutamento — muda o resultado dos outros dois.",
      acoes: ["Dois recrutadores dedicados à operação até outubro"],
      responsavel: "Atração & Seleção",
    },
  },
  tmv: {
    "*": {
      texto:
        "35,7 dias no mês contra meta de 40, mas 4,9% pior que julho/25. A média do grupo é enganosa porque a dispersão é enorme: " +
        "Desenvolvimento fecha em 66,8 dias e Projetos em 60,0, enquanto operação e lojas fecham entre 28 e 31 dias. " +
        "Como o volume de vagas está na operação, a média fica verde enquanto as vagas que realmente travam o negócio levam mais que o dobro do tempo. Uma meta única para todas as famílias de cargo esconde o problema em vez de medi-lo.",
      acoes: ["Segmentar a meta de tempo de preenchimento por família de cargo no ciclo 2027"],
      responsavel: "Atração & Seleção",
    },
  },
  custo_colab: {
    "*": {
      texto:
        "R$ 7.436 por colaborador no mês, 5,9% acima do orçado, e R$ 7.179 no acumulado do ano (+5,0% sobre 2025). " +
        "Dois componentes explicam o desvio: o dissídio de 5,1% aplicado em maio, projetado no orçamento a 4,3%, e as horas extras. " +
        "O orçado é definido por empresa, porque o mix de cargos torna a média do grupo inútil como referência: Alfa opera em R$ 8.140, Beta em R$ 4.820 e Gama em R$ 8.700.",
      acoes: ["Revisar a projeção de folha do 2º semestre com a Controladoria até 12/08"],
      responsavel: "Remuneração",
    },
  },
  headcount: {
    "*": {
      texto:
        "2.610 ativos contra 2.701 orçados — gap de 90 posições, concentrado na operação e em Gama, e 5,2% acima de julho/25. " +
        "O gap não é economia de folha: as mesmas 90 posições reaparecem no indicador de horas extras como 150 posições-equivalente pagas com adicional. " +
        "Ler headcount abaixo do orçado como resultado positivo é o erro mais comum neste painel.",
      acoes: [],
      responsavel: "Analytics de RH",
    },
  },
  lideranca_fem: {
    "*": {
      texto:
        "34,1% contra meta de 35% para 2026, com avanço de 1,3 p.p. em doze meses, puxado por promoções internas em Gente & Gestão e Qualidade. " +
        "O gap está concentrado em três diretorias: Logística (14,3%, 2 de 14 posições), Operações (22,2%, 12 de 54) e Tecnologia (24%, 6 de 25). " +
        "Administrativo (57,1%), Atendimento (60%) e Lojas (50%) já superam a meta com folga. No ritmo atual, o grupo alcança 35% no 1º trimestre de 2027, não em 2026.",
      acoes: [
        "Shortlist com ao menos uma candidata em toda vaga de liderança",
        "Programa de mentoria para a camada de coordenação de Operações e Logística",
      ],
      responsavel: "Diversidade & Inclusão",
    },
  },
};

/* ------------------------------------------------------------------ *
 * 5b. Leitura do periodo (texto de abertura do painel)
 * ------------------------------------------------------------------ */
const LEITURA = {
  "*": {
    texto:
      "A semana 30 não trouxe evento isolado relevante. O que o farol mostra é a maturação de um único encadeamento que vem de março, e ele tem três indicadores vermelhos que são o mesmo problema visto de três ângulos.\n\n" +
      "A rotatividade voluntária subiu para 1,91% no mês (+18,4% sobre julho/25) concentrada em Central de Atendimento e Desenvolvimento. Cada saída abre requisição, e as vagas em aberto chegaram a 74 contra um teto de 58. " +
      "Cada vaga não preenchida na operação vira hora extra: 5,75% no mês, 40% acima da meta, com 26.379 horas pagas em julho — o equivalente a 150 posições, contra um gap de quadro de 90. " +
      "Em outras palavras, hoje a hora extra custa mais do que o efetivo que falta.\n\n" +
      "Vale registrar o que está indo bem, porque muda a leitura: segurança está na melhor marca da série (−23,7% no ano) e o e-NPS voltou a subir nas Lojas, no mesmo movimento em que a rotatividade de lá cede. " +
      "A rotatividade total está verde — e é justamente por isso que ela não deve ser o indicador de abertura: o total esconde que a parcela voluntária, a única sobre a qual temos alavanca, é a que piorou.\n\n" +
      "A decisão que pedimos ao comitê é uma só: antecipar para agosto as 30 contratações da Produção previstas para setembro, e liberar dois recrutadores dedicados à operação. " +
      "As vagas em aberto são o único ponto da cadeia em que uma decisão isolada move os outros dois indicadores.",
  },
  "Empresa Beta": {
    texto:
      "Beta é a contraprova do grupo. A rotatividade voluntária cai 6,9% no ano e o e-NPS sobe 34,7%, os dois puxados pelas lojas, depois da revisão de escala e da trilha de carreira de operador para líder de turno. " +
      "O ponto de atenção está no CD Expedição, que segue com o pior absenteísmo do grupo (6,54%, +22,1% sobre julho/25) e horas extras em 9,13%. É a próxima área a receber o mesmo tratamento que funcionou nas lojas.",
  },
  "Empresa Gama": {
    texto:
      "Gama concentra o problema do grupo. Rotatividade voluntária em 3,20% no mês (+39,5% sobre julho/25), 32 vagas em aberto contra um teto proporcional de 14, e e-NPS em 2 pontos contra 17 de Alfa. " +
      "As causas são duas e pedem respostas diferentes: na Central de Atendimento, saídas nos primeiros 90 dias, o que aponta para seleção e integração; em Desenvolvimento, contraproposta de mercado, o que aponta para remuneração. " +
      "Do lado positivo, Gama já supera a meta de mulheres em liderança (40%) e opera com horas extras dentro da meta.",
  },
};

/* ------------------------------------------------------------------ *
 * 6. Montagem e escrita
 * ------------------------------------------------------------------ */

const semanas = montarSemanas();
const { segmentos, linhas } = simular(semanas);

const dados = {
  meta: {
    titulo: "Farol de KPIs de RH",
    organizacao: "Grupo Alfa (dados de exemplo)",
    semanaReferencia: semanas.at(-1).id,
    atualizadoEm: "2026-07-27",
    observacao:
      "Conjunto de dados sintético, gerado por tools/gerar-dados.mjs apenas para validar a visão. Substitua pelos dados reais mantendo o contrato descrito em docs/MODELO-DE-DADOS.md.",
  },
  semanas,
  segmentos: { colunas: ["empresa", "diretoria", "area"], linhas: segmentos },
  fatos: { colunas: ["seg", "semana", ...METRICAS], linhas },
  metricas: METRICAS,
  estoques: ["hc_fim", "hc_orcado", "vagas_abertas", "hc_lid", "hc_lid_fem"],
  kpis: KPIS,
  comentarios: COMENTARIOS,
  leitura: LEITURA,
};

const json = JSON.stringify(dados);
writeFileSync(join(raiz, "dados.json"), JSON.stringify(dados, null, 1) + "\n");

const htmlPath = join(raiz, "index.html");
let html = readFileSync(htmlPath, "utf8");
const marcador = /(<script id="kpi-dados" type="application\/json">)[\s\S]*?(<\/script>)/;
if (!marcador.test(html)) {
  console.error("Bloco <script id=\"kpi-dados\"> não encontrado em index.html.");
  process.exit(1);
}
html = html.replace(marcador, (_m, abre, fecha) => `${abre}${json}${fecha}`);
writeFileSync(htmlPath, html);

console.log(
  `dados.json e index.html atualizados — ${linhas.length} linhas de fato, ` +
    `${segmentos.length} segmentos, ${semanas.length} semanas, ${KPIS.length} KPIs ` +
    `(${(json.length / 1024).toFixed(0)} KB).`
);
