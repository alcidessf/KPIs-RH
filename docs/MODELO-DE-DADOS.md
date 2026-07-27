# Modelo de dados

O painel não lê métricas prontas. Ele lê **componentes brutos** por semana e por
segmento, e calcula cada KPI na hora. Isso é o que permite filtrar por empresa,
diretoria ou área e ainda ter números corretos — uma taxa não pode ser somada
entre áreas, mas numerador e denominador podem.

Se o painel lesse "turnover = 2,1%" por área, o consolidado seria a média das
médias, que está errada. Lendo `desligamentos` e `headcount` separados, o
consolidado é `Σ desligamentos ÷ Σ headcount`, que está certo.

---

## Estrutura do arquivo

Um único objeto JSON, embutido em `index.html` no bloco
`<script id="kpi-dados" type="application/json">` e também salvo solto em
`dados.json`.

```jsonc
{
  "meta": {
    "titulo": "Farol de KPIs de RH",
    "organizacao": "...",
    "semanaReferencia": "2026-W30",   // última semana FECHADA — define todas as janelas
    "atualizadoEm": "2026-07-27",
    "observacao": "texto do rodapé"
  },
  "semanas":   [ /* calendário — ver abaixo */ ],
  "segmentos": { "colunas": ["empresa","diretoria","area"], "linhas": [ ["Alfa","Operações","Produção"], ... ] },
  "fatos":     { "colunas": ["seg","semana", ...métricas], "linhas": [ [0,"2026-W30", 612, 620, ...], ... ] },
  "metricas":  ["hc_fim","hc_orcado", ...],
  "estoques":  ["hc_fim","hc_orcado","vagas_abertas","hc_lid","hc_lid_fem"],
  "kpis":      [ /* definições — ver abaixo */ ],
  "comentarios": { "<kpiId>": { "<recorte>": { "texto","acoes","responsavel" } } },
  "leitura":     { "<recorte>": { "texto" } }
}
```

### `semanas` — o calendário

Semana ISO. `mes` é o mês da **quinta-feira** da semana (convenção ISO), o que
evita que uma semana seja contada em dois meses.

```jsonc
{ "id": "2026-W30", "ano": 2026, "semana": 30,
  "inicio": "2026-07-20", "fim": "2026-07-26", "mes": "2026-07" }
```

### `segmentos` — a hierarquia organizacional

Uma linha por combinação folha de `empresa / diretoria / area`. O índice da linha
é o que aparece na coluna `seg` dos fatos. Três níveis é o que o painel filtra
hoje; acrescentar um quarto exige mexer nos filtros.

### `fatos` — a tabela de fatos

Grão: **uma linha por segmento por semana**. Formato colunar para manter o
arquivo pequeno.

```
[ seg, semana, hc_fim, hc_orcado, adm, desl, desl_vol, h_prev, h_aus, h_extra,
  custo, vagas_abertas, vagas_fech, dias_fech, h_treino, acid, hc_lid,
  hc_lid_fem, enps_resp, enps_prom, enps_detr ]
```

| Métrica | O que é | Tipo | Origem típica |
|---|---|---|---|
| `hc_fim` | ativos no último dia da semana | estoque | folha |
| `hc_orcado` | quadro previsto no orçamento | estoque | orçamento |
| `adm` | admissões | fluxo | folha |
| `desl` | desligamentos totais | fluxo | folha |
| `desl_vol` | desligamentos a pedido | fluxo | folha (motivo) |
| `h_prev` | horas previstas de trabalho | fluxo | ponto |
| `h_aus` | horas de ausência (faltas + atestados) | fluxo | ponto |
| `h_extra` | horas extras pagas | fluxo | ponto |
| `custo` | custo de folha com encargos, R$ | fluxo | folha |
| `vagas_abertas` | requisições abertas no fim da semana | estoque | ATS |
| `vagas_fech` | vagas preenchidas na semana | fluxo | ATS |
| `dias_fech` | **soma** dos dias de abertura das vagas fechadas | fluxo | ATS |
| `h_treino` | horas de treinamento realizadas | fluxo | LMS |
| `acid` | acidentes com afastamento | fluxo | SESMT |
| `hc_lid` | posições de liderança ocupadas | estoque | estrutura |
| `hc_lid_fem` | idem, ocupadas por mulheres | estoque | estrutura |
| `enps_resp` / `enps_prom` / `enps_detr` | respostas / promotores / detratores do pulso | fluxo | pesquisa |

