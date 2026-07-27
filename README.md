# Farol de KPIs de RH

Painel web de KPIs estratégicos de RH em formato de farol, para a leitura semanal
de comitê. Uma tela substitui o bloco de slides de acumulados: cada indicador
mostra a semana, o mês em curso e o acumulado do ano ao mesmo tempo, com
comparativo contra o ano anterior e a análise das causas junto do número.

Abre em tablet e celular, filtra por empresa, diretoria e área, e não depende de
servidor: é um único arquivo HTML.

> O conjunto de dados incluído é **sintético**, gerado para validar a visão.
> Substitua pelos dados reais seguindo [`docs/MODELO-DE-DADOS.md`](docs/MODELO-DE-DADOS.md).

---

## Usar

```bash
# abrir direto (sem servidor)
open index.html            # macOS
xdg-open index.html        # Linux

# ou servir, se preferir uma URL de rede para abrir no tablet
npx http-server . -p 8080
```

Para publicar: qualquer host estático serve. No GitHub Pages, basta ativar Pages
apontando para a branch — `index.html` está na raiz e não tem dependências
externas.

---

## O que a tela faz

**Janela de leitura.** Alternador Semana / Mês / Ano. Muda o número de destaque e
os dois comparativos; a faixa de baixo de cada cartão continua mostrando os três
ao mesmo tempo, para não precisar trocar de aba para responder "e no ano?".

**Farol.** Verde dentro da meta, amarelo fora da meta mas dentro da tolerância,
vermelho acima do limite, cinza não apurado. Os contadores no topo são clicáveis
e filtram a grade — em uma reunião, clicar em "Fora da meta" é a pauta.

**Comparativo de período comparável.** O mês em curso com 4 semanas decorridas é
comparado com as **primeiras 4 semanas** do mês anterior e do mesmo mês do ano
anterior. Nunca contra um mês fechado inteiro.

**Base mensal para indicadores de fluxo.** Rotatividade, custo por colaborador e
horas de treinamento são convertidos para base mensal independente da janela, e
só por isso semana, mês e ano são comparáveis entre si e com a meta.

**Análise junto do número.** Cada cartão abre com histórico mês a mês contra o
ano anterior, tabela equivalente, motivos, ações em curso e responsável. Os
textos são editáveis na própria tela.

**Filtros.** Empresa → diretoria → área, em cascata. O estado vai para a URL, então
uma visão filtrada pode ser compartilhada por link.

**Saídas.** `Copiar resumo` gera o resumo executivo em texto, pronto para e-mail
ou ata. `PDF` abre a impressão com todas as análises expandidas.

Também: tema claro/escuro, navegação por teclado nos gráficos, tabela equivalente
para cada gráfico.

---

## Indicadores

| Indicador | Cálculo | Direção |
|---|---|---|
| Headcount ativo | ativos no fim do período, contra o orçado | faixa |
| Rotatividade total | desligamentos ÷ headcount médio | menor |
| Rotatividade voluntária | desligamentos a pedido ÷ headcount médio | menor |
| Absenteísmo | horas de ausência ÷ horas previstas | menor |
| Horas extras | horas extras ÷ horas previstas | menor |
| Custo médio por colaborador | custo de folha ÷ headcount médio | menor |
| Tempo médio de preenchimento | Σ dias de abertura ÷ vagas fechadas | menor |
| Vagas em aberto | requisições abertas, contra teto proporcional ao quadro | menor |
| Treinamento por colaborador | horas de treinamento ÷ headcount médio | maior |
| Taxa de frequência de acidentes | acidentes × 10⁶ ÷ horas-homem | menor |
| e-NPS | % promotores − % detratores | maior |
| Mulheres em liderança | posições de liderança ocupadas por mulheres ÷ total | maior |

Acrescentar, remover ou renomear indicadores é editar o array `KPIS` em
`tools/gerar-dados.mjs`. Nada no painel é codificado por indicador.

---

## Estrutura

```
index.html                 painel completo — HTML, CSS, JS e dados em um arquivo
dados.json                 os mesmos dados soltos, para inspeção e para o BI
tools/gerar-dados.mjs      gera os dados e reinjeta o bloco em index.html
tools/apurar.mjs           apura os KPIs no terminal, com as mesmas regras
docs/MODELO-DE-DADOS.md    contrato de dados: métricas, fórmulas, metas, janelas
```

### Atualizar os dados

```bash
node tools/gerar-dados.mjs
```

Reescreve `dados.json` e substitui o bloco `<script id="kpi-dados">` dentro de
`index.html`. Para dados reais, troque a montagem de `fatos` por uma leitura do
seu extrator — o contrato está documentado e não muda.

### Conferir contra o BI

`tools/apurar.mjs` aplica as mesmas fórmulas, metas e janelas fora do navegador.
Se o número dele bater com o do seu relatório oficial, o painel também bate.

```bash
node tools/apurar.mjs                                        # tudo, três janelas
node tools/apurar.mjs --lente mes
node tools/apurar.mjs --empresa "Empresa Gama" --lente mes
node tools/apurar.mjs --por area --kpi turnover_vol --lente mes
node tools/apurar.mjs --json                                 # para diff automatizado
```

---

## Decisões de projeto que valem conhecer

**Componentes brutos, não métricas prontas.** O painel guarda `desligamentos` e
`headcount`, não `turnover`. Taxas não somam entre áreas; numeradores e
denominadores somam. É o que permite filtrar sem calcular média de médias.

**Metas por recorte.** Uma meta única raramente serve para todos os níveis. Custo
médio por colaborador tem orçado por empresa, porque o mix de cargos entre
indústria, varejo e tecnologia torna a média do grupo inútil como referência.
Teto de vagas é proporcional ao quadro, pelo mesmo motivo.

**"Não apurado" é uma resposta.** e-NPS é trimestral. Na leitura semanal ele
aparece em cinza como sem apuração, não como zero e não como o último valor
repetido.

**Comentário sabe de onde veio.** Se você filtra uma empresa e só existe análise
do consolidado, o painel avisa na tela — um texto com números fixos vira mentira
quando aplicado a outro recorte.

---

## Próximos passos sugeridos

- **Metas por diretoria** onde a meta do grupo não faz sentido (absenteísmo de CD
  e de escritório não deveriam ser cobrados na mesma régua).
- **Alertas cruzados**: horas extras em alta antecede acidentes; vagas em aberto
  antecede horas extras. Hoje isso está escrito nos comentários, poderia ser
  regra.
- **Histórico de comentários** por semana, para o painel virar registro do que foi
  dito e decidido, não só a foto atual.
- **Publicação dos comentários** direto da tela — hoje a edição fica no navegador
  e precisa ser levada ao gerador para virar oficial.
