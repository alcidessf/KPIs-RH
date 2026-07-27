#!/usr/bin/env python3
"""
Gera `modelo-semanal.xlsx`, a planilha que alimenta o painel de movimentações.

    python3 tools/criar-modelo-semanal.py

Rotina da semana:
  1. atualizar os números na aba Dados (células amarelas)
  2. conferir a aba Conferência — ela acusa soma que não fecha
  3. na aba Dados: Ctrl+A, Ctrl+C
  4. abrir painel/movimentacoes.html, "Atualizar dados", colar, Aplicar
  5. revisar os textos na tela e "Salvar semana"
  6. publicar o arquivo gerado na pasta de rede

A aba Dados é deliberadamente crua: cada bloco comeca com um marcador #NOME na
coluna A, e o painel le exatamente esse formato quando colado. Nao mexa nos
marcadores nem nos nomes das colunas.
"""

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

# ------------------------------------------------------------------ #
# Estilo — paleta institucional
# ------------------------------------------------------------------ #
FONTE = "Arial"
VERDE_ESCURO = "2E4C46"
VERDE = "00694A"
TINTA = "1E2A26"
CINZA = "6E7873"

F_TITULO = Font(name=FONTE, size=15, bold=True, color=VERDE_ESCURO)
F_SUB = Font(name=FONTE, size=10, color=CINZA)
F_SECAO = Font(name=FONTE, size=10, bold=True, color="FFFFFF")
F_CAB = Font(name=FONTE, size=9, bold=True, color=VERDE_ESCURO)
F_TXT = Font(name=FONTE, size=10, color=TINTA)
F_CHAVE = Font(name="Consolas", size=9, color=CINZA)
F_ENTRADA = Font(name=FONTE, size=10, color="0000FF")
F_NEG = Font(name=FONTE, size=10, bold=True, color=TINTA)

P_SECAO = PatternFill("solid", fgColor=VERDE)
P_CAB = PatternFill("solid", fgColor="E4F0EA")
P_ENTRADA = PatternFill("solid", fgColor="FAF4D0")
P_CALC = PatternFill("solid", fgColor="EDEFEA")

FIO = Side(style="thin", color="CBD2CA")
BORDA = Border(left=FIO, right=FIO, top=FIO, bottom=FIO)
ESQ = Alignment(vertical="center", horizontal="left", wrap_text=False)
TOPO = Alignment(vertical="top", wrap_text=True)

wb = Workbook()

# ================================================================== #
# Aba Dados — é este bloco que se copia inteiro
# ================================================================== #
ws = wb.active
ws.title = "Dados"
ws.sheet_view.showGridLines = False

larguras = [22, 26, 12, 10, 12, 12, 12, 16, 12, 14, 14, 12, 10, 10, 10]
for i, w in enumerate(larguras, start=1):
    ws.column_dimensions[get_column_letter(i)].width = w

linha = 1


def secao(nome):
    """Marcador de bloco. O painel corta a colagem por estes marcadores."""
    global linha
    c = ws.cell(row=linha, column=1, value="#" + nome)
    c.font = F_SECAO
    c.fill = P_SECAO
    for j in range(2, 16):
        ws.cell(row=linha, column=j).fill = P_SECAO
    linha += 1


def cabecalho(colunas):
    global linha
    for j, nome in enumerate(colunas, start=1):
        c = ws.cell(row=linha, column=j, value=nome)
        c.font = F_CAB
        c.fill = P_CAB
        c.border = BORDA
        c.alignment = ESQ
    linha += 1


def dados(valores, chave_na_primeira=True):
    global linha
    for j, v in enumerate(valores, start=1):
        c = ws.cell(row=linha, column=j, value=v)
        c.border = BORDA
        c.alignment = ESQ
        if j == 1 and chave_na_primeira:
            c.font = F_CHAVE
            c.fill = P_CALC
        else:
            c.font = F_ENTRADA
            c.fill = P_ENTRADA
    linha += 1


def branco():
    global linha
    linha += 1


# --- META ---------------------------------------------------------
secao("META")
for chave, valor in [
    ("titulo", "Movimentações"),
    ("periodo", "Julho 2026"),
    ("semana", 30),
    ("recorte", "Consolidado — todas as empresas"),
    ("janela", "Mês (MTD)"),
    ("regua", "MTD com 4 de 4,4 semanas"),
]:
    dados([chave, valor])
