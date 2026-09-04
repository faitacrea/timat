# -*- coding: utf-8 -*-
"""Kit de gestion TiMat pour assistante maternelle.

Tout est formule : la lectrice change ses paramètres de contrat et l'ensemble
du tableur suit. Rien n'est calculé en Python puis figé dans une cellule.
"""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.comments import Comment

MARINE = "2E4859"; TERRA = "C84B31"; CREME = "FDFBF8"; LIGNE = "E4DCD0"; SAUGE = "5DA9A1"
F = "Arial"
h1 = Font(name=F, size=16, bold=True, color="FFFFFF")
h2 = Font(name=F, size=11, bold=True, color="FFFFFF")
gras = Font(name=F, size=10, bold=True, color=MARINE)
norm = Font(name=F, size=10, color=MARINE)
saisie = Font(name=F, size=10, bold=True, color="0000FF")
petit = Font(name=F, size=9, color="6B7A82")
fond_titre = PatternFill("solid", fgColor=MARINE)
fond_entete = PatternFill("solid", fgColor=TERRA)
fond_saisie = PatternFill("solid", fgColor="FFF9E6")
fond_doux = PatternFill("solid", fgColor="F4F1EA")
bord = Border(*[Side(style="thin", color=LIGNE)] * 4)
EUR = '#,##0.00 "€"'; HEU = '#,##0.00'; DATE = "DD/MM/YYYY"; HM = "HH:MM"

wb = Workbook()

# ---------------------------------------------------------------- Mode d'emploi
ws = wb.active; ws.title = "Mode d'emploi"
ws.column_dimensions["A"].width = 4
ws.column_dimensions["B"].width = 104
ws["B2"] = "Kit de gestion — assistante maternelle"; ws["B2"].font = Font(name=F, size=18, bold=True, color=MARINE)
ws["B3"] = "TiMat · timat.app"; ws["B3"].font = petit

lignes = [
    ("", ""),
    ("titre", "Ce que fait ce classeur"),
    ("p", "Vous saisissez vos horaires jour par jour. Le classeur calcule les heures, les heures complémentaires, "
          "l'indemnité d'entretien, les repas et les kilomètres, mois par mois, puis le récapitulatif de l'année."),
    ("", ""),
    ("titre", "Les trois règles à retenir"),
    ("p", "1. Les cellules sur fond crème et en bleu sont les seules à remplir. Tout le reste est calculé : "
          "si vous écrivez par-dessus une formule, elle est perdue."),
    ("p", "2. Commencez toujours par l'onglet « Contrat ». Rien ne se calcule tant qu'il est vide."),
    ("p", "3. Un seul enfant par classeur. Pour un deuxième contrat, dupliquez le fichier : "
          "les indemnités et la mensualisation sont propres à chaque contrat."),
    ("", ""),
    ("titre", "Les onglets, dans l'ordre"),
    ("p", "Contrat — votre taux horaire, vos heures, vos indemnités. À remplir en premier."),
    ("p", "Heures — une ligne par journée d'accueil. Arrivée, départ, repas, kilomètres."),
    ("p", "Mois — le récapitulatif mensuel, calculé tout seul. Rien à saisir."),
    ("p", "Année — le total annuel et l'indemnité de congés payés. Rien à saisir."),
    ("", ""),
    ("titre", "Ce que ce classeur ne fait pas"),
    ("p", "Il ne remplace pas un bulletin de salaire et ne calcule pas les cotisations : c'est Pajemploi qui les "
          "établit à partir de ce que vous déclarez. Il vous donne les montants à déclarer, et de quoi les vérifier."),
    ("p", "Il ne connaît pas votre situation particulière : année incomplète, garde périscolaire, "
          "accueil d'urgence. Les paramètres du contrat s'ajustent, les règles de votre convention priment."),
    ("", ""),
    ("titre", "Les repères de la convention collective"),
    ("p", "Minimum conventionnel : 4,20 € brut de l'heure et par enfant depuis le 1er juin 2026 "
          "(avenant n° 10 à la convention IDCC 3239)."),
    ("p", "Indemnité d'entretien : 0,435 € par heure d'accueil, avec un plancher de 2,65 € par journée."),
    ("p", "Au-delà de 45 heures par semaine, les heures sont majorées : le taux se négocie au contrat."),
    ("p", "Congés payés : 10 % de la rémunération brute, ou le maintien de salaire — la formule la plus favorable "
          "s'applique. Le versement mensuel est interdit."),
    ("", ""),
    ("p", "Ces montants étaient à jour au 1er juin 2026. Vérifiez-les chaque année : ils sont revalorisés."),
]
r = 5
for typ, txt in lignes:
    c = ws.cell(row=r, column=2, value=txt)
    if typ == "titre":
        c.font = Font(name=F, size=11, bold=True, color=TERRA)
    elif typ == "p":
        c.font = norm; c.alignment = Alignment(wrap_text=True, vertical="top")
        ws.row_dimensions[r].height = 28 if len(txt) > 100 else 15
    r += 1

