# Domaines à autoriser pour le chantier PMI

Liste destinée au champ **Allowed domains** d'un environnement Claude Code
en mode **Custom** (claude.ai/code, icône nuage au-dessus de la boîte de
message, engrenage sur l'environnement). Penser à cocher « Also include
default list of common package managers », sinon npm et GitHub cessent de
répondre et le build casse.

Un domaine inutile dans cette liste ne coûte rien : s'il n'existe pas, il
n'est jamais sollicité. Une omission, elle, bloque une vérification. La
liste est donc volontairement large.

Le changement n'est pris en compte qu'au démarrage d'une **nouvelle**
session : celle en cours reste bloquée. La première session suivante
rejoue le script d'installation, donc démarre plus lentement.

## 1. Sources nationales

Ce sont elles qui débloquent le chantier « exigences par PMI ».

```
legifrance.gouv.fr
*.legifrance.gouv.fr
service-public.fr
*.service-public.fr
travail-emploi.gouv.fr
*.travail-emploi.gouv.fr
urssaf.fr
*.urssaf.fr
solidarites.gouv.fr
*.solidarites.gouv.fr
fepem.fr
*.fepem.fr
monenfant.fr
*.monenfant.fr
```

## 2. Conseils départementaux — domaines confirmés

Relevés dans les URL déjà enregistrées dans `data/pmi-departements.json`.
Aucune supposition ici.

```
ain.fr
*.ain.fr
aisne.com
*.aisne.com
allier.fr
*.allier.fr
mondepartement04.fr
*.mondepartement04.fr
hautes-alpes.fr
*.hautes-alpes.fr
departement06.fr
*.departement06.fr
ardeche.fr
*.ardeche.fr
cd08.fr
*.cd08.fr
ariege.fr
*.ariege.fr
aube.fr
*.aube.fr
aude.fr
*.aude.fr
aveyron.fr
*.aveyron.fr
departement13.fr
*.departement13.fr
calvados.fr
*.calvados.fr
cantal.fr
*.cantal.fr
lacharente.fr
*.lacharente.fr
charente-maritime.fr
*.charente-maritime.fr
departement18.fr
*.departement18.fr
finistere.fr
*.finistere.fr
haute-garonne.fr
*.haute-garonne.fr
gironde.fr
*.gironde.fr
herault.fr
*.herault.fr
ille-et-vilaine.fr
*.ille-et-vilaine.fr
isere.fr
*.isere.fr
loire-atlantique.fr
*.loire-atlantique.fr
maine-et-loire.fr
*.maine-et-loire.fr
moselle.fr
*.moselle.fr
lenord.fr
*.lenord.fr
oise.fr
*.oise.fr
pasdecalais.fr
*.pasdecalais.fr
alsace.eu
*.alsace.eu
rhone.fr
*.rhone.fr
seinemaritime.fr
*.seinemaritime.fr
seine-et-marne.fr
*.seine-et-marne.fr
yvelines.fr
*.yvelines.fr
essonne.fr
*.essonne.fr
```

## 3. Conseils départementaux — domaines probables

Non vérifiés, faute d'accès réseau. Plusieurs variantes sont listées
quand le nom d'usage est incertain. C'est sans risque : la variante
fausse reste inerte.

```
correze.fr
*.correze.fr
cotedor.fr
*.cotedor.fr
cotesdarmor.fr
*.cotesdarmor.fr
creuse.fr
*.creuse.fr
dordogne.fr
*.dordogne.fr
doubs.fr
*.doubs.fr
ladrome.fr
*.ladrome.fr
eure.fr
*.eure.fr
eurelien.fr
*.eurelien.fr
isula.corsica
*.isula.corsica
corse.fr
*.corse.fr
gard.fr
*.gard.fr
gers.fr
*.gers.fr
indre.fr
*.indre.fr
touraine.fr
*.touraine.fr
jura.fr
*.jura.fr
landes.fr
*.landes.fr
departement41.fr
*.departement41.fr
loire.fr
*.loire.fr
hauteloire.fr
*.hauteloire.fr
loiret.fr
*.loiret.fr
lot.fr
*.lot.fr
lotetgaronne.fr
*.lotetgaronne.fr
lozere.fr
*.lozere.fr
manche.fr
*.manche.fr
marne.fr
*.marne.fr
haute-marne.fr
*.haute-marne.fr
lamayenne.fr
*.lamayenne.fr
meurthe-et-moselle.fr
*.meurthe-et-moselle.fr
meuse.fr
*.meuse.fr
morbihan.fr
*.morbihan.fr
nievre.fr
*.nievre.fr
orne.fr
*.orne.fr
puy-de-dome.fr
*.puy-de-dome.fr
le64.fr
*.le64.fr
pyrenees-atlantiques.fr
*.pyrenees-atlantiques.fr
hautespyrenees.fr
*.hautespyrenees.fr
ha-py.fr
*.ha-py.fr
cd66.fr
*.cd66.fr
ledepartement66.fr
*.ledepartement66.fr
haute-saone.fr
*.haute-saone.fr
saoneetloire71.fr
*.saoneetloire71.fr
sarthe.fr
*.sarthe.fr
savoie.fr
*.savoie.fr
hautesavoie.fr
*.hautesavoie.fr
paris.fr
*.paris.fr
deux-sevres.fr
*.deux-sevres.fr
somme.fr
*.somme.fr
tarn.fr
*.tarn.fr
ledepartement82.fr
*.ledepartement82.fr
tarn-et-garonne.fr
*.tarn-et-garonne.fr
var.fr
*.var.fr
vaucluse.fr
*.vaucluse.fr
vendee.fr
*.vendee.fr
lavienne86.fr
*.lavienne86.fr
departement86.fr
*.departement86.fr
haute-vienne.fr
*.haute-vienne.fr
vosges.fr
*.vosges.fr
yonne.fr
*.yonne.fr
territoiredebelfort.fr
*.territoiredebelfort.fr
hauts-de-seine.fr
*.hauts-de-seine.fr
seinesaintdenis.fr
*.seinesaintdenis.fr
valdemarne.fr
*.valdemarne.fr
valdoise.fr
*.valdoise.fr
cg971.fr
*.cg971.fr
guadeloupe.fr
*.guadeloupe.fr
collectivitedemartinique.mq
*.collectivitedemartinique.mq
ctguyane.fr
*.ctguyane.fr
departement974.fr
*.departement974.fr
cg974.fr
*.cg974.fr
cg976.fr
*.cg976.fr
departement976.yt
*.departement976.yt
```

## Alternative

Si la liste devient pénible à maintenir, le niveau **Full** ouvre tout.
Les sessions restent isolées dans leur machine virtuelle et les
identifiants GitHub restent hors du bac à sable, quel que soit le niveau
choisi : la différence porte sur ce que la session peut joindre, pas sur
ce qu'elle peut divulguer du compte.
