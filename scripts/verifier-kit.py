# -*- coding: utf-8 -*-
"""Contrôle des références du classeur, à défaut de pouvoir le recalculer.

LibreOffice ne répond pas ici, donc aucune preuve que l'arithmétique tombe
juste. Ce que ce script prouve en revanche, c'est le défaut le plus probable
d'un classeur écrit par programme : une formule qui pointe une colonne ou une
ligne à côté. Chaque référence est résolue et confrontée à l'en-tête ou au
libellé qu'elle est censée désigner.
"""
import re, sys
from openpyxl import load_workbook

import os
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
wb = load_workbook(os.path.join(RACINE, "documents", "kit-gestion-assmat.xlsx"))
contrat, heures, mois, annee = wb["Contrat"], wb["Heures"], wb["Mois"], wb["Année"]
echecs = []

def attendu(condition, message):
    if not condition:
        echecs.append(message)

# 1. Chaque cellule de paramètre porte bien le libellé que les formules supposent.
libelles = {7: "Taux horaire brut", 8: "Heures d'accueil par semaine",
            9: "Semaines d'accueil par an", 10: "Indemnité d'entretien par heure",
            11: "Plancher d'entretien par journée", 12: "Indemnité par repas",
            13: "Indemnité kilométrique", 16: "Heures mensualisées",
            17: "Salaire mensualisé brut"}
for ligne, debut in libelles.items():
    lu = str(contrat.cell(row=ligne, column=2).value or "")
    attendu(lu.startswith(debut), f"Contrat!C{ligne} devait être « {debut} », trouvé « {lu} »")

# 2. Les colonnes de l'onglet Heures, dans l'ordre supposé par les SUMIFS.
colonnes = {1: "Date", 2: "Arrivée", 3: "Départ", 4: "Heures",
            5: "Repas", 6: "Km", 7: "Entretien (€)", 8: "Clé mois"}
for col, titre in colonnes.items():
    lu = heures.cell(row=3, column=col).value
    attendu(lu == titre, f"Heures colonne {col} devait être « {titre} », trouvé « {lu} »")

# 3. Les colonnes de l'onglet Mois.
colM = {1: "Mois", 2: "Clé", 3: "Heures faites", 4: "Heures mensualisées",
        5: "Heures compl.", 6: "Journées", 7: "Brut mensualisé", 8: "Brut compl.",
        9: "Entretien", 10: "Repas", 11: "Kilomètres"}
for col, titre in colM.items():
    lu = mois.cell(row=5, column=col).value
    attendu(lu == titre, f"Mois colonne {col} devait être « {titre} », trouvé « {lu} »")

# 4. Toute référence Contrat!$C$n d'une formule vise une ligne réellement définie.
lignes_valides = set(libelles)
for ws in (heures, mois, annee):
    for rang in ws.iter_rows():
        for c in rang:
            if isinstance(c.value, str) and c.value.startswith("="):
                for n in re.findall(r"Contrat!\$C\$(\d+)", c.value):
                    attendu(int(n) in lignes_valides,
                            f"{ws.title}!{c.coordinate} référence Contrat!C{n}, qui n'est pas un paramètre")

# 5. Les totaux de l'onglet Année visent la ligne Total de l'onglet Mois.
attendu(mois.cell(row=18, column=1).value == "Total", "Mois!A18 devrait porter « Total »")
for coord, colonne in (("C4", "C"), ("C6", "G"), ("C7", "H"), ("C11", "I"), ("C12", "J"), ("C13", "K")):
    f = str(annee[coord].value)
    attendu(f"Mois!{colonne}18" in f, f"Année!{coord} devait pointer Mois!{colonne}18, trouvé « {f} »")

# 6. Les plages SUMIFS couvrent exactement les lignes de saisie, sans déborder.
premiere = 4
derniere = max(r for r in range(4, heures.max_row + 1)
               if isinstance(heures.cell(row=r, column=8).value, str))
for c in mois["C6"], mois["I6"], mois["J6"], mois["K6"]:
    for debut, fin in re.findall(r"Heures!\$[A-H]\$(\d+):\$[A-H]\$(\d+)", str(c.value)):
        attendu(int(debut) == premiere and int(fin) == derniere,
                f"Mois!{c.coordinate} couvre {debut}-{fin}, attendu {premiere}-{derniere}")

# 7. Aucune fonction récente que le tableur de l'acheteuse pourrait ne pas connaître.
# La frontière de mot compte : SUMIFS et COUNTIFS contiennent « IFS( » sans être
# la fonction IFS. Sans \b, le contrôle se déclenche sur des formules saines.
interdites = ("XLOOKUP", "XMATCH", "TEXTJOIN", "IFS", "SWITCH", "MAXIFS", "MINIFS",
              "FILTER", "UNIQUE", "SORT", "SEQUENCE")
motif = re.compile(r"\b(" + "|".join(interdites) + r")\s*\(")
for ws in wb.worksheets:
    for rang in ws.iter_rows():
        for c in rang:
            if isinstance(c.value, str) and c.value.startswith("="):
                trouve = motif.search(c.value.upper())
                attendu(trouve is None,
                        f"{ws.title}!{c.coordinate} utilise {trouve.group(1) if trouve else ''}, à éviter")

total = sum(1 for ws in wb.worksheets for rang in ws.iter_rows() for c in rang
            if isinstance(c.value, str) and c.value.startswith("="))
print(f"{total} formules contrôlées, {len(echecs)} anomalie(s)")
for e in echecs:
    print("  ✗ " + e)
sys.exit(1 if echecs else 0)
