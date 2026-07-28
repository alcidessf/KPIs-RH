# Modelo Claude — decisão e configuração

Varredura dos três repositórios da conta `alcidessf` e o padrão de modelo adotado.

---

## Duas decisões diferentes

A palavra "modelo" aparece em dois lugares que não se confundem:

| | O que é | Quem paga | Configurado em |
|---|---|---|---|
| **Modelo agente** | O Claude que lê e escreve o código destes projetos | Sua assinatura Claude Code | `settings.json` |
| **Modelo de runtime** | O Claude que o app chama em produção, para o usuário final | Sua chave de API, por token | Código-fonte |

São escolhas independentes e a resposta certa é diferente em cada uma.

---

## Modelo agente: **Claude Opus 5** nos três projetos

`claude-opus-5` — 1M de contexto, 128K de saída, US$ 5/25 por MTok.

| Projeto | Stack | Por que Opus 5 |
|---|---|---|
| **alvo** | Expo / React Native, Supabase, RevenueCat, publicado na App Store e Play Store | App em produção com usuários pagantes. Mudança errada vira release quebrado e review de loja. |
| **investhub** | React + Vite, Supabase, Stripe, motor TWRR/MWR próprio | `DashboardPage.jsx` tem 52 KB, `OperationsPage.jsx` 44 KB. Cálculo financeiro errado dá prejuízo silencioso. |
| **KPIs-RH** | HTML autocontido, pipeline Node + Python, geração de .xlsx | `index.html` tem 175 KB e é editado inteiro. Modelos com 200K de contexto não cabem. |

Não diferenciei entre os três porque os dados não sustentam diferenciação: todos têm arquivos grandes, mais de uma linguagem e peso visual alto. Escolher modelos distintos só para parecer criterioso seria inventar uma distinção que não existe.

Descartei o **Fable 5** (US$ 10/50) porque custa o dobro e o ganho não aparece neste tipo de trabalho. O **Haiku 4.5** não entra: 200K de contexto não cobre os arquivos.

---

## Modelo de runtime: **Claude Sonnet 5** no investhub

O `investhub` é o único projeto que chama a API em produção, em `src/services/claudeApi.js` — o assessor financeiro por IA do onboarding.

Aqui a escolha se inverte, e de propósito: é um fluxo conversacional que roda a cada usuário novo, com orçamentos de 80 a 1500 tokens por chamada, coletando dados estruturados. Latência e custo por chamada pesam mais que profundidade de raciocínio. **Opus seria caro e lento sem entregar resposta melhor.**

### O que estava quebrado

O código usava `claude-sonnet-4-20250514`. **Esse modelo foi descontinuado em 15 de junho de 2026** — mais de um mês atrás. Chamadas a modelos aposentados retornam HTTP 404, o que significa que a assessoria por IA do onboarding provavelmente **já está fora do ar em produção**.

### O que foi corrigido

**1. Modelo atualizado** — `claude-sonnet-4-20250514` → `claude-sonnet-5`, a substituição direta indicada pela Anthropic.

**2. Raciocínio desligado explicitamente** — e este é o ponto que teria quebrado tudo em silêncio. O Sonnet 5 liga raciocínio adaptativo por padrão, coisa que o Sonnet 4 não fazia, e `max_tokens` limita **raciocínio + resposta somados**. Com `maxTokens: 80` numa das chamadas do `advisor.js`, o raciocínio consumiria a cota inteira e a resposta viria truncada ou vazia. Adicionado `thinking: { type: 'disabled' }`.

**3. Extração de texto robusta** — a linha era `data.content?.[0]?.text || ''`, que assume que o primeiro bloco é texto. Com raciocínio ligado, o primeiro bloco é um bloco de raciocínio: o `?.text` daria `undefined`, o `|| ''` devolveria string vazia e **a tela apareceria em branco sem erro nenhum**. Agora procura o bloco de texto em vez de indexar posição fixa. Isso protege a correção mesmo se alguém religar o raciocínio depois.

**4. Recusas tratadas** — os classificadores de segurança podem recusar uma requisição devolvendo HTTP 200 com `stop_reason: "refusal"` e conteúdo vazio. Sem tratar, viraria outra tela em branco silenciosa. Agora lança erro com mensagem legível.

### Pendência que não toquei