Duas regras importam:

- **`dias_fech` é soma, não média.** O tempo médio de preenchimento é
  `Σ dias_fech ÷ Σ vagas_fech`. Guardar a média por linha impediria agregar.
- **Estoque x fluxo.** Na agregação **entre segmentos** os dois somam. Na
  agregação **ao longo do tempo**, fluxo soma e estoque pega o valor da última
  semana da janela. Declare os estoques em `estoques`.

Semanas sem movimento devem existir com zeros. Semanas ausentes viram lacunas no
gráfico, o que é o comportamento correto para dado que não existe — mas não para
dado que existe e vale zero.

---

## `kpis` — definição de um indicador

```jsonc
{
  "id": "turnover_vol",
  "nome": "Rotatividade voluntária",
  "grupo": "Movimentação",              // agrupador exibido no cartão
  "formula": "a.soma.desl_vol / a.hcMedio * 100",
  "unidade": "%",                       // "%" | "R$" | "dias" | "h" | "pts" | "pessoas" | "vagas" | livre
  "casas": 2,
  "direcao": "menor",                   // "menor" | "maior" | "faixa"
  "escala": "periodo",                  // "periodo" | "instante"
  "metaMes": 1.45,                      // ou "meta", "metaFormula", "metas"
  "metaRotulo": "meta",
  "tolerancia": 0.1,                    // só para direcao "faixa"
  "limite": 0.25,                       // fronteira amarelo -> vermelho
  "destaque": true,                      // sobe para "Indicadores estratégicos"
  "fonte": "Folha de pagamento — motivo do desligamento",
  "metodo": "texto exibido em 'Como é calculado'"
}
```

### `formula`

Expressão JavaScript avaliada sobre o objeto de agregados `a`:

| Referência | Significado |
|---|---|
| `a.soma.<metrica>` | soma da métrica na janela (use para fluxos) |
| `a.ultimo.<metrica>` | valor na última semana da janela (use para estoques) |
| `a.hcMedio` | média de `hc_fim` nas semanas da janela |
| `a.semanas` | número de semanas da janela |

Devolva `null` quando o indicador não é apurável — por exemplo
`a.soma.vagas_fech ? a.soma.dias_fech / a.soma.vagas_fech : null`. O painel
mostra "sem apuração" em cinza em vez de inventar zero.

### `escala` — a regra que torna os períodos comparáveis

| Valor | Significado | Exemplos |
|---|---|---|
| `periodo` | o resultado depende do tamanho da janela, então é **convertido para base mensal** (`× 4,333 ÷ semanas`) | rotatividade, custo por colaborador, horas de treinamento |
| `instante` | já é razão ou estoque, independente da janela | absenteísmo, horas extras %, headcount, e-NPS, taxa de acidentes |

É por isso que "custo médio por colaborador" no acumulado do ano aparece como
R$ 7.179/mês e não como R$ 49 mil: o acumulado de 30 semanas é reexpresso em
base mensal. Sem isso, semana, mês e ano não podem ser comparados entre si nem
com a meta.

### Metas — quatro formas, nesta ordem de precedência

| Campo | Uso |
|---|---|
| `metas` | mapa por recorte: `{ "*": 7020, "Empresa Beta": 4820 }`. Valor numérico ou fórmula em texto. **Use sempre que a meta não fizer sentido igual para todos os recortes.** |
| `metaFormula` | fórmula sobre `a` — ex. `"a.ultimo.hc_orcado"` |
| `metaMes` | número em base mensal (para KPIs de `escala: "periodo"`) |
| `meta` | número absoluto |