# ---------------------------------------------------------------------- Contrat
ws = wb.create_sheet("Contrat")
ws.column_dimensions["A"].width = 4
ws.column_dimensions["B"].width = 46
ws.column_dimensions["C"].width = 18
ws.column_dimensions["D"].width = 62
ws.merge_cells("B2:D2"); ws["B2"] = "Les paramètres du contrat"; ws["B2"].font = h1
ws["B2"].fill = fond_titre; ws["B2"].alignment = Alignment(vertical="center"); ws.row_dimensions[2].height = 28

def champ(row, libelle, valeur, fmt=None, aide="", exemple=False):
    ws.cell(row=row, column=2, value=libelle).font = gras
    c = ws.cell(row=row, column=3, value=valeur)
    c.font = saisie; c.fill = fond_saisie; c.border = bord
    if fmt: c.number_format = fmt
    a = ws.cell(row=row, column=4, value=aide); a.font = petit
    a.alignment = Alignment(wrap_text=True, vertical="center")
    return c

ws["B4"] = "À REMPLIR"; ws["B4"].font = Font(name=F, size=10, bold=True, color="FFFFFF"); ws["B4"].fill = fond_entete
champ(5, "Prénom de l'enfant", "Lucie", aide="Un classeur par enfant accueilli.")
champ(6, "Début du contrat", "01/09/2026", aide="Pour mémoire.")
champ(7, "Taux horaire brut (€)", 4.5, EUR, "Ce que vous avez négocié, par heure et par enfant.")
champ(8, "Heures d'accueil par semaine", 45, HEU, "Les heures prévues au contrat, pas celles réellement faites.")
champ(9, "Semaines d'accueil par an", 47, HEU, "47 en année complète. Moins si la famille ne vous confie pas l'enfant toute l'année.")
champ(10, "Indemnité d'entretien par heure (€)", 0.435, EUR, "Montant conventionnel au 1er juin 2026.")
champ(11, "Plancher d'entretien par journée (€)", 2.65, EUR, "En dessous, c'est ce plancher qui s'applique.")
champ(12, "Indemnité par repas (€)", 4.0, EUR, "Aucun barème légal : c'est ce qui est écrit au contrat.")
champ(13, "Indemnité kilométrique (€/km)", 0.529, EUR, "Barème fiscal. Exonérée si vous tenez une feuille de route.")

ws["B15"] = "CALCULÉ — NE PAS MODIFIER"; ws["B15"].font = Font(name=F, size=10, bold=True, color="FFFFFF"); ws["B15"].fill = PatternFill("solid", fgColor=SAUGE)

def calc(row, libelle, formule, fmt=None, aide=""):
    ws.cell(row=row, column=2, value=libelle).font = gras
    c = ws.cell(row=row, column=3, value=formule)
    c.font = Font(name=F, size=10, bold=True, color=MARINE); c.fill = fond_doux; c.border = bord
    if fmt: c.number_format = fmt
    a = ws.cell(row=row, column=4, value=aide); a.font = petit
    a.alignment = Alignment(wrap_text=True, vertical="center")
    return c

calc(16, "Heures mensualisées", "=ROUND(C8*C9/12,2)", HEU,
     "Heures par semaine × semaines par an ÷ 12. C'est la base payée chaque mois, même les mois où l'enfant vient moins.")
