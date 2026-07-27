#!/usr/bin/env node
/**
 * Extrai de `index.html` uma versao para publicar como pagina hospedada (Artifact),
 * onde o esqueleto <!doctype>/<head>/<body> e fornecido pelo host.
 *
 *   node tools/gerar-artifact.mjs
 *
 * Nao ha duplicacao de codigo: `index.html` continua sendo a unica fonte.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(raiz, "index.html"), "utf8");

const pegar = (re, nome) => {
  const m = html.match(re);
  if (!m) {
    console.error(`Não encontrei ${nome} em index.html.`);
    process.exit(1);
  }
  return m[1];
};

const titulo = pegar(/<title>([\s\S]*?)<\/title>/, "<title>");
const dados = pegar(/(<script id="kpi-dados"[\s\S]*?<\/script>)/, "o bloco de dados");
const estilo = pegar(/(<style>[\s\S]*?<\/style>)/, "o bloco <style>");
const corpo = pegar(/<body>([\s\S]*?)<\/body>/, "o conteúdo de <body>");

const saida = `<title>${titulo}</title>\n${estilo}\n${dados}\n${corpo.trim()}\n`;

mkdirSync(join(raiz, "build"), { recursive: true });
writeFileSync(join(raiz, "build", "painel.html"), saida);
console.log(`build/painel.html gerado — ${(saida.length / 1024).toFixed(0)} KB.`);
