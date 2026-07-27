# Tela a tela

Como sair da apresentação atual e chegar no farol, sem perder informação pelo
caminho e sabendo exatamente o que foi deixado de fora.

---

## O problema que o de-para resolve

Uma apresentação semanal de RH costuma ter de 25 a 40 slides. A maior parte
deles não é informação nova — é o **mesmo indicador em outra janela de tempo ou
em outra quebra organizacional**. Um deck típico tem, para turnover: um slide do
mês, um do acumulado do ano, um da série de 12 meses, um do comparativo com o
ano anterior e um por diretoria. São cinco slides de um indicador só.

No painel esses cinco viram **um cartão**:

| Slide de hoje | Onde vai parar no cartão |
|---|---|
| Turnover do mês | o número grande |
| Turnover acumulado do ano | a faixa semana / mês / ano, sempre visível |
| Série de 12 meses | o gráfico dentro de "Histórico, causas e ações" |
| Comparativo com ano anterior | a segunda linha do mesmo gráfico, e os dois comparativos do cartão |
| Turnover por diretoria | o filtro de diretoria, que reescreve o cartão inteiro |

É por isso que 30 slides cabem em 12 cartões. A redução não vem de cortar
conteúdo, vem de **parar de repetir o mesmo indicador em telas diferentes**.

---

## As sete peças do painel

Todo slide atual cai em uma destas. Se algum não cair, é sinal de que o painel
precisa de uma peça nova — e isso é uma informação útil, não um problema.

| Peça | O que é | O que costuma vir para cá |
|---|---|---|
| **Cabeçalho** | título, semana de referência, recorte ativo | capa, slide de agenda |
| **Contador do farol** | quantos verdes, amarelos, vermelhos, e o clique que filtra | slide de "resumo do status" |
| **Leitura do período** | texto de abertura, editável na tela | resumo executivo, "destaques da semana" |
| **Cartão de KPI** | um indicador: valor, farol, meta, dois comparativos | o slide principal de cada indicador |
| **Faixa semana / mês / ano** | os três acumulados no rodapé do cartão | todos os slides de "acumulado mês" e "acumulado ano" |
| **Gráfico + tabela da análise** | série do ano contra o ano anterior, dentro do cartão | slides de série histórica e de comparativo anual |
| **Motivos e ações** | causa, plano, responsável, junto do número | slides de comentários e de plano de ação |
| **Filtro** | empresa → diretoria → área, refaz tudo | todos os slides de "por diretoria", "por empresa" |

---

## O processo, em três passos

### 1. Inventário — o que existe hoje

Preencha `inventario-indicadores.xlsx` (gere com `python3 tools/criar-inventario.py`).

A aba **1. Indicadores** é a que importa mais. Um indicador por linha, mesmo os
que você acha que deveriam sair. A aba **4. Tela a tela** é o de-para
propriamente dito: cada slide atual e a peça que ele vira.

Dois campos costumam gerar dúvida, e a distinção entre eles é o que faz os
números fecharem:

- **Comportamento** (aba 1) pergunta sobre o *indicador*: o valor cresce se o
  período for maior? Rotatividade, custo e horas de treinamento crescem, então
  são reexpressos em base mensal. Absenteísmo e headcount não crescem.
- **Fluxo x estoque** (aba 2) pergunta sobre o *componente*: horas de ausência
  são fluxo e somam; headcount é estoque e não soma no tempo. Absenteísmo é o
  caso que mistura os dois — é taxa que independe do período, formada por horas
  que somam.

### 2. Classificação — o que cada indicador precisa para virar farol

Um indicador só vira cartão quando tem cinco coisas. Se faltar alguma, o
importador avisa nomeando a linha:

| Precisa de | Sem isso |
|---|---|
| numerador e denominador separados | não dá para filtrar sem calcular média de médias |
| direção (menor, maior ou perto da meta) | o farol não sabe o que é melhorar |
| meta, e em que nível ela vale | o cartão fica cinza |
| tolerância | não há fronteira entre amarelo e vermelho |
| periodicidade real da coleta | um indicador trimestral aparece como zero na semana |

O ponto mais frequente de discussão é **em que nível a meta vale**. Uma meta
única de custo por colaborador para o grupo inteiro fica sem sentido ao filtrar
uma empresa, e um teto de vagas em contagem fica frouxo em qualquer recorte
menor. O painel aceita meta por grupo, empresa, diretoria ou área, e também meta
proporcional (por exemplo, teto de vagas = 2,2% do quadro).

### 3. Montagem — o inventário vira painel

```bash
python3 tools/criar-inventario.py       # gera a planilha em branco
# ... preencher ...
python3 tools/importar-inventario.py    # lê a planilha, escreve as definições
node tools/gerar-dados.mjs              # reconstrói o painel com os seus indicadores
node tools/apurar.mjs --lente mes       # confere os números contra o seu BI
```

O importador escreve `tools/kpis-do-inventario.json` e imprime três listas:
os indicadores lidos, **as métricas que o seu extrator vai precisar produzir**, e
os pontos a revisar. A lista de métricas é o requisito técnico da integração —
é o que você leva para quem tem acesso ao Protheus, ao ponto e ao ATS.

O campo `formula` sai como rascunho e precisa de revisão: o importador deduz a
expressão a partir do numerador e do denominador declarados, mas o nome final de
cada métrica depende de como o extrator vai chamá-la.

---

## Perguntas que o de-para costuma levantar

**"Esse indicador merece um cartão ou é detalhe?"** — se ele não tem meta e não
gera decisão, provavelmente é detalhe. Detalhe vive melhor dentro da análise de
outro cartão, ou como quebra de um filtro, do que como cartão próprio. Um farol
com mais de 15 cartões volta a ser o problema que ele deveria resolver.

**"E os indicadores que ninguém olha mas todo mundo pede?"** — marque na coluna
de observações. O inventário é a primeira oportunidade em anos de fazer essa
pergunta com dado na mão: se um indicador nunca mudou de cor e nunca gerou ação,
isso é um argumento para tirá-lo da pauta semanal.

**"Preciso mesmo separar numerador e denominador?"** — sim, e é a exigência
técnica menos negociável. Guardar "turnover = 2,1%" por área impede consolidar
corretamente: a média das médias ignora o tamanho de cada área. Guardando
desligamentos e headcount separados, qualquer recorte fecha certo.

**"Meu dado é mensal, não semanal."** — funciona, com uma perda: os comparativos
de semana ficam indisponíveis e a janela "Semana" some. O grão semanal é o que
permite comparar mês em curso com mês em curso de forma honesta. Se hoje o dado
é mensal, vale verificar se a origem consegue entregar semanal antes de decidir.

**"Alguns indicadores não têm histórico de ano anterior."** — o painel mostra o
comparativo como indisponível em vez de inventar. Vale mapear na aba 1 quais têm
histórico, porque isso muda o que dá para afirmar na reunião no primeiro ciclo.
