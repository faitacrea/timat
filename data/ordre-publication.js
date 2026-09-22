// Ordre de publication du blog — source de vérité pour le cron.
// Généré depuis docs/ordre-publication-blog.md, qui reste le document lisible
// (contraintes de dépendance et raisonnement éditorial).
// Module JS plutôt que JSON : pas d'assertion d'import, groupage serverless sûr.
export const ordre = [
  // Placé en tête : il explique les 100 pages /assistante-maternelle/<dep>/tarif
  // mises en ligne le 28 août et leur envoie de l'autorité. Ses deux liens blog
  // pointent vers des articles déjà publiés, il ne dépend donc de rien.
  "salaire-assistante-maternelle-par-departement",
  "parents-vacances-hors-conges-assistante-maternelle",
  "fin-de-contrat-assistante-maternelle",
  "quand-chercher-mode-de-garde",
  "vaccins-obligatoires-refus-accueil-assistante-maternelle",
  "periode-adaptation-essai-assistante-maternelle",
  "declaration-pajemploi-par-enfant-2026",
  "jours-feries-assistante-maternelle",
  "contrat-travail-assistante-maternelle",
  "changement-horaires-contrat-assistante-maternelle",
  "pajemploi-plus-obligation-2027",
  "questions-a-poser-assistante-maternelle-avant-signature",
  "separation-parents-contrat-assistante-maternelle",
  "retards-depassements-horaires-assistante-maternelle",
  "avance-immediate-credit-impot-garde-enfant",
  "tiers-vient-chercher-enfant-assistante-maternelle",
  "impayes-salaire-assistante-maternelle",
  "parents-ne-viennent-pas-chercher-enfant-assistante-maternelle",
  "indemnite-repas-assistante-maternelle",
  "nombre-enfants-accueillis-agrement-assistante-maternelle",
  "arret-travail-assistante-maternelle",
  "augmenter-son-tarif-horaire-assistante-maternelle",
  "micro-creche-cmg-structure",
  "bulletin-de-paie-manquant-assistante-maternelle",
  "maison-assistantes-maternelles-mam",
  "demenagement-agrement-contrats-assistante-maternelle",
  "developpement-moteur-motricite-libre-assistante-maternelle",
  "declaration-revenus-assistante-maternelle-abattement",

  // Ajoutés le 16 septembre 2026, après un relevé des sujets absents des 45
  // articles publiés. Classés par urgence : d'abord une obligation légale que
  // le blog n'évoquait nulle part, puis l'erreur de calcul la plus coûteuse,
  // puis un droit que personne ne réclame.
  //
  // Aucun ne cite d'article de blog : ils n'ont donc aucune dépendance et
  // peuvent se publier dans cet ordre sans attendre.
  //
  // Un dixième sujet — les majorations d'horaires atypiques et de nuit — a été
  // écarté volontairement : les sources consultées se contredisent, et la règle
  // trouvée visait les salariés du particulier employeur à domicile, pas les
  // assistants maternels. Publier une majoration fausse sur une paie serait
  // pire que ne rien publier.
  "assurance-responsabilite-civile-professionnelle-assistante-maternelle",
  "annee-complete-incomplete-assistante-maternelle",
  "retraite-assistante-maternelle-trimestres-ircem",
  "aeeh-majoration-cmg-enfant-handicap-assistante-maternelle",
  "transport-enfants-voiture-assistante-maternelle",
  "releve-heures-assistante-maternelle-preuve",
  "demission-assistante-maternelle-preavis-procedure",
  "formation-obligatoire-120-heures-assistante-maternelle",
  "prevoyance-ircem-assistante-maternelle",
  // Cinq articles écrits d'avance, tous sourcés. Le fil conducteur du lot :
  // ce qui change quand on a plusieurs employeurs — c'est la particularité du
  // métier, et c'est là que les droits se perdent le plus souvent.
  "grossesse-protection-retrait-enfant-assistante-maternelle",
  "conge-maternite-assistante-maternelle-indemnites",
  "conges-evenements-familiaux-assistante-maternelle",
  "indemnite-depart-retraite-assistante-maternelle",
  "formation-continue-assistante-maternelle-58-heures",
  // Huit articles ecrits pour le parent employeur, et c'est le point : sur les
  // cinquante et un articles en ligne, six seulement lui parlaient directement.
  // Le filtre du blog pouvait bien separer les roles, il ne pouvait pas
  // inventer des articles qui n'existaient pas.
  //
  // Ils sont ranges du plus attendu au moins urgent : l'argent d'abord (ce
  // qu'on paie, quand, et ce qu'on doit encore quand l'enfant n'est pas la),
  // puis les demarches, puis le choix du mode de garde. Les cinq premiers
  // inaugurent la rubrique « Cote parent employeur », qui manquait.
  "budget-mensuel-parent-employeur-assistante-maternelle",
  "rompre-contrat-assistante-maternelle-parent-employeur",
  "periode-adaptation-assistante-maternelle-parent",
  "enfant-malade-absence-ce-que-le-parent-doit-payer",
  "contrat-assistante-maternelle-cote-parent-employeur",
  "premiere-declaration-pajemploi-parent-employeur",
  "assistante-maternelle-ou-garde-a-domicile-cout",
  "trouver-une-assistante-maternelle-ou-chercher-quand",
];
export default ordre;
