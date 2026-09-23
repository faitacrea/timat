// Le formulaire public de demande d'accueil.
//
// POURQUOI CE CHEMIN, ET PAS L'E-MAIL AUTOMATIQUE.
//
// L'idee de depart etait de donner a monenfant.fr une adresse e-mail TiMat, et
// de faire arriver les messages des parents directement dans l'application.
// monenfant.fr n'expose ni formulaire ni webhook : un parent y trouve un
// telephone ou une adresse, rien d'autre. Recevoir du courrier demanderait un
// service de reception, un domaine dedie et des enregistrements DNS — trois
// choses qu'on ne peut pas promettre tant qu'elles ne sont pas en place.
//
// Le lien public, lui, marche partout et tout de suite : dans la presentation
// monenfant.fr, sur une page Facebook, dans une signature de mail, sur une
// affichette a l'entree.
//
// TROIS CHOSES QUE CETTE ROUTE NE FAIT PAS, VOLONTAIREMENT :
//
//   1. elle ne porte jamais l'identifiant de l'assistante maternelle. Le lien
//      ne contient qu'un jeton aleatoire, revocable : le regenerer invalide
//      l'ancien lien, ce qu'un identifiant de compte ne permettrait jamais ;
//
//   2. elle ne dit RIEN sur l'assistante maternelle avant l'envoi — ni nom, ni
//      commune, ni disponibilite. Un jeton inconnu et un jeton valide rendent
//      la meme page. Sans cela, le lien deviendrait un annuaire qu'on parcourt
//      au hasard ;
//
//   3. elle n'envoie pas d'e-mail de confirmation au parent. L'adresse saisie
//      n'est pas verifiee : envoyer un message a une adresse qu'on ne controle
//      pas, sur simple soumission d'un formulaire anonyme, transformerait la
//      route en relais d'envoi pour n'importe qui.
//
// Elle tourne en Edge : le plan Hobby n'accepte que douze fonctions serverless,
// et elles sont toutes prises. Une treizieme ferait ECHOUER le deploiement de
// production alors que la construction reussirait.
export const config = { runtime: 'edge' };

const URL_SUPABASE = process.env.VITE_SUPABASE_URL;
const CLE_SERVICE = process.env.SUPABASE_SERVICE_KEY;

const H = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Les bornes ne sont pas cosmetiques : sans elles, un seul envoi peut deposer
// plusieurs megaoctets dans la base.
const BORNES = {
  parent_nom: 80, parent_email: 120, parent_tel: 30,
  enfant_prenom: 60, besoin: 200, message: 2000,
};
const coupe = (v, max) => {
  const t = String(v == null ? "" : v).trim();
  return t ? t.slice(0, max) : null;
};
// Une date vide, illisible ou absurde devient null. « 0000-00-00 » insere en
// base ferait planter l'affichage du jour ou quelqu'un l'ouvre.
const date = (v) => {
  const t = String(v || "").trim();
  // La forme AAAA-MM-JJ d'abord, la validite ensuite. Le premier test est une
  // ceinture : « 15/03/2024 » donnerait deja une date invalide au second. C'est
  // le second qui fait le travail — verifie en le retirant.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(t + "T12:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const an = d.getFullYear();
  return an >= 1990 && an <= 2100 ? t : null;
};

