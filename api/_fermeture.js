// LA FERMETURE D'UN COMPTE, EN UN SEUL ENDROIT.
//
// Deux chemins y passent : /api/stripe (action « fermeture »), quand
// l'utilisatrice programme, annule ou demande une suppression immediate ; et
// la tache quotidienne /api/cron-essais, qui rappelle la date aux familles
// puis execute la suppression programmee. Le premier tourne en Node, la
// seconde en Edge : ce module n'utilise donc que fetch, et recoit le client
// Supabase de l'appelant.
//
// POURQUOI CE MODULE EXISTE. Supprimer son compte n'arretait pas l'abonnement
// Stripe : une assistante maternelle abonnee qui partait continuait d'etre
// prelevee de 9,99 EUR par mois, sans plus avoir de compte. Et la suppression
// effacait sur-le-champ le contrat, les bulletins et le registre des heures
// que voient aussi les parents employeurs, sans qu'ils soient prevenus.

export const DELAI_FERMETURE_JOURS = 15;

export const dateLongue = (iso) => new Date(iso).toLocaleDateString('fr-FR', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris',
});

// « Léo », « Léo et Jade », « Léo, Jade et Tom ».
const listeFr = (noms) => {
  const n = (noms || []).filter(Boolean);
  if (n.length <= 1) return n[0] || '';
  return n.slice(0, -1).join(', ') + ' et ' + n[n.length - 1];
};

// Les familles reliees a une assistante maternelle : un parent par adresse,
// avec les prenoms de ses enfants accueillis.
export async function famillesDe(supabase, asmatId) {
  const { data: enfants, error } = await supabase.from('enfants')
    .select('prenom, parent_id').eq('asmat_id', asmatId).not('parent_id', 'is', null);
  if (error) throw new Error('lecture des enfants : ' + error.message);
  const parParent = new Map();
  for (const e of enfants || []) {
    if (!parParent.has(e.parent_id)) parParent.set(e.parent_id, []);
    parParent.get(e.parent_id).push(e.prenom || '');
  }
  if (!parParent.size) return [];
  const { data: parents, error: e2 } = await supabase.from('profiles')
    .select('id, email, prenom').in('id', [...parParent.keys()]);
  if (e2) throw new Error('lecture des parents : ' + e2.message);
  return (parents || []).filter((p) => p.email).map((p) => ({
    email: p.email, prenom: p.prenom || '', enfants: listeFr(parParent.get(p.id)),
  }));
}

// Un courriel par famille, par le seul endroit ou vivent les gabarits.
// Rend le nombre de familles et le nombre de courriels partis : l'appelant
// doit pouvoir dire « 2 familles prevenues sur 3 », pas « c'est fait ».
// « dejaLues » evite une seconde lecture quand l'appelant a deja la liste :
// une panne entre les deux laisserait une date posee et personne de prevenu.
export async function prevenirFamilles({ supabase, asmatId, asmatPrenom, type, le, appUrl, secret, dejaLues }) {
  const familles = dejaLues || await famillesDe(supabase, asmatId);
  let envoyes = 0;
  for (const f of familles) {
    try {
      const res = await fetch(`${appUrl}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-timat-interne': secret || '' },
        body: JSON.stringify({
          type, to: f.email,
          vars: { parent_prenom: f.prenom, asmat_prenom: asmatPrenom || '', enfants: f.enfants,
            date: le ? dateLongue(le) : '', url: appUrl },
        }),
      });
      if (res.ok) envoyes++;
      else console.error('[fermeture] courriel refusé :', res.status, type);
    } catch (e) {
      console.error('[fermeture] courriel non parti :', e.message, type);
    }
  }
  return { familles: familles.length, envoyes };
}

// Stripe par son API HTTP : le meme code sert en Node et en Edge.
async function stripeHttp(chemin, { methode = 'GET', corps = null } = {}) {
  const cle = process.env.STRIPE_SECRET_KEY;
  if (!cle) throw new Error('STRIPE_SECRET_KEY absente : abonnement impossible à vérifier');
  const res = await fetch('https://api.stripe.com/v1/' + chemin, {
    method: methode,
    headers: { Authorization: 'Bearer ' + cle, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: corps ? new URLSearchParams(corps).toString() : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error('Stripe ' + res.status + ' : ' + (json.error && json.error.message || 'erreur'));
  return json;
}

// Les abonnements qui peuvent encore donner lieu a un prelevement.
const FACTURABLES = ['active', 'trialing', 'past_due', 'unpaid', 'incomplete'];

// La marque posee par TiMat quand il programme l'arret d'un abonnement. Elle
// permet de le reprendre si la fermeture est annulee — et seulement celui-la :
// un abonnement que l'utilisatrice a resilie elle-meme, dans le portail, ne
// porte pas cette marque et n'est jamais relance.
const MARQUE = 'fermeture_timat';

// mode « fin_periode » : plus de prelevement, l'acces dure jusqu'a la fin de
//                         la periode payee (suppression programmee) ;
// mode « reprendre »    : annule l'arret pose par TiMat (fermeture annulee) ;
// mode « immediat »     : arrete tout, tout de suite (suppression effective).
// Rend le nombre d'abonnements touches. Sans client Stripe, rien a faire.
export async function reglerAbonnements(customerId, mode) {
  if (!customerId) return 0;
  const liste = await stripeHttp('subscriptions?customer=' + encodeURIComponent(customerId) + '&status=all&limit=20');
  const subs = (liste.data || []).filter((s) => FACTURABLES.includes(s.status));
  let touches = 0;
  for (const s of subs) {
    if (mode === 'immediat') {
      await stripeHttp('subscriptions/' + s.id, { methode: 'DELETE' });
      touches++;
    } else if (mode === 'fin_periode' && !s.cancel_at_period_end) {
      await stripeHttp('subscriptions/' + s.id, { methode: 'POST',
        corps: { cancel_at_period_end: 'true', ['metadata[' + MARQUE + ']']: '1' } });
      touches++;
    } else if (mode === 'reprendre' && s.cancel_at_period_end && s.metadata && s.metadata[MARQUE]) {
      await stripeHttp('subscriptions/' + s.id, { methode: 'POST',
        corps: { cancel_at_period_end: 'false', ['metadata[' + MARQUE + ']']: '' } });
      touches++;
    }
  }
  return touches;
}

// Les fichiers d'un compte (photos, documents). Supabase interdit de les
// effacer depuis SQL : la suppression programmee, qui tourne sans navigateur,
// le fait ici avec la cle de service — comme viderStockageDuCompte() le fait
// dans l'application pour une suppression immediate. Rend le nombre de
// fichiers qui n'ont pas pu etre effaces.
export async function viderStockage(supabase, userId) {
  let restants = 0;
  for (const bucket of ['photos', 'documents']) {
    const aEffacer = [];
    const parcourir = async (prefixe) => {
      const { data, error } = await supabase.storage.from(bucket).list(prefixe, { limit: 1000 });
      if (error || !data) return;
      for (const entree of data) {
        const chemin = prefixe ? prefixe + '/' + entree.name : entree.name;
        if (entree.id === null || entree.metadata === null) await parcourir(chemin);
        else aEffacer.push(chemin);
      }
    };
    await parcourir(String(userId));
    for (let i = 0; i < aEffacer.length; i += 100) {
      const lot = aEffacer.slice(i, i + 100);
      const { error } = await supabase.storage.from(bucket).remove(lot);
      if (error) restants += lot.length;
    }
  }
  return restants;
}
