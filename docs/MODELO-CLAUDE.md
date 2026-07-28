# Modelo Claude padrão

Resultado da varredura dos projetos e a configuração para fixar o modelo.

---

## Recomendação: **Claude Opus 5** (`claude-opus-5`)

| | |
|---|---|
| ID exato | `claude-opus-5` |
| Contexto | 1M tokens (padrão e máximo) |
| Saída máxima | 128K tokens |
| Preço | US$ 5 / MTok entrada · US$ 25 / MTok saída |

### Por que este e não os outros

| Modelo | Preço (in/out por MTok) | Veredito para o seu uso |
|---|---|---|
| **Claude Opus 5** | 5 / 25 | **Escolhido.** Melhor modelo para trabalho agêntico longo e programação complexa. |
| Claude Fable 5 | 10 / 50 | Mais capaz de todos, mas custa o dobro. O ganho não se justifica em painéis HTML e scripts de dados. |
| Claude Sonnet 5 | 3 / 15 (intro 2/10 até 31/08/2026) | Boa alternativa se o custo apertar — qualidade próxima de Opus em código. |
| Claude Haiku 4.5 | 1 / 5 | Só para tarefas simples; contexto de 200K não cobre arquivos grandes. |

O que pesou na decisão, olhando o que existe nos seus projetos:

- **`index.html` com 175 KB e `painel/movimentacoes-filtros.html` com 86 KB** — arquivos únicos e autocontidos, sem dependências externas. Editar isso exige carregar o arquivo inteiro em contexto. Opus 5 tem 1M de contexto por padrão; Haiku (200K) não daria conta.
- **Pipeline de dados em duas linguagens** — `tools/gerar-dados.mjs` (37 KB), `tools/apurar.mjs` e quatro scripts Python que geram `.xlsx`. Trabalho multiarquivo e multilinguagem é exatamente onde Opus 5 se destaca.
- **Peso visual alto** — farol de KPIs, cartões com fundo de tendência, mockups em `docs/mockups/`. Design de frontend é um ponto forte do Opus 5.
- **Skills pessoais ativas** (`coach-alcides`, `morning`, `xlsx`, `pptx`) — dependem de seguir protocolo longo com fidelidade, sem cortar etapas.

### Ressalva sobre o alcance da varredura

Analisei **`alcidessf/KPIs-RH`** por completo (código, dados, docs, histórico git). Os outros dois repositórios da sua conta — **`alcidessf/alvo`** e **`alcidessf/investhub`**, ambos privados — não estavam autorizados nesta sessão, então li apenas nome e metadados, não o conteúdo. Se algum deles tiver um perfil de uso muito diferente (por exemplo, alto volume de chamadas repetitivas), vale reavaliar: nesse cenário `claude-sonnet-5` sai mais barato sem perda relevante.

---

## O comando para fixar o modelo

### Opção 1 — Comando único no terminal (recomendado)

Cria ou atualiza `~/.claude/settings.json` preservando o que já existe:

```bash
mkdir -p ~/.claude && touch ~/.claude/settings.json && \
[ -s ~/.claude/settings.json ] || echo '{}' > ~/.claude/settings.json && \
jq '.model = "claude-opus-5"' ~/.claude/settings.json > ~/.claude/settings.json.tmp && \
mv ~/.claude/settings.json.tmp ~/.claude/settings.json && \
cat ~/.claude/settings.json
```

Sem `jq` instalado? Abra `~/.claude/settings.json` e adicione a chave `"model"` manualmente:

```json
{
  "model": "claude-opus-5"
}
```

> Se o arquivo já tiver outras chaves, **adicione** `"model"` junto delas — não substitua o arquivo inteiro.

### Opção 2 — Dentro do Claude Code

```
/model claude-opus-5
```

Ou `/config` e escolha o modelo na lista. Simples, mas confirme depois que gravou em `~/.claude/settings.json` para valer em todas as sessões.

### Opção 3 — Travar de verdade (bloqueia troca acidental)

Se quiser que nenhum outro modelo seja sequer selecionável:

```json
{
  "model": "claude-opus-5",
  "availableModels": ["claude-opus-5"],
  "enforceAvailableModels": true,
  "fallbackModel": ["claude-sonnet-5"]
}
```

`fallbackModel` é a rede de segurança: se o Opus 5 estiver sobrecarregado, a sessão continua no Sonnet 5 em vez de falhar.

---

## Texto para as instruções gerais (`~/.claude/CLAUDE.md`)

O `settings.json` é o que efetivamente aplica o modelo. Este bloco serve para deixar a decisão registrada e explicada — útil quando você (ou o Claude) revisitar a escolha meses depois:

```markdown
## Modelo

Modelo padrão fixo: `claude-opus-5` (definido em `~/.claude/settings.json`).

Escolhido pelo perfil dos meus projetos: arquivos HTML únicos e grandes
(100–175 KB), pipelines de dados em Node e Python, geração de .xlsx e forte
componente de design visual. O contexto de 1M do Opus 5 cobre esses arquivos
inteiros; modelos menores não cobrem.

Não trocar de modelo sem eu pedir. Se o custo virar um problema em alguma
tarefa específica, sugira `claude-sonnet-5` para aquela tarefa em vez de
alterar o padrão global.
```

---

## Escopos de configuração

Precedência: usuário → projeto → local (o último sobrescreve os anteriores).

| Arquivo | Alcance | Quando usar |
|---|---|---|
| `~/.claude/settings.json` | Todos os seus projetos | **É este que você quer** — vale para KPIs-RH, alvo e investhub |
| `.claude/settings.json` | Um projeto (versionado) | Só se um projeto exigir modelo diferente e a equipe precisar herdar |
| `.claude/settings.local.json` | Um projeto (não versionado) | Sobrescrita pessoal pontual |

---

## Como conferir se pegou

```bash
jq -r '.model' ~/.claude/settings.json
```

Deve imprimir `claude-opus-5`. Dentro do Claude Code, `/status` mostra o modelo ativo da sessão.