O arquivo chama a API direto do navegador com `anthropic-dangerous-direct-browser-access: true`, o que **expõe a chave da API no bundle do frontend** — qualquer usuário consegue extraí-la e gastar sua cota. O próprio comentário no topo do arquivo já reconhece isso e aponta a saída: mover para uma Edge Function do Supabase.

Deixei como está porque é refatoração de arquitetura, não ajuste de modelo, e vai além do que você pediu. Mas é mais grave que o modelo desatualizado — vale priorizar.

---

## Configuração aplicada

Cada projeto recebeu `.claude/settings.json`:

```json
{
  "model": "claude-opus-5",
  "fallbackModel": ["claude-sonnet-5"]
}
```

O `fallbackModel` é rede de segurança: se o Opus 5 estiver sobrecarregado, a sessão segue no Sonnet 5 em vez de falhar.

Fica versionado, então a decisão viaja com o repositório e sobrevive a troca de máquina.

---

## Instrução geral, para todos os demais projetos

Para os projetos que ainda não existem ou que não estão nesta conta, o padrão vem do nível global.

### 1. Fixar o modelo

```bash
mkdir -p ~/.claude && touch ~/.claude/settings.json && \
[ -s ~/.claude/settings.json ] || echo '{}' > ~/.claude/settings.json && \
jq '.model = "claude-opus-5" | .fallbackModel = ["claude-sonnet-5"]' ~/.claude/settings.json > ~/.claude/settings.json.tmp && \
mv ~/.claude/settings.json.tmp ~/.claude/settings.json && \
cat ~/.claude/settings.json
```

Preserva as chaves que já existirem. Sem `jq`, adicione `"model"` e `"fallbackModel"` à mão — **junto** das chaves atuais, sem substituir o arquivo.

### 2. Registrar a regra em `~/.claude/CLAUDE.md`

O `settings.json` aplica; este bloco explica, para quando a decisão for revisitada:

```markdown
## Modelo

Padrão: `claude-opus-5`, com `claude-sonnet-5` como fallback.
Definido em `~/.claude/settings.json` e replicado no `.claude/settings.json`
de cada projeto.

Escolhido pelo perfil dos meus projetos: arquivos grandes editados por
inteiro (100–175 KB), mais de uma linguagem por projeto, peso alto de
design visual e apps em produção com usuários pagantes.

Não trocar de modelo sem eu pedir. Se o custo virar problema numa tarefa
específica, sugira `claude-sonnet-5` para aquela tarefa, sem alterar o padrão.

### Quando um projeto meu CHAMA a API Claude em produção

Regra separada — não herda o padrão acima. Escolha pelo perfil da chamada:

- Alto volume, voltado ao usuário final, latência importa, tarefa
  estruturada (chat, classificação, extração) → `claude-sonnet-5`
- Raciocínio profundo, execução longa, correção acima de custo → `claude-opus-5`
- Classificação trivial em volume muito alto → `claude-haiku-4-5`

Ao mexer em qualquer chamada de API:
- Nunca inventar ou deduzir um ID de modelo. Conferir a lista oficial antes.
- `max_tokens` limita raciocínio + resposta somados. Orçamento apertado
  com raciocínio ligado trunca a resposta.
- Ler o bloco de texto procurando por `type === 'text'`, nunca indexando
  `content[0]` — outros tipos de bloco podem vir antes.
- Tratar `stop_reason: "refusal"` antes de ler o conteúdo.
- Nunca expor chave de API em bundle de frontend. Proxy no backend.
```

### 3. Revisar quando um modelo for descontinuado

O que aconteceu no investhub se repete: modelos são aposentados e o código continua apontando para eles até quebrar em produção. Antes de considerar um projeto pronto, vale rodar isto na raiz:

```bash
grep -rn "claude-[a-z0-9-]*" --include="*.js" --include="*.jsx" \
  --include="*.ts" --include="*.tsx" --include="*.py" . | grep -v node_modules
```

Cada ID que aparecer precisa constar na lista de modelos ativos.

---

## Como conferir

```bash
jq -r '.model' ~/.claude/settings.json          # global
jq -r '.model' .claude/settings.json            # dentro de um projeto
```

Ambos devem imprimir `claude-opus-5`. Dentro do Claude Code, `/status` mostra o modelo ativo da sessão.