calc(17, "Salaire mensualisé brut", "=ROUND(C16*C7,2)", EUR,
     "Le montant dû tous les mois, indépendamment des heures réellement faites.")
calc(18, "Contrôle du minimum conventionnel",
     '=IF(C7<4.2,"ATTENTION : en dessous du minimum de 4,20 €","Conforme au minimum conventionnel")', None,
     "Le minimum s'apprécie par heure et par enfant.")
ws["C18"].number_format = "General"
calc(19, "Contrôle du plafond CMG",
     '=IF(C7>61.55,"ATTENTION : au-delà du plafond, les parents perdent tout le CMG","Sous le plafond CMG")', None,
     "Cinq fois le SMIC horaire par jour et par enfant. Au-delà, le CMG est perdu en entier.")
ws["C19"].number_format = "General"
ws["C5"].comment = Comment("Exemple fourni : remplacez-le par vos propres valeurs.", "TiMat")

# ----------------------------------------------------------------------- Heures
ws = wb.create_sheet("Heures")
entetes = ["Date", "Arrivée", "Départ", "Heures", "Repas", "Km", "Entretien (€)", "Clé mois"]
larg = [13, 11, 11, 11, 9, 9, 15, 12]
ws.merge_cells("A1:H1"); ws["A1"] = "Une ligne par journée d'accueil"; ws["A1"].font = h1
ws["A1"].fill = fond_titre; ws["A1"].alignment = Alignment(vertical="center"); ws.row_dimensions[1].height = 26
ws["A2"] = "Remplissez Date, Arrivée, Départ, Repas et Km. Les colonnes grises se calculent seules."
ws["A2"].font = petit
for i, (e, w) in enumerate(zip(entetes, larg), start=1):
    c = ws.cell(row=3, column=i, value=e)
    c.font = h2; c.fill = fond_entete; c.border = bord
    c.alignment = Alignment(horizontal="center", vertical="center")
    ws.column_dimensions[get_column_letter(i)].width = w
ws.row_dimensions[3].height = 22

PREMIERE, DERNIERE = 4, 373
for r in range(PREMIERE, DERNIERE + 1):
    ws.cell(row=r, column=1).number_format = DATE
    for col in (1, 2, 3, 5, 6):
        c = ws.cell(row=r, column=col); c.font = saisie; c.fill = fond_saisie; c.border = bord
    ws.cell(row=r, column=2).number_format = HM
    ws.cell(row=r, column=3).number_format = HM
    # Heures : depart moins arrivee, en heures decimales.
    d = ws.cell(row=r, column=4, value=f'=IF(OR(B{r}="",C{r}=""),"",ROUND((C{r}-B{r})*24,2))')
    d.number_format = HEU
    # Entretien : le plancher journalier prime quand la journee est courte.
    e = ws.cell(row=r, column=7, value=f'=IF(D{r}="","",MAX(Contrat!$C$11,ROUND(D{r}*Contrat!$C$10,2)))')
    e.number_format = EUR
    # Cle mois numerique : plus sur qu'un format de date localise.
    k = ws.cell(row=r, column=8, value=f'=IF(A{r}="","",YEAR(A{r})*100+MONTH(A{r}))')
    for col in (4, 7, 8):
        c = ws.cell(row=r, column=col); c.font = norm; c.fill = fond_doux; c.border = bord
ws["A4"] = "01/09/2026"; ws["B4"] = "07:30"; ws["C4"] = "18:00"; ws["E4"] = 1; ws["F4"] = 0
ws["A4"].comment = Comment("Ligne d'exemple : écrasez-la par votre première journée réelle.", "TiMat")
ws.freeze_panes = "A4"

# ------------------------------------------------------------------------- Mois
ws = wb.create_sheet("Mois")
ws.merge_cells("A1:K1"); ws["A1"] = "Récapitulatif mois par mois"; ws["A1"].font = h1
ws["A1"].fill = fond_titre; ws["A1"].alignment = Alignment(vertical="center"); ws.row_dimensions[1].height = 26
ws["A2"] = "Rien à saisir ici, sauf l'année et le premier mois ci-dessous."; ws["A2"].font = petit
ws["A3"] = "Année"; ws["A3"].font = gras
ws["B3"] = 2026; ws["B3"].font = saisie; ws["B3"].fill = fond_saisie; ws["B3"].border = bord
ws["C3"] = "Mois de départ (1 à 12)"; ws["C3"].font = gras
ws["D3"] = 1; ws["D3"].font = saisie; ws["D3"].fill = fond_saisie; ws["D3"].border = bord

