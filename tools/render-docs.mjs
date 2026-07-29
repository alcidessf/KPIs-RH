// Regera os prints de referência em docs/imagens/ a partir dos arquivos reais.
//
//   node tools/render-docs.mjs
//
// Precisa do Playwright com Chromium. Se não estiver instalado no projeto:
//   npm i -D playwright && npx playwright install chromium
//
// Sai com código 1 se o painel lançar qualquer erro de página ou de console —
// é a verificação que impede um layout quebrado de chegar na reunião.

import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..");
const saida = path.join(raiz, "docs", "imagens");
const url = (arq) => pathToFileURL(path.join(raiz, "painel", arq)).href;

// resolve o playwright do projeto ou o global, sem depender de NODE_PATH
const require = createRequire(import.meta.url);
let chromium;
for (const alvo of ["playwright", "/opt/node22/lib/node_modules/playwright/index.mjs"]) {
  try {
    chromium = (await import(alvo.startsWith("/") ? pathToFileURL(alvo).href : require.resolve(alvo))).chromium;
    break;
  } catch {}
}
if (!chromium) {
  console.error("Playwright não encontrado. Rode: npm i -D playwright && npx playwright install chromium");
  process.exit(1);
}

await mkdir(saida, { recursive: true });
const navegador = await chromium.launch();
const erros = [];

function vigiar(pagina, rotulo) {
  pagina.on("pageerror", (e) => erros.push(`${rotulo} pageerror: ${e.message}`));
  pagina.on("console", (m) => { if (m.type() === "error") erros.push(`${rotulo} console: ${m.text()}`); });
}

// --- 16:9, o recorte que vai para o PPT ---
const desktop = await navegador.newPage({ viewport: { width: 1680, height: 1100 }, deviceScaleFactor: 2 });
vigiar(desktop, "filtros");
await desktop.goto(url("movimentacoes-filtros.html"), { waitUntil: "load" });
await desktop.waitForTimeout(500);
await desktop.locator(".slide").screenshot({ path: path.join(saida, "01-consolidado.png") });

// exercita o filtro: a quebra do último cartão deve descer de diretorias para áreas
await desktop.selectOption("#f-diretoria", "FLO");
await desktop.waitForTimeout(400);
await desktop.locator(".slide").screenshot({ path: path.join(saida, "02-filtro-diretoria.png") });

// --- versão sem filtros ---
const simples = await navegador.newPage({ viewport: { width: 1680, height: 1100 }, deviceScaleFactor: 2 });
vigiar(simples, "sem-filtros");
await simples.goto(url("movimentacoes.html"), { waitUntil: "load" });
await simples.waitForTimeout(500);
await simples.locator(".slide").screenshot({ path: path.join(saida, "04-sem-filtros.png") });

// --- celular: cartões empilhados, sem transbordo horizontal ---
const celular = await navegador.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
vigiar(celular, "mobile");
await celular.goto(url("movimentacoes-filtros.html"), { waitUntil: "load" });
await celular.waitForTimeout(500);
const transbordo = await celular.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth
);
if (transbordo) erros.push("mobile: transbordo horizontal a 390px");
await celular.screenshot({ path: path.join(saida, "03-mobile.png"), fullPage: true });

await navegador.close();

if (erros.length) {
  console.error("ERROS:\n  " + erros.join("\n  "));
  process.exit(1);
}
console.log("ok — 4 prints em docs/imagens/, sem erros de página");
