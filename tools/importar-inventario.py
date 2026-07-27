#!/usr/bin/env python3
"""
Lê `inventario-indicadores.xlsx` preenchido e escreve as definições que o painel
consome, em `tools/kpis-do-inventario.json`.

    python3 tools/importar-inventario.py
    python3 tools/importar-inventario.py --arquivo outro.xlsx

Depois: `node tools/gerar-dados.mjs`, que passa a usar essas definições em vez
das de exemplo.

O importador não inventa nada. Toda linha incompleta vira um aviso nomeando o
que falta, e o campo `formula` sai como rascunho a partir do numerador e do
denominador declarados — é o único ponto que precisa de revisão humana, porque
depende de como as métricas serão nomeadas no extrator.
"""

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

from openpyxl import load_workbook

RAIZ = Path(__file__).resolve().parent.parent

DIRECAO = {
    "menor é melhor": "menor",
    "maior é melhor": "maior",
    "perto da meta": "faixa",
}
# Comportamento do INDICADOR -> normalização para base mensal
ESCALA = {
    "cresce com o período": "periodo",
    "independe do período": "instante",
}
NIVEL_META = {
    "grupo": "*",
    "empresa": "<por empresa — preencha as chaves>",
    "diretoria": "<por diretoria — preencha as chaves>",
    "área": "<por área — preencha as chaves>",
}
CASAS = {"%": 2, "R$": 0, "dias": 1, "horas": 1, "pessoas": 0, "vagas": 0, "pontos": 0, "índice": 2, "razão": 2}


def limpar(v):
    return str(v).strip() if v is not None and str(v).strip() != "" else None


