#!/usr/bin/env python3
"""
Gera `base-movimentacoes.xlsx`: a base por segmento que alimenta o painel com
filtros ativos.

    python3 tools/criar-base-filtros.py

A diferença para o modelo anterior é de fundo. Antes a planilha trazia o
indicador já calculado para um recorte só; agora ela traz os COMPONENTES BRUTOS
por segmento e por período, e o painel agrega no navegador conforme o filtro.
É o que permite filtrar sem cair em média de médias: taxa não soma entre áreas,
numerador e denominador somam.

Abas:
  Instruções   como preencher e o que é real x ilustrativo nesta versão
  Config       período de referência, rótulos, sinalizadores
  Fatos        uma linha por segmento por período — o coração da base
  Motivos      uma linha por segmento por motivo, no período corrente
  Textos       insight e notas
  Conferência  somas que precisam fechar antes de publicar

PROCEDÊNCIA DOS NÚMEROS DE EXEMPLO
  Reais, extraídos das telas enviadas:
    - julho/2026 por diretoria (voluntário, involuntário, líderes), da tabela
      Detalhado: FLO 32/29/4, IND 6/6/1, TRP 6/1/0, LOG 2/4/3, CORP 3/2/1
    - totais mensais de 2026 e o YTD de 2026 e 2025
    - motivos e as semanas de julho
  Derivados para fechar com os totais impressos:
    - a série mensal de 2025, montada para somar 751 no acumulado até julho e
      1.260 no ano (que é a média mensal de 105 informada)
    - a distribuição por segmento nos meses anteriores, que replica a proporção
      de julho
  Ilustrativos, precisam ser substituídos:
    - headcount por segmento, headcount de liderança e de quem tem menos de um
      ano de casa, e a subdivisão em áreas
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
VERDE_ESCURO, VERDE, TINTA, CINZA = "2E4C46", "00694A", "1E2A26", "6E7873"

F_TITULO = Font(name=FONTE, size=15, bold=True, color=VERDE_ESCURO)
F_SUB = Font(name=FONTE, size=10, color=CINZA)
F_CAB = Font(name=FONTE, size=9, bold=True, color="FFFFFF")
F_TXT = Font(name=FONTE, size=10, color=TINTA)
F_NEG = Font(name=FONTE, size=10, bold=True, color=TINTA)
F_CHAVE = Font(name="Consolas", size=9, color=CINZA)
F_ENTRADA = Font(name=FONTE, size=10, color="0000FF")

P_CAB = PatternFill("solid", fgColor=VERDE)
P_ENTRADA = PatternFill("solid", fgColor="FAF4D0")
P_CALC = PatternFill("solid", fgColor="EDEFEA")
P_DIM = PatternFill("solid", fgColor="E4F0EA")

FIO = Side(style="thin", color="CBD2CA")
BORDA = Border(left=FIO, right=FIO, top=FIO, bottom=FIO)
ESQ = Alignment(vertical="center", horizontal="left")
TOPO = Alignment(vertical="top", wrap_text=True)

# ================================================================== #
# 1. Estrutura e números conhecidos
# ================================================================== #

# (empresa, diretoria, area, hc, hc_lideres, hc_ate1ano)  — hc é ilustrativo
SEGMENTOS = [
    ("Operações",   "FLO",  "Colheita",       1800, 105, 330),
    ("Operações",   "FLO",  "Silvicultura",    900,  57, 160),
    ("Operações",   "IND",  "Produção",        750,  46, 135),
    ("Operações",   "IND",  "Manutenção",      350,  24,  60),
    ("Operações",   "TRP",  "Frota",           620,  38, 105),
    ("Operações",   "LOG",  "Expedição",       560,  34, 100),
    ("Corporativo", "CORP", "Administrativo",  368,  25,  73),
]

# julho/2026 por segmento — real por diretoria, subdividido em áreas
JULHO = {                    # area: (vol, inv, lideres, ate1ano, admitidos)
    "Colheita":       (22, 20, 3, 15, 26),
    "Silvicultura":   (10,  9, 1,  7, 14),
    "Produção":       ( 4,  4, 1,  3, 12),
    "Manutenção":     ( 2,  2, 0,  1,  6),
    "Frota":          ( 6,  1, 0,  2,  8),
    "Expedição":      ( 2,  4, 3,  2,  8),
    "Administrativo": ( 3,  2, 1,  2,  4),
}

# totais mensais conhecidos
VOL_2026 = [69, 63, 82, 82, 78, 78, 49]
INV_2026 = [24, 84, 34, 37, 37, 45, 42]
ADM_2026 = [74, 96, 88, 91, 84, 85, 78]          # ilustrativo, exceto jun e jul

TOT_2025 = [73, 96, 142, 128, 119, 98, 95, 87, 105, 87, 99, 131]   # soma 1260
FRACAO_VOL_2025 = 522 / 751                                        # do YTD impresso

SEMANAS_JULHO = {            # semana: (vol, inv) do slide original
    "S1": (19, 14),
    "S2": (23, 16),
    "S3": (7, 12),
}

MOTIVOS = [
    ("Voluntário", "Particular", 40),
    ("Voluntário", "Proposta externa", 4),
    ("Voluntário", "Mudança de cidade", 2),
    ("Voluntário", "Outros", 3),
    ("Involuntário", "Performance", 16),
    ("Involuntário", "Cultura organizacional", 7),
    ("Involuntário", "Redução de quadro", 7),
    ("Involuntário", "Excesso de faltas", 6),
    ("Involuntário", "Violação de procedimentos", 3),
    ("Involuntário", "Reestruturação de área", 3),
]


def repartir(total, pesos):
    """Divide um inteiro por pesos preservando a soma (maior resto)."""
    soma = sum(pesos)
    if soma == 0 or total == 0:
        return [0] * len(pesos)
    brutos = [total * p / soma for p in pesos]
    base = [int(b) for b in brutos]
    resto = total - sum(base)
    ordem = sorted(range(len(pesos)), key=lambda i: brutos[i] - base[i], reverse=True)
    for i in ordem[:resto]:
        base[i] += 1
    return base


AREAS = [s[2] for s in SEGMENTOS]
PESO_VOL = [JULHO[a][0] for a in AREAS]
PESO_INV = [JULHO[a][1] for a in AREAS]
PESO_HC = [s[3] for s in SEGMENTOS]
PESO_LID = [JULHO[a][2] for a in AREAS]
PESO_1ANO = [JULHO[a][3] for a in AREAS]

fatos = []      # (empresa, diretoria, area, periodo, hc, hc_lid, hc_1ano, adm, vol, inv, lid, a1)


def emitir(periodo, vol_tot, inv_tot, adm_tot, lid_tot, a1_tot, exatos=None):
    vol = exatos["vol"] if exatos else repartir(vol_tot, PESO_VOL)
    inv = exatos["inv"] if exatos else repartir(inv_tot, PESO_INV)
    adm = exatos["adm"] if exatos else repartir(adm_tot, PESO_HC)
    lid = exatos["lid"] if exatos else repartir(lid_tot, PESO_LID)
    a1 = exatos["a1"] if exatos else repartir(a1_tot, PESO_1ANO)
    for i, (emp, dire, area, hc, hcl, hc1) in enumerate(SEGMENTOS):
        fatos.append([emp, dire, area, periodo, hc, hcl, hc1, adm[i], vol[i], inv[i], lid[i], a1[i]])


# --- 2025, mensal ---------------------------------------------------
vol_2025 = repartir(round(sum(TOT_2025) * FRACAO_VOL_2025), TOT_2025)
for m, total in enumerate(TOT_2025, start=1):
    v = vol_2025[m - 1]
    emitir(f"2025-{m:02d}", v, total - v,
           round(total * 0.95), max(1, round(total * 0.10)), round(total * 0.34))

# --- 2026, mensal ---------------------------------------------------
for m in range(1, 8):
    v, i_, a = VOL_2026[m - 1], INV_2026[m - 1], ADM_2026[m - 1]
    if m == 7:   # julho vem exato do slide
        emitir("2026-07", v, i_, a, 9, 32, exatos={
            "vol": [JULHO[x][0] for x in AREAS],
            "inv": [JULHO[x][1] for x in AREAS],
            "lid": [JULHO[x][2] for x in AREAS],
            "a1":  [JULHO[x][3] for x in AREAS],
            "adm": [JULHO[x][4] for x in AREAS],
        })
    else:
        emitir(f"2026-{m:02d}", v, i_, a,
               max(1, round((v + i_) * 0.10)), round((v + i_) * 0.34))

# --- semanas de julho/2026 ------------------------------------------
for semana, (v, i_) in SEMANAS_JULHO.items():
    emitir(f"2026-07-{semana}", v, i_,
           round(78 * (v + i_) / 91), max(0, round(9 * (v + i_) / 91)), round(32 * (v + i_) / 91))

# --- motivos do mês corrente ----------------------------------------
motivos_linhas = []
for familia, motivo, qtd in MOTIVOS:
    pesos = PESO_VOL if familia == "Voluntário" else PESO_INV
    for i, q in enumerate(repartir(qtd, pesos)):
        if q:
            emp, dire, area = SEGMENTOS[i][0], SEGMENTOS[i][1], SEGMENTOS[i][2]
            motivos_linhas.append([emp, dire, area, "2026-07", familia, motivo, q])

# ================================================================== #
# 2. Escrita
# ================================================================== #
wb = Workbook()


def tabela(ws, colunas, linhas, larguras, dims=3):
    ws.sheet_view.showGridLines = False
    for i, w in enumerate(larguras, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    for j, nome in enumerate(colunas, start=1):
        c = ws.cell(row=1, column=j, value=nome)
        c.font, c.fill, c.border, c.alignment = F_CAB, P_CAB, BORDA, ESQ
    for r, linha in enumerate(linhas, start=2):
        for j, v in enumerate(linha, start=1):
            c = ws.cell(row=r, column=j, value=v)
            c.border, c.alignment = BORDA, ESQ
            if j <= dims:
                c.font, c.fill = F_CHAVE, P_DIM
            else:
                c.font, c.fill = F_ENTRADA, P_ENTRADA
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(colunas))}{len(linhas) + 1}"


# --- Config ---------------------------------------------------------
wsc = wb.active
wsc.title = "Config"
CONFIG = [
    ("titulo", "Movimentações", "Título no cabeçalho do painel"),
    ("periodo_atual", "2026-07", "Mês de referência, no formato AAAA-MM"),
    ("semana_atual", "2026-07-S3", "Semana de referência; deve existir na aba Fatos"),
    ("periodo_rotulo", "Julho 2026", "Como o período aparece escrito"),
    ("semana_rotulo", "Semana 3", "Como a semana aparece escrita"),
    ("regua", "MTD com 3 de 4,4 semanas", "Aviso de proporcionalidade no canto direito"),
    ("janela_padrao", "mes", "semana, mes ou ano"),
    ("dados_exemplo", "sim", "sim mostra o selo de dados ilustrativos; troque para nao"),
]
wsc.sheet_view.showGridLines = False
for col, w in [("A", 3), ("B", 22), ("C", 34), ("D", 56)]:
    wsc.column_dimensions[col].width = w
wsc["B2"] = "Configuração do painel"
wsc["B2"].font = F_TITULO
for r, (chave, valor, ajuda) in enumerate(CONFIG, start=4):
    wsc.cell(row=r, column=2, value=chave).font = F_CHAVE
    wsc.cell(row=r, column=2).fill = P_CALC
    c = wsc.cell(row=r, column=3, value=valor)
    c.font, c.fill, c.border = F_ENTRADA, P_ENTRADA, BORDA
    wsc.cell(row=r, column=2).border = BORDA
    a = wsc.cell(row=r, column=4, value=ajuda)
    a.font, a.alignment = F_SUB, TOPO

# --- Fatos ----------------------------------------------------------
tabela(wb.create_sheet("Fatos"),
       ["empresa", "diretoria", "area", "periodo", "hc", "hc_lideres", "hc_ate1ano",
        "admitidos", "desl_vol", "desl_inv", "desl_lideres", "desl_ate1ano"],
       fatos,
       [16, 12, 18, 14, 10, 12, 13, 12, 11, 11, 13, 14], dims=4)

# --- Motivos --------------------------------------------------------
tabela(wb.create_sheet("Motivos"),
       ["empresa", "diretoria", "area", "periodo", "familia", "motivo", "qtd"],
       motivos_linhas,
       [16, 12, 18, 14, 14, 28, 8], dims=4)

# --- Textos ---------------------------------------------------------
wst = wb.create_sheet("Textos")
wst.sheet_view.showGridLines = False
for col, w in [("A", 3), ("B", 20), ("C", 118)]:
    wst.column_dimensions[col].width = w
wst["B2"] = "Textos do painel"
wst["B2"].font = F_TITULO
wst["B3"] = "Use **assim** para negrito. Também dá para editar direto na tela e salvar."
wst["B3"].font = F_SUB
TEXTOS = [
    ("insight", "**Julho:** volume desacelera 26% vs junho, puxado pelo voluntário (−37%). "
                "**Atenção no involuntário** — igual à média de 2026, mas **+28% acima da média de 2025**. "
                "**Alerta nos líderes:** 9 saídas contra 4 em junho."),
    ("nota_motivos", "**“Particular” = 82% dos pedidos de demissão.** O motivo mais frequente é "
                     "“não sabemos”: achado de codificação, não de visualização."),
    ("nota_diretorias", "**Índice acima de 1,0× indica sobre-representação:** a área perde mais gente "
                        "do que o seu tamanho justificaria."),
]
for r, (chave, valor) in enumerate(TEXTOS, start=5):
    wst.cell(row=r, column=2, value=chave).font = F_CHAVE
    wst.cell(row=r, column=2).fill = P_CALC
    wst.cell(row=r, column=2).border = BORDA
    c = wst.cell(row=r, column=3, value=valor)
    c.font, c.fill, c.border, c.alignment = F_ENTRADA, P_ENTRADA, BORDA, TOPO
    wst.row_dimensions[r].height = 14 * (1 + len(valor) // 120)

# --- Conferência ----------------------------------------------------
wcf = wb.create_sheet("Conferência")
wcf.sheet_view.showGridLines = False
for col, w in [("A", 3), ("B", 52), ("C", 14), ("D", 14), ("E", 34)]:
    wcf.column_dimensions[col].width = w
wcf["B2"] = "Conferência automática"
wcf["B2"].font = F_TITULO
wcf["B3"] = "Calcula ao abrir no Excel. Resolva os OLHAR antes de carregar no painel."
wcf["B3"].font = F_SUB
for col, titulo in [("B", "Verificação"), ("C", "Na base"), ("D", "Esperado"), ("E", "Situação")]:
    c = wcf[f"{col}5"]
    c.value, c.font, c.fill, c.border = titulo, F_NEG, P_DIM, BORDA

P = "2026-07"
CHECAGENS = [
    ("Desligamentos voluntários em julho", f'=SUMIFS(Fatos!I:I,Fatos!D:D,"{P}")', 49),
    ("Desligamentos involuntários em julho", f'=SUMIFS(Fatos!J:J,Fatos!D:D,"{P}")', 42),
    ("Líderes desligados em julho", f'=SUMIFS(Fatos!K:K,Fatos!D:D,"{P}")', 9),
    ("Desligados com até 1 ano em julho", f'=SUMIFS(Fatos!L:L,Fatos!D:D,"{P}")', 32),
    ("Admitidos em julho", f'=SUMIFS(Fatos!H:H,Fatos!D:D,"{P}")', 78),
    ("Diretoria FLO em julho (vol + inv)",
     f'=SUMIFS(Fatos!I:I,Fatos!D:D,"{P}",Fatos!B:B,"FLO")+SUMIFS(Fatos!J:J,Fatos!D:D,"{P}",Fatos!B:B,"FLO")', 61),
    ("Semanas de julho somam o mês (voluntário)",
     '=SUMIFS(Fatos!I:I,Fatos!D:D,"2026-07-S1")+SUMIFS(Fatos!I:I,Fatos!D:D,"2026-07-S2")+SUMIFS(Fatos!I:I,Fatos!D:D,"2026-07-S3")', 49),
    ("Semanas de julho somam o mês (involuntário)",
     '=SUMIFS(Fatos!J:J,Fatos!D:D,"2026-07-S1")+SUMIFS(Fatos!J:J,Fatos!D:D,"2026-07-S2")+SUMIFS(Fatos!J:J,Fatos!D:D,"2026-07-S3")', 42),
    ("Acumulado 2026 até julho (vol + inv)",
     '=SUMIFS(Fatos!I:I,Fatos!D:D,">=2026-01",Fatos!D:D,"<=2026-07")+SUMIFS(Fatos!J:J,Fatos!D:D,">=2026-01",Fatos!D:D,"<=2026-07")', 804),
    ("Acumulado 2025 até julho (vol + inv)",
     '=SUMIFS(Fatos!I:I,Fatos!D:D,">=2025-01",Fatos!D:D,"<=2025-07")+SUMIFS(Fatos!J:J,Fatos!D:D,">=2025-01",Fatos!D:D,"<=2025-07")', 751),
    ("Motivos voluntários somam os desligamentos voluntários",
     '=SUMIFS(Motivos!G:G,Motivos!E:E,"Voluntário")', 49),
    ("Motivos involuntários somam os desligamentos involuntários",
     '=SUMIFS(Motivos!G:G,Motivos!E:E,"Involuntário")', 42),
]
r = 6
for texto, formula, esperado in CHECAGENS:
    wcf.cell(row=r, column=2, value=texto).font = F_TXT
    wcf.cell(row=r, column=2).alignment = TOPO
    c = wcf.cell(row=r, column=3, value=formula)
    c.font, c.fill = F_NEG, P_CALC
    d = wcf.cell(row=r, column=4, value=esperado)
    d.font, d.fill = F_NEG, P_CALC
    s = wcf.cell(row=r, column=5, value=f'=IF(C{r}=D{r},"OK","OLHAR: diferença de "&TEXT(C{r}-D{r},"0"))')
    s.font = F_TXT
    for j in range(2, 6):
        wcf.cell(row=r, column=j).border = BORDA
    r += 1

# --- Instruções -----------------------------------------------------
wi = wb.create_sheet("Instruções")
wi.sheet_view.showGridLines = False
for col, w in [("A", 3), ("B", 30), ("C", 96)]:
    wi.column_dimensions[col].width = w
wi["B2"] = "Base de movimentações — painel com filtros"
wi["B2"].font = F_TITULO
wi["B3"] = "Componentes brutos por segmento. O painel agrega conforme o filtro."
wi["B3"].font = F_SUB

BLOCOS = [
    ("Por que mudou", None),
    ("Antes", "A planilha trazia o indicador já calculado para um recorte só. Por isso os filtros "
              "não podiam funcionar: não havia por onde recortar."),
    ("Agora", "A aba Fatos traz uma linha por segmento por período, com os números brutos. O painel "
              "soma o que o filtro selecionou e só então calcula a taxa. É o que evita média de "
              "médias: taxa não soma entre áreas, mas numerador e denominador somam."),
    ("Rotina da semana", None),
    ("1. Atualizar", "Acrescente as linhas do período novo na aba Fatos e na aba Motivos. Uma linha "
                     "por segmento. Não apague o histórico — é dele que saem as médias."),
    ("2. Ajustar o Config", "periodo_atual e semana_atual apontam para o que a tela mostra. Os rótulos "
                            "são livres."),
    ("3. Conferir", "A aba Conferência recalcula ao abrir e acusa toda soma que não fecha."),
    ("4. Carregar", "No painel: Atualizar dados, Escolher arquivo, apontar para este .xlsx."),
    ("5. Publicar", "Revise os textos na tela, Salvar semana, e leve o arquivo para a pasta de rede. "
                    "O arquivo salvo guarda a base inteira, então os filtros continuam funcionando "
                    "para quem abrir depois."),
    ("As colunas de Fatos", None),
    ("empresa / diretoria / area", "Os três níveis do filtro. Se você não usa algum, repita o nível "
                                   "de cima — mas mantenha a coluna."),
    ("periodo", "AAAA-MM para mês (2026-07) e AAAA-MM-Sn para semana (2026-07-S3). O painel reconhece "
                "a semana pelo -S."),
    ("hc", "Headcount médio do segmento no período. É o denominador de toda taxa. Sem ele, o cartão "
           "mostra a quantidade e deixa a taxa como sem dado."),
    ("hc_lideres / hc_ate1ano", "Quantos líderes e quantas pessoas com menos de um ano de casa existem "
                                "no segmento. São o que transforma “9 líderes saíram” em “a liderança "
                                "gira a X%” — a diferença entre composição e incidência."),
    ("admitidos, desl_vol, desl_inv", "Contagens do período. O turnover total é a soma dos dois "
                                      "desligamentos; não crie uma coluna para ele."),
    ("desl_lideres / desl_ate1ano", "Recortes dos desligados. São subconjuntos que se sobrepõem: um "
                                    "líder pode ter menos de um ano. Não somam com nada."),
    ("O que é real e o que não é", None),
    ("Real", "Julho de 2026 por diretoria (voluntário, involuntário e líderes) veio da tabela "
             "Detalhado do seu slide. Os totais mensais de 2026, os acumulados de 2025 e 2026, os "
             "motivos e as semanas de julho também."),
    ("Derivado", "A série mensal de 2025 foi montada para somar 751 até julho e 1.260 no ano, que é a "
                 "média de 105 que você informou. A distribuição por segmento nos meses anteriores "
                 "replica a proporção de julho."),
    ("Ilustrativo", "Headcount por segmento, headcount de liderança e de quem tem menos de um ano, e a "
                    "divisão em áreas. Substitua: é o que sustenta todas as taxas e o índice de "
                    "sobre-representação. Enquanto dados_exemplo estiver como sim, o painel mostra "
                    "um selo avisando."),
]
r = 5
for titulo, texto in BLOCOS:
    if texto is None:
        wi.cell(row=r, column=2, value=titulo).font = Font(name=FONTE, size=11, bold=True, color=VERDE)
        r += 1
        continue
    wi.cell(row=r, column=2, value=titulo).font = F_NEG
    wi.cell(row=r, column=2).alignment = TOPO
    c = wi.cell(row=r, column=3, value=texto)
    c.font, c.alignment = F_TXT, TOPO
    wi.row_dimensions[r].height = 14 * (1 + len(texto) // 100)
    r += 1

wb.move_sheet("Instruções", offset=-5)
destino = RAIZ / "base-movimentacoes.xlsx"
wb.save(destino)

# ------------------------------------------------------------------ #
print(f"{destino.name} gerado")
print(f"  abas: {', '.join(wb.sheetnames)}")
print(f"  {len(fatos)} linhas de fato · {len(SEGMENTOS)} segmentos · "
      f"{len({f[3] for f in fatos})} períodos · {len(motivos_linhas)} linhas de motivo")

jul = [f for f in fatos if f[3] == "2026-07"]
print("\nconferência do mês de referência:")
for rot, idx, alvo in [("voluntários", 8, 49), ("involuntários", 9, 42),
                       ("líderes", 10, 9), ("até 1 ano", 11, 32), ("admitidos", 7, 78)]:
    v = sum(f[idx] for f in jul)
    print(f"  {rot:15} {v:5}  esperado {alvo:5}  {'OK' if v == alvo else 'DIVERGE'}")

ytd26 = sum(f[8] + f[9] for f in fatos if f[3].startswith("2026-") and len(f[3]) == 7)
ytd25 = sum(f[8] + f[9] for f in fatos if f[3].startswith("2025-") and f[3] <= "2025-07")
ano25 = sum(f[8] + f[9] for f in fatos if f[3].startswith("2025-"))
print(f"  {'YTD 2026':15} {ytd26:5}  esperado   804  {'OK' if ytd26 == 804 else 'DIVERGE'}")
print(f"  {'YTD 2025':15} {ytd25:5}  esperado   751  {'OK' if ytd25 == 751 else 'DIVERGE'}")
print(f"  {'2025 fechado':15} {ano25:5}  média/mês {ano25/12:6.1f}  (informado 105)")