branco()

# --- KPI ----------------------------------------------------------
secao("KPI")
cabecalho(["id", "titulo", "taxa", "qtd", "unidade", "sem_qtd", "sem_taxa",
           "mes_ant_rotulo", "mes_ant", "media_atual", "media_ant", "direcao", "estado"])
dados(["turnover", "Turnover geral", 1.70, 91, "saídas", 19, 0.36, "Junho", 123, 119, 105, "menor", "auto"])
dados(["voluntario", "Voluntários", 0.92, 49, "saídas", 7, 0.13, "Junho", 78, 75.3, 74.6, "menor", "auto"])
dados(["involuntario", "Involuntários", 0.79, 42, "saídas", 12, 0.22, "Junho", 45, 43.5, 32.7, "menor", "auto"])
dados(["admitidos", "Admitidos", 1.46, 78, "entradas", None, None, "Junho", 85, None, None, "", "auto"])
branco()

# --- SERIE --------------------------------------------------------
secao("SERIE")
cabecalho(["id", "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"])
dados(["turnover", 93, 147, 116, 119, 115, 123, 91])
dados(["voluntario", 69, 63, 82, 82, 78, 78, 49])
dados(["involuntario", 24, 84, 34, 37, 37, 45, 42])
dados(["admitidos"])
branco()

# --- PERFIL -------------------------------------------------------
secao("PERFIL")
cabecalho(["id", "titulo", "valor", "pct", "pct_rotulo", "incidencia_rotulo", "incidencia",
           "mes_ant_rotulo", "mes_ant", "media_atual", "media_ant", "direcao", "estado"])
dados(["lideres", "Líderes desligados", 9, 9.9, "das saídas", "Taxa sobre líderes", None,
       "Junho", 4, None, None, "menor", "auto"])
dados(["ate1ano", "Até 1 ano", 32, 35.2, "das saídas", "Taxa de incidência", None,
       "Junho", None, None, None, "menor", "auto"])
branco()

# --- MOTIVOS ------------------------------------------------------
secao("MOTIVOS")
cabecalho(["familia", "motivo", "qtd"])
for fam, mot, q in [
    ("Voluntário", "Particular", 40),
    ("Voluntário", "Proposta externa", 4),
    ("Voluntário", "Mudança de cidade", 2),
    ("Involuntário", "Performance", 16),
    ("Involuntário", "Cultura organizacional", 7),
    ("Involuntário", "Redução de quadro", 7),
]:
    dados([fam, mot, q], chave_na_primeira=False)
branco()

# --- DIRETORIAS ---------------------------------------------------
secao("DIRETORIAS")
cabecalho(["sigla", "vol", "inv", "total", "pct", "taxa", "indice"])
dados(["FLO", 32, 29, 61, 67.0, None, None], chave_na_primeira=False)
dados(["IND", 6, 6, 12, 13.2, None, None], chave_na_primeira=False)
dados(["TRP", 6, 1, 7, 7.7, None, None], chave_na_primeira=False)
branco()

# --- TEXTO --------------------------------------------------------
secao("TEXTO")
for chave, valor in [
    ("insight", "**Julho:** volume desacelera 26% vs junho, puxado pelo voluntário (−37%). "
                "**Atenção no involuntário** — igual à média de 2026, mas **+28% acima da média de 2025**. "
                "**Alerta nos líderes:** 9 saídas contra 4 em junho."),
    ("nota_motivos", "**“Particular” = 82% dos pedidos de demissão.** O motivo mais frequente é "
                     "“não sabemos”: achado de codificação, não de visualização."),
    ("nota_diretorias", "**Ranking de tamanho, não de risco.** Falta headcount por diretoria para "
                        "calcular taxa e índice de sobre-representação."),
]:
    dados([chave, valor])

ULTIMA_LINHA = linha - 1

# ================================================================== #
# Aba Conferência — acusa soma que não fecha antes de ir para a tela
# ================================================================== #
wc = wb.create_sheet("Conferência")
wc.sheet_view.showGridLines = False
for col, w in [("A", 3), ("B", 46), ("C", 14), ("D", 14), ("E", 40)]:
    wc.column_dimensions[col].width = w