Cuidado com metas de **contagem**: um teto de 58 vagas para o grupo fica
absurdamente frouxo ao filtrar uma empresa. Nesses casos use uma fórmula
proporcional, como o painel faz com vagas em aberto:
`{ "*": "a.ultimo.hc_fim * 0.0222" }`.

### `direcao` e o farol

Seja `desvio = (valor − meta) / |meta|` e `excesso` o quanto o resultado está
pior que a meta:

| `direcao` | `excesso` | Significado |
|---|---|---|
| `menor` | `desvio` | menor é melhor (rotatividade, absenteísmo, custo) |
| `maior` | `−desvio` | maior é melhor (treinamento, e-NPS, diversidade) |
| `faixa` | `\|desvio\| − tolerancia` | perto da meta é melhor, para os dois lados (headcount x orçado) |

| Farol | Condição |
|---|---|
| verde — Na meta | `excesso ≤ 0` |
| amarelo — Atenção | `0 < excesso ≤ limite` |
| vermelho — Fora da meta | `excesso > limite` |
| cinza — Não apurado | valor ou meta ausente |

---

## Janelas e comparativos

`meta.semanaReferencia` é a última semana fechada. A partir dela:

| Janela | Período | Compara com |
|---|---|---|
| Semana | a semana de referência | semana anterior · mesma semana ISO do ano anterior |
| Mês (MTD) | semanas do mês corrente até a referência | **primeiras N semanas** do mês anterior · **primeiras N semanas** do mesmo mês do ano anterior |
| Ano (YTD) | semanas 1 a N do ano corrente | ano anterior fechado · semanas 1 a N do ano anterior |

O ponto do "primeiras N semanas": um mês com 4 semanas decorridas nunca é
comparado com um mês fechado de 4,3 semanas. É a diferença entre dizer que a
rotatividade caiu e dizer que o mês ainda não terminou.

---

## `comentarios` e `leitura` — herança por recorte

Chaves aceitas, da mais específica para a mais geral:

```
"Empresa Beta > Logística > CD Expedição"
"Empresa Beta > Logística"
"Empresa Beta"
"*"
```

O painel resolve a mais específica que existir. Quando cai no `"*"` com um
filtro ativo, ele **avisa na tela** que a análise é do consolidado e que os
números citados no texto não são os do cartão — porque um texto com números
fixos vira mentira quando aplicado a outro recorte.

Edições feitas na tela ficam no `localStorage` gravadas na chave do **recorte
ativo**, nunca sobre o `"*"`. Elas são locais ao navegador; para publicar, leve
o texto para `comentarios` no gerador e regenere.

---

## Plugando dados reais

Substitua a montagem de `fatos` em `tools/gerar-dados.mjs`. O consumo esperado é
uma consulta que devolva uma linha por segmento por semana:

```sql
SELECT
  empresa, diretoria, area,
  FORMAT_DATE('%G-W%V', data)          AS semana,
  COUNT(*) FILTER (WHERE ativo)        AS hc_fim,
  COUNT(*) FILTER (WHERE admitido)     AS adm,
  COUNT(*) FILTER (WHERE desligado)    AS desl,
  COUNT(*) FILTER (WHERE desligado AND motivo = 'pedido_demissao') AS desl_vol,
  ...
FROM fato_pessoas
GROUP BY 1, 2, 3, 4
```

Rode `node tools/gerar-dados.mjs` para reescrever `dados.json` e reinjetar o
bloco em `index.html`. Confira com `node tools/apurar.mjs`, que aplica
exatamente as mesmas regras fora do navegador — se o número dele bate com o do
seu BI, o painel também bate.

### Volume

O grão semanal é barato. Segmentos × semanas × métricas:
14 × 82 × 19 ≈ 22 mil números, cerca de 100 KB de JSON. Uma organização com 200
áreas e 3 anos de histórico ficaria em torno de 4 MB — ainda viável embutido,
mas nesse ponto vale servir `dados.json` separado e carregá-lo com `fetch`
(lembrando que `fetch` não funciona em `file://`, só sob um servidor).