def chave(texto):
    """Gera um id estável a partir do nome do indicador."""
    t = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    t = re.sub(r"[^a-zA-Z0-9]+", "_", t).strip("_").lower()
    return t[:40] or "indicador"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--arquivo", default=str(RAIZ / "inventario-indicadores.xlsx"))
    ap.add_argument("--saida", default=str(RAIZ / "tools" / "kpis-do-inventario.json"))
    args = ap.parse_args()

    caminho = Path(args.arquivo)
    if not caminho.exists():
        sys.exit(f"Não encontrei {caminho}. Rode antes: python3 tools/criar-inventario.py")

    wb = load_workbook(caminho, data_only=True)
    if "1. Indicadores" not in wb.sheetnames:
        sys.exit("A aba '1. Indicadores' não existe neste arquivo.")

    # Tipo de cada COMPONENTE (aba 2) — é o que decide somar ou pegar o último
    # valor da janela. É independente do comportamento do indicador (aba 1):
    # absenteísmo é taxa que independe do período, mas soma horas.
    tipo_componente, codigo_componente = {}, {}
    if "2. Componentes" in wb.sheetnames:
        comp = wb["2. Componentes"]
        for r in range(3, comp.max_row + 1):
            codigo = limpar(comp.cell(row=r, column=1).value)
            descricao = limpar(comp.cell(row=r, column=2).value)
            tipo = limpar(comp.cell(row=r, column=3).value)
            for rotulo in (codigo, descricao):
                if not rotulo:
                    continue
                if tipo:
                    tipo_componente[chave(rotulo)] = tipo.lower()
                if codigo:
                    codigo_componente[chave(rotulo)] = codigo

    def acesso_de(descricao):
        """soma para fluxo, ultimo para estoque. Fluxo é o padrão."""
        t = tipo_componente.get(chave(descricao))
        return "ultimo" if t == "estoque" else "soma", t

    def metrica(descricao):
        """Usa o código já declarado na aba 2; só inventa um nome se não achar."""
        return codigo_componente.get(chave(descricao)) or chave(descricao)

    ws = wb["1. Indicadores"]
    kpis, avisos, ids = [], [], set()
    naoDeclarados = set()

    # linha 3 é o exemplo; os dados começam na 4
    for r in range(4, ws.max_row + 1):
        nome = limpar(ws.cell(row=r, column=3).value)
        if not nome:
            continue

        onde = limpar(ws.cell(row=r, column=2).value)
        grupo = limpar(ws.cell(row=r, column=4).value)
        conta = limpar(ws.cell(row=r, column=5).value)
        num = limpar(ws.cell(row=r, column=6).value)
        den = limpar(ws.cell(row=r, column=7).value)
        unidade = limpar(ws.cell(row=r, column=8).value)
        direcao = limpar(ws.cell(row=r, column=9).value)
        tipo = limpar(ws.cell(row=r, column=10).value)
        meta = ws.cell(row=r, column=11).value
        nivel = limpar(ws.cell(row=r, column=12).value)
        tol = ws.cell(row=r, column=13).value
        period = limpar(ws.cell(row=r, column=14).value)
        estrat = limpar(ws.cell(row=r, column=15).value)
        fonte = limpar(ws.cell(row=r, column=16).value)
        obs = limpar(ws.cell(row=r, column=17).value)

        falta = [
            rot for rot, v in
            [("Grupo", grupo), ("Unidade", unidade), ("Direção", direcao), ("Tipo", tipo), ("Numerador", num)]
            if not v
        ]
        if falta:
            avisos.append(f"linha {r} ({nome}): falta {', '.join(falta)}")

        kid = chave(nome)
        base, n = kid, 2
        while kid in ids:
            kid, n = f"{base}_{n}", n + 1
        ids.add(kid)

        escala = ESCALA.get((tipo or "").lower(), "instante")

        # rascunho da fórmula — cada componente entra com o acesso do SEU tipo
        acN, tN = acesso_de(num) if num else ("soma", None)
        acD, tD = acesso_de(den) if den else ("soma", None)
        for desc, t in ((num, tN), (den, tD)):
            if desc and t is None:
                naoDeclarados.add(desc)

        if num and den:
            if "headcount médio" in den.lower() or "hc médio" in den.lower():
                expr = f"a.soma.{metrica(num)} / a.hcMedio"
            else:
                expr = f"a.{acN}.{metrica(num)} / a.{acD}.{metrica(den)}"
            if unidade == "%":
                expr += " * 100"
        elif num:
            expr = f"a.{acN}.{metrica(num)}"
        else:
            expr = "null"

        kpi = {
            "id": kid,
            "nome": nome,
            "grupo": grupo or "Outro",
            "formula": expr,
            "unidade": unidade or "razão",
            "casas": CASAS.get(unidade, 2),
            "direcao": DIRECAO.get((direcao or "").lower(), "menor"),
            "escala": escala,
            "metaRotulo": "meta",
            "limite": (float(tol) / 100) if isinstance(tol, (int, float)) else 0.2,
            "fonte": fonte or "",
            "metodo": conta or "",
        }
        if isinstance(meta, (int, float)):
            alvo = NIVEL_META.get((nivel or "grupo").lower(), "*")
            kpi["metas"] = {alvo: float(meta)}
            if alvo != "*":
                avisos.append(f"linha {r} ({nome}): meta é por {nivel} — preencha uma chave por {nivel.lower()}")
        elif (nivel or "").lower() != "não tem meta":
            avisos.append(f"linha {r} ({nome}): sem meta numérica — o cartão ficará cinza")

        if (estrat or "").lower() == "sim":
            kpi["destaque"] = True
        if period and period.lower() not in ("semanal", "mensal"):
            kpi["_periodicidade"] = period
            avisos.append(f"linha {r} ({nome}): periodicidade {period} — aparecerá como não apurado nas janelas sem coleta")
        if onde:
            kpi["_origem"] = onde
        if obs:
            kpi["_observacao"] = obs

        kpis.append(kpi)

    if not kpis:
        sys.exit("Nenhum indicador preenchido na aba '1. Indicadores' (a partir da linha 4).")

    for d in sorted(naoDeclarados):
        avisos.append(f"componente '{d}' não está na aba 2 — assumi fluxo (soma); declare o tipo se for estoque")

    # métricas citadas, para conferir contra a aba de componentes
    citadas = sorted({m for k in kpis for m in re.findall(r"a\.(?:soma|ultimo)\.(\w+)", k["formula"])})

    hierarquia = []
    if "3. Hierarquia" in wb.sheetnames:
        h = wb["3. Hierarquia"]
        for r in range(4, h.max_row + 1):
            emp, dire, area = (limpar(h.cell(row=r, column=c).value) for c in (2, 3, 4))
            if emp and dire and area:
                hierarquia.append([emp, dire, area])

    saida = {
        "_origem": caminho.name,
        "kpis": kpis,
        "metricasCitadas": citadas,
        "hierarquia": hierarquia,
        "avisos": avisos,
    }
    Path(args.saida).write_text(json.dumps(saida, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    print(f"{len(kpis)} indicadores lidos de {caminho.name}")
    print(f"{len(hierarquia)} áreas na hierarquia")
    print(f"\nmétricas que o extrator precisa produzir ({len(citadas)}):")
    for m in citadas:
        print(f"  {m}")
    if avisos:
        print(f"\n{len(avisos)} pontos a revisar:")
        for a in avisos:
            print(f"  · {a}")
    destino = Path(args.saida)
    try:
        destino = destino.relative_to(RAIZ)
    except ValueError:
        pass
    print(f"\nescrito em {destino}")
    print("revise o campo 'formula' de cada indicador e rode: node tools/gerar-dados.mjs")


if __name__ == "__main__":
    main()