wc["B2"] = "Conferência automática"
wc["B2"].font = F_TITULO
wc["B3"] = "Calcula ao abrir no Excel. Resolva os OLHAR antes de colar no painel."
wc["B3"].font = F_SUB

# localiza as linhas da aba Dados que as fórmulas precisam referenciar
LIN = {}
for r in range(1, ULTIMA_LINHA + 1):
    v = ws.cell(row=r, column=1).value
    if isinstance(v, str) and v and not v.startswith("#"):
        LIN.setdefault(v, r)

r = 5
checagens = [
    ("Voluntários + Involuntários = Turnover (mês)",
     f"='Dados'!D{LIN['voluntario']}+'Dados'!D{LIN['involuntario']}",
     f"='Dados'!D{LIN['turnover']}"),
    ("Voluntários + Involuntários = Turnover (semana)",
     f"='Dados'!F{LIN['voluntario']}+'Dados'!F{LIN['involuntario']}",
     f"='Dados'!F{LIN['turnover']}"),
    ("Soma dos motivos voluntários = desligados voluntários",
     "=SUMIFS('Dados'!C:C,'Dados'!A:A,\"Voluntário\")",
     f"='Dados'!D{LIN['voluntario']}"),
    ("Soma dos motivos involuntários = desligados involuntários",
     "=SUMIFS('Dados'!C:C,'Dados'!A:A,\"Involuntário\")",
     f"='Dados'!D{LIN['involuntario']}"),
    ("Soma das diretorias (top 3) <= turnover do mês",
     f"=SUM('Dados'!D{LIN['FLO']}:D{LIN['TRP']})",
     f"='Dados'!D{LIN['turnover']}"),
    ("Série mensal do turnover fecha com o acumulado informado",
     f"=SUM('Dados'!B{LIN['turnover']+0}:M{LIN['turnover']+0})", ""),
]
# a linha da série tem o mesmo id: pega a segunda ocorrência
serie_turnover = [rr for rr in range(1, ULTIMA_LINHA + 1)
                  if ws.cell(row=rr, column=1).value == "turnover"][-1]
checagens[-1] = ("Soma da série mensal do turnover (só para conferir com o seu YTD)",
                 f"=SUM('Dados'!B{serie_turnover}:M{serie_turnover})", "")

for col, titulo in [("B", "Verificação"), ("C", "Calculado"), ("D", "Esperado"), ("E", "Situação")]:
    c = wc[f"{col}4"]
    c.value = titulo
    c.font = F_CAB
    c.fill = P_CAB
    c.border = BORDA

for texto, formula, esperado in checagens:
    wc.cell(row=r, column=2, value=texto).font = F_TXT
    wc.cell(row=r, column=2).alignment = TOPO
    cc = wc.cell(row=r, column=3, value=formula)
    cc.font = F_NEG
    cc.fill = P_CALC
    if esperado:
        ce = wc.cell(row=r, column=4, value=esperado)
        ce.font = F_NEG
        ce.fill = P_CALC
        cs = wc.cell(row=r, column=5, value=f'=IF(C{r}=D{r},"OK","OLHAR: diferença de "&TEXT(C{r}-D{r},"0.##"))')
    else:
        cs = wc.cell(row=r, column=5, value="Compare com o YTD do seu relatório")
    cs.font = F_TXT
    cs.alignment = TOPO
    for j in range(2, 6):
        wc.cell(row=r, column=j).border = BORDA
    r += 1

# ================================================================== #
# Aba Instruções
# ================================================================== #
wi = wb.create_sheet("Instruções")
wi.sheet_view.showGridLines = False
for col, w in [("A", 3), ("B", 30), ("C", 92)]:
    wi.column_dimensions[col].width = w

wi["B2"] = "Painel de movimentações — atualização semanal"
wi["B2"].font = F_TITULO
wi["B3"] = "Da planilha à pasta de rede em cinco passos, sem instalar nada."
wi["B3"].font = F_SUB