cols = ["Mois", "Clé", "Heures faites", "Heures mensualisées", "Heures compl.", "Journées",
        "Brut mensualisé", "Brut compl.", "Entretien", "Repas", "Kilomètres"]
larg = [14, 10, 14, 19, 13, 11, 16, 14, 13, 12, 13]
for i, (e, w) in enumerate(zip(cols, larg), start=1):
    c = ws.cell(row=5, column=i, value=e)
    c.font = h2; c.fill = fond_entete; c.border = bord
    c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws.column_dimensions[get_column_letter(i)].width = w
ws.row_dimensions[5].height = 30

H = f"Heures!$D${PREMIERE}:$D${DERNIERE}"
K = f"Heures!$H${PREMIERE}:$H${DERNIERE}"
R = f"Heures!$E${PREMIERE}:$E${DERNIERE}"
KM = f"Heures!$F${PREMIERE}:$F${DERNIERE}"
EN = f"Heures!$G${PREMIERE}:$G${DERNIERE}"

for n in range(12):
    r = 6 + n
    # Le mois glisse a partir du mois de depart, en changeant d annee si besoin.
    ws.cell(row=r, column=1, value=f'=DATE($B$3,$D$3+{n},1)').number_format = "MMMM YYYY"
    ws.cell(row=r, column=2, value=f'=YEAR(A{r})*100+MONTH(A{r})')
    ws.cell(row=r, column=3, value=f'=ROUND(SUMIFS({H},{K},B{r}),2)').number_format = HEU
    ws.cell(row=r, column=4, value="=Contrat!$C$16").number_format = HEU
    ws.cell(row=r, column=5, value=f'=ROUND(MAX(0,C{r}-D{r}),2)').number_format = HEU
    ws.cell(row=r, column=6, value=f'=COUNTIFS({K},B{r},{H},">0")')
    ws.cell(row=r, column=7, value=f'=IF(C{r}=0,0,Contrat!$C$17)').number_format = EUR
    ws.cell(row=r, column=8, value=f'=ROUND(E{r}*Contrat!$C$7,2)').number_format = EUR
    ws.cell(row=r, column=9, value=f'=ROUND(SUMIFS({EN},{K},B{r}),2)').number_format = EUR
    ws.cell(row=r, column=10, value=f'=ROUND(SUMIFS({R},{K},B{r})*Contrat!$C$12,2)').number_format = EUR
    ws.cell(row=r, column=11, value=f'=ROUND(SUMIFS({KM},{K},B{r})*Contrat!$C$13,2)').number_format = EUR
    for col in range(1, 12):
        c = ws.cell(row=r, column=col); c.font = norm; c.border = bord
        if col in (7, 8): c.fill = fond_doux

r = 18
ws.cell(row=r, column=1, value="Total").font = Font(name=F, size=10, bold=True, color="FFFFFF")
ws.cell(row=r, column=1).fill = fond_titre
for col in range(3, 12):
    L = get_column_letter(col)
    c = ws.cell(row=r, column=col, value=f"=SUM({L}6:{L}17)")
    c.font = Font(name=F, size=10, bold=True, color=MARINE); c.fill = fond_doux; c.border = bord
    c.number_format = EUR if col >= 7 else HEU
ws.cell(row=r, column=2).fill = fond_titre
ws["A20"] = ("Le brut mensualisé est dû même les mois où l'enfant vient moins : c'est le principe de la "
             "mensualisation. Il n'est mis à zéro ici que si aucune heure n'a été saisie du tout pour le mois.")
ws["A20"].font = petit; ws.merge_cells("A20:K20")
ws["A21"] = ("Les heures complémentaires sont celles qui dépassent l'horaire mensualisé. Au-delà de 45 heures "
             "par semaine, un taux majoré peut s'appliquer : il se négocie au contrat et n'est pas calculé ici.")