const page = (corps) => new Response(
  `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Demande d'accueil — TiMat</title>
<link rel="stylesheet" href="/timat-design.css">
<style>
 *{box-sizing:border-box;margin:0;padding:0}
 body{font-family:'Outfit',system-ui,sans-serif;background:#FDFBF8;color:#2E4859;line-height:1.65;padding:26px 18px}
 .w{max-width:520px;margin:0 auto}
 .c{background:#fff;border:1px solid #EDE6DE;border-radius:16px;padding:24px 22px;box-shadow:0 8px 28px rgba(46,72,89,.07)}
 h1{font-family:'Quicksand','Outfit',sans-serif;font-size:23px;margin-bottom:8px}
 p.s{font-size:14px;color:#55707C;margin-bottom:20px}
 label{display:block;font-size:13px;font-weight:600;margin:14px 0 4px}
 input,textarea,select{width:100%;border:1px solid #DDD5C8;border-radius:10px;padding:12px;font-size:16px;font-family:inherit;background:#FDFBF8;color:#2E4859}
 textarea{min-height:100px;resize:vertical}
 .r{display:grid;grid-template-columns:1fr 1fr;gap:12px}
 button{width:100%;margin-top:20px;background:linear-gradient(135deg,#E49178,#C76754);color:#fff;border:none;border-radius:12px;padding:15px;font-size:16px;font-weight:700;font-family:inherit;cursor:pointer}
 .n{font-size:12px;color:#6B7A82;margin-top:14px}
 .ok{text-align:center;padding:14px 0}
 .ok .e{font-size:44px;margin-bottom:10px}
 @media(max-width:460px){.r{grid-template-columns:1fr}}
</style></head><body><div class="w"><div class="c">${corps}</div>
<p class="n" style="text-align:center">Formulaire propulsé par TiMat</p></div></body></html>`,
  { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

const FORMULAIRE = (jeton, erreur) => page(`
 <h1>Votre demande d'accueil</h1>
 <p class="s">Ce formulaire arrive directement chez l'assistante maternelle. Elle vous répondra par le moyen que vous indiquez.</p>
 ${erreur ? `<p style="background:#FFF6F2;border-left:3px solid #C84B31;padding:10px 12px;border-radius:8px;font-size:14px;margin-bottom:14px">${H(erreur)}</p>` : ""}
 <form method="POST">
  <input type="hidden" name="j" value="${H(jeton)}">
  <label for="pn">Votre nom *</label><input id="pn" name="parent_nom" required maxlength="80">
  <div class="r">
   <div><label for="pe">Votre e-mail</label><input id="pe" name="parent_email" type="email" maxlength="120"></div>
   <div><label for="pt">Votre téléphone</label><input id="pt" name="parent_tel" type="tel" maxlength="30"></div>
  </div>
  <div class="r">
   <div><label for="ep">Prénom de l'enfant</label><input id="ep" name="enfant_prenom" maxlength="60"></div>
   <div><label for="en">Sa date de naissance</label><input id="en" name="enfant_naissance" type="date"></div>
  </div>
  <div class="r">
   <div><label for="ds">Accueil souhaité à partir du</label><input id="ds" name="debut_souhaite" type="date"></div>
   <div><label for="bs">Besoin</label>
    <select id="bs" name="besoin">
     <option value="">À préciser</option>
     <option>Temps plein</option><option>Temps partiel</option>
     <option>Périscolaire</option><option>Horaires atypiques</option>
     <option>Accueil occasionnel</option>
    </select></div>
  </div>
  <label for="m">Votre message</label>
  <textarea id="m" name="message" maxlength="2000" placeholder="Vos horaires habituels, vos questions…"></textarea>
  <button type="submit">Envoyer ma demande</button>
 </form>
 <p class="n">Vos coordonnées ne servent qu'à vous recontacter. Elles ne sont ni revendues, ni utilisées pour autre chose.</p>`);

export default async function handler(req) {
  const url = new URL(req.url);

  if (req.method === "GET") {
    // On ne verifie PAS le jeton ici : repondre « inconnu » revelerait quels
    // jetons existent, et le lien deviendrait un annuaire qu'on sonde.
    return FORMULAIRE(url.searchParams.get("j") || "", null);
  }
  if (req.method !== "POST") return new Response("Méthode non autorisée", { status: 405 });

  let f;
  try { f = await req.formData(); }
  catch { return FORMULAIRE(url.searchParams.get("j") || "", "Le formulaire n'a pas pu être lu. Réessayez."); }

  const jeton = String(f.get("j") || "").trim();
  const nom = coupe(f.get("parent_nom"), BORNES.parent_nom);
  const email = coupe(f.get("parent_email"), BORNES.parent_email);
  const tel = coupe(f.get("parent_tel"), BORNES.parent_tel);

  if (!nom) return FORMULAIRE(jeton, "Votre nom est nécessaire pour que l'assistante maternelle sache qui la contacte.");
  // Sans moyen de recontact, la demande ne sert a personne : ni au parent, qui
  // n'aura pas de reponse, ni a l'assistante maternelle, qui verra un message
  // auquel elle ne peut pas repondre.
  if (!email && !tel) return FORMULAIRE(jeton, "Laissez au moins un e-mail ou un téléphone, sans quoi personne ne pourra vous répondre.");

  if (!URL_SUPABASE || !CLE_SERVICE) return FORMULAIRE(jeton, "Le service est momentanément indisponible. Réessayez plus tard.");

  const entetes = { apikey: CLE_SERVICE, Authorization: "Bearer " + CLE_SERVICE, "content-type": "application/json" };

  try {
    const r = await fetch(
      `${URL_SUPABASE}/rest/v1/profiles?select=id&jeton_demandes=eq.${encodeURIComponent(jeton)}&limit=1`,
      { headers: entetes });
    const trouves = r.ok ? await r.json() : [];
    // Jeton inconnu : on rend la MEME page de confirmation qu'un envoi reussi.
    // Distinguer les deux dirait a qui sonde quels liens existent, et rien de
    // ce que le parent a ecrit n'est conserve.
    if (!trouves.length) return page(`<div class="ok"><div class="e">✅</div><h1>Votre demande est partie</h1><p class="s">L'assistante maternelle vous répondra directement.</p></div>`);

    const ins = await fetch(`${URL_SUPABASE}/rest/v1/demandes`, {
      method: "POST", headers: { ...entetes, Prefer: "return=minimal" },
      body: JSON.stringify({
        asmat_id: trouves[0].id,
        parent_nom: nom, parent_email: email, parent_tel: tel,
        enfant_prenom: coupe(f.get("enfant_prenom"), BORNES.enfant_prenom),
        enfant_naissance: date(f.get("enfant_naissance")),
        debut_souhaite: date(f.get("debut_souhaite")),
        besoin: coupe(f.get("besoin"), BORNES.besoin),
        message: coupe(f.get("message"), BORNES.message),
        statut: "nouveau", source: "lien public",
      }),
    });
    if (!ins.ok) return FORMULAIRE(jeton, "L'envoi a échoué. Réessayez dans un instant.");
  } catch {
    return FORMULAIRE(jeton, "L'envoi a échoué. Réessayez dans un instant.");
  }

  return page(`<div class="ok"><div class="e">✅</div><h1>Votre demande est partie</h1><p class="s">L'assistante maternelle la recevra dans son application et vous répondra directement.</p></div>`);
}