blocos = [
    ("Rotina da semana", None),
    ("1. Atualizar", "Na aba Dados, troque os valores das células amarelas. As células cinza da "
                     "primeira coluna são chaves que o painel usa para se localizar — não mexa nelas, "
                     "nem nos marcadores #META, #KPI e afins, nem nos nomes das colunas."),
    ("2. Conferir", "Vá à aba Conferência. Ela recalcula sozinha ao abrir e acusa toda soma que não "
                    "fecha. Resolva os OLHAR antes de seguir."),
    ("3. Copiar", "Volte à aba Dados, Ctrl+A e Ctrl+C."),
    ("4. Colar no painel", "Abra painel/movimentacoes.html, clique em Atualizar dados, cole na caixa e "
                           "clique em Aplicar. A tela se redesenha na hora."),
    ("5. Publicar", "Revise os textos direto na tela (o insight e as duas notas são editáveis), clique "
                    "em Salvar semana e coloque o arquivo gerado na pasta de rede. Cada semana vira um "
                    "arquivo próprio — vale como registro do que foi apresentado e comentado."),
    ("Como preencher os campos", None),
    ("Negrito nos textos", "Escreva **assim** para deixar em negrito no painel. Vale no insight e nas duas "
                        "notas."),
    ("Célula em branco", "Deixe vazia quando o dado não existir. A tela mostra “sem dado” em cinza e "
                         "conta no selo do topo. Nunca preencha com zero para tapar buraco: zero é uma "
                         "afirmação, vazio é a verdade."),
    ("direcao", "menor = quanto menor melhor (rotatividade). maior = quanto maior melhor (treinamento). "
                "Vazio = não sabemos o que é melhorar; o cartão fica cinza e as setas não julgam. "
                "É o caso de Admitidos enquanto a regra não estiver definida."),
    ("estado", "auto deixa o painel calcular o farol: conta quantas comparações disponíveis estão "
               "piores. Nenhuma pior = verde; até metade = amarelo; mais da metade = vermelho. "
               "Para sobrepor, escreva bom, atencao, critico ou nd."),
    ("taxa e qtd", "taxa é o percentual sobre o headcount; qtd é o número de pessoas. Os dois aparecem "
                   "lado a lado no cartão."),
    ("SERIE", "Uma linha por indicador, um mês por coluna, na ordem. Meses ainda não fechados ficam "
              "em branco — a linha de tendência simplesmente para ali."),
    ("MOTIVOS", "O painel mostra os três primeiros de cada família. Separe voluntário de involuntário: "
                "“por que nos deixam” e “por que desligamos” são conversas diferentes. O percentual de "
                "cada motivo é calculado sobre o total de desligamentos daquele tipo (vem do bloco KPI), "
                "não sobre a soma dos três."),
    ("DIRETORIAS", "taxa e indice ficam em branco enquanto não houver headcount por diretoria. Sem "
                   "eles o ranking é de tamanho, não de risco — a tela avisa isso sozinha."),
    ("A logo", None),
    ("Trocar a logo", "No painel, botão Trocar logo, escolha o arquivo (PNG, JPG ou SVG). Ela é "
                      "embutida no HTML, então continua aparecendo mesmo com o arquivo fora da rede. "
                      "Depois use Salvar semana para gravar o painel já com a logo."),
    ("Publicação", None),
    ("Pasta de rede", "O arquivo é autossuficiente: não busca nada na internet, não usa fonte externa, "
                      "não faz chamada de rede. Abre por duplo clique ou por caminho de rede."),
    ("Para o PPT", "A tela é 16:9. Dê um print da área do painel e cole no slide — encaixa sem sobra. "
                   "Ou use Imprimir / PDF, que já sai em paisagem só com o painel."),
]

r = 5
for titulo, texto in blocos:
    if texto is None:
        wi.cell(row=r, column=2, value=titulo).font = Font(name=FONTE, size=11, bold=True, color=VERDE)
        r += 1
        continue
    wi.cell(row=r, column=2, value=titulo).font = F_NEG
    wi.cell(row=r, column=2).alignment = TOPO
    c = wi.cell(row=r, column=3, value=texto)
    c.font = F_TXT
    c.alignment = TOPO
    wi.row_dimensions[r].height = 14 * (1 + len(texto) // 98)
    r += 1

wb.move_sheet("Instruções", offset=-2)
destino = RAIZ / "modelo-semanal.xlsx"
wb.save(destino)
print(f"{destino.name} gerado — abas: {', '.join(wb.sheetnames)} · bloco de dados até a linha {ULTIMA_LINHA}")