ws["A21"].font = petit; ws.merge_cells("A21:K21")
ws.freeze_panes = "A6"

# ------------------------------------------------------------------------ Année
ws = wb.create_sheet("Année")
ws.column_dimensions["A"].width = 4
ws.column_dimensions["B"].width = 44
ws.column_dimensions["C"].width = 18
ws.column_dimensions["D"].width = 62
ws.merge_cells("B2:D2"); ws["B2"] = "Le total de l'année"; ws["B2"].font = h1
ws["B2"].fill = fond_titre; ws["B2"].alignment = Alignment(vertical="center"); ws.row_dimensions[2].height = 28

def total(row, libelle, formule, aide, fmt=EUR):
    ws.cell(row=row, column=2, value=libelle).font = gras
    c = ws.cell(row=row, column=3, value=formule)
    c.font = Font(name=F, size=10, bold=True, color=MARINE); c.fill = fond_doux; c.border = bord
    c.number_format = fmt
    a = ws.cell(row=row, column=4, value=aide); a.font = petit
    a.alignment = Alignment(wrap_text=True, vertical="center")

total(4, "Heures réalisées", "=Mois!C18", "Somme des heures saisies dans l'onglet Heures.", HEU)
total(5, "Journées d'accueil", "=SUM(Mois!F6:F17)", "Utile pour vérifier l'indemnité d'entretien.", "#,##0")
total(6, "Salaire brut mensualisé", "=Mois!G18", "Ce qui est dû chaque mois, cumulé sur l'année.")
total(7, "Heures complémentaires brutes", "=Mois!H18", "Les heures au-delà de l'horaire mensualisé.")
total(8, "Salaire brut total", "=ROUND(C6+C7,2)", "C'est la base de l'indemnité de congés payés.")
total(10, "Indemnité de congés payés — 10 %", "=ROUND(C8*0.1,2)",
      "Première méthode : 10 % du brut total. Comparez avec le maintien de salaire, la plus favorable s'applique.")
total(11, "Indemnité d'entretien", "=Mois!I18", "Non soumise à cotisations, et non imposable.")
total(12, "Indemnités de repas", "=Mois!J18", "Non soumises à cotisations dans la limite du barème.")
total(13, "Indemnités kilométriques", "=Mois!K18", "Exonérées si vous tenez une feuille de route mensuelle.")
total(15, "Total des indemnités", "=ROUND(C11+C12+C13,2)", "Se déclarent à part du salaire sur Pajemploi.")
total(16, "Total perçu sur l'année (brut + indemnités)", "=ROUND(C8+C15,2)",
      "Le brut n'est pas le net : les cotisations sont calculées par Pajemploi.")

ws["B18"] = "À ne pas oublier"; ws["B18"].font = Font(name=F, size=11, bold=True, color=TERRA)
notes = [
    "Le versement mensuel des congés payés est interdit : ils se versent en une fois, ou au moment de la prise.",
    "L'indemnité d'entretien et les repas ne sont pas du salaire : ils ne se déclarent pas dans la même case.",
    "Pour la déclaration Pajemploi, la fenêtre court du 25 du mois au 5 du mois suivant.",
    "Ce classeur est une aide au calcul, pas un bulletin de salaire : c'est Pajemploi qui l'établit.",
]
for i, n in enumerate(notes):
    c = ws.cell(row=19 + i, column=2, value="• " + n); c.font = norm
    ws.merge_cells(start_row=19 + i, start_column=2, end_row=19 + i, end_column=4)
    c.alignment = Alignment(wrap_text=True, vertical="top")
    ws.row_dimensions[19 + i].height = 16

ws["B25"] = "Kit TiMat · timat.app · repères à jour au 1er juin 2026, à vérifier chaque année."
ws["B25"].font = petit

for s in wb.worksheets:
    s.sheet_view.showGridLines = False

import os
SORTIE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "documents")
os.makedirs(SORTIE, exist_ok=True)
wb.save(os.path.join(SORTIE, "kit-gestion-assmat.xlsx"))
print("[kit] kit-gestion-assmat.xlsx généré dans documents/")
