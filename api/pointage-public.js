import { createClient } from '@supabase/supabase-js';

/**
 * Le pointage par QR, sans compte et sans connexion préalable.
 *
 * Le parent scanne le QR affiché à l'entrée, arrive sur /p/<jeton>, tape le
 * code à quatre chiffres de sa famille, et son arrivée — puis son départ —
 * sont enregistrés. Aucun compte à créer, aucune application à installer.
 *
 * Trois choses que cette route ne fait pas, volontairement :
 *
 *   1. elle ne porte jamais l'identifiant de l'enfant. Le QR ne contient
 *      qu'un jeton aléatoire, révocable : regénérer le jeton invalide le QR
 *      imprimé, ce qu'un identifiant d'enfant ne permettrait jamais ;
 *
 *   2. elle ne révèle rien avant le code. La page servie en GET ne sait pas
 *      si le jeton existe et ne dit pas de quel enfant il s'agit. Le prénom
 *      n'apparaît qu'une fois le code juste ;
 *
 *   3. elle ne compte pas les tentatives dans le navigateur. Le blocage
 *      après cinq échecs est tenu par la base, dans pointage_par_jeton.
 *
 * La clé de service ne sert qu'ici, côté serveur : le RPC n'est exécutable
 * ni par anon, ni par un utilisateur connecté.
 */

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const JETON = /^[A-Za-z0-9_-]{16,64}$/;
const CODE = /^\d{4}$/;

function page(jeton) {
  // Le jeton est déjà validé par JETON ci-dessus : pas de guillemet possible.
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>Pointage | TiMat</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#FDFBF8;color:#2E4859;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
.b{width:100%;max-width:360px;background:#fff;border:1px solid #E4DCD0;border-radius:18px;padding:26px 22px;
  text-align:center;box-shadow:0 8px 28px rgba(46,72,89,.09)}
h1{font-size:19px;margin:0 0 4px}
.s{font-size:14px;color:#6B7C8A;margin:0 0 18px}
.pts{display:flex;gap:12px;justify-content:center;margin:0 0 18px}
.pt{width:15px;height:15px;border-radius:50%;border:2px solid #C9BCA9;background:#fff}
.pt.on{background:#C84B31;border-color:#C84B31}
.pav{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.pav button{font-size:22px;font-weight:600;padding:16px 0;border:1px solid #E4DCD0;background:#FDFBF8;
  border-radius:12px;color:#2E4859;cursor:pointer;font-family:inherit}
.pav button:active{background:#F1E9DE}
.pav .eff{font-size:17px}
.msg{margin:16px 0 0;font-size:15px;line-height:1.5;min-height:22px}
.msg.ko{color:#B33A24}
.msg.ok{color:#3F7A63;font-weight:600}
.gd{font-size:34px;margin:0 0 6px}
a{color:#6B7C8A;font-size:13px;display:inline-block;margin-top:18px}
</style></head><body><div class="b" id="b">
<h1>Pointage</h1>
<p class="s">Entrez le code à 4 chiffres de votre famille.</p>
<div class="pts" id="pts"><i class="pt"></i><i class="pt"></i><i class="pt"></i><i class="pt"></i></div>
<div class="pav" id="pav"></div>
<p class="msg" id="msg"></p>
<a href="https://www.timat.app/">TiMat</a>
</div>
<script>
var J=${JSON.stringify(jeton)},code="",envoi=false;
var pts=document.getElementById('pts').children,msg=document.getElementById('msg');
function dessine(){for(var i=0;i<4;i++)pts[i].className='pt'+(i<code.length?' on':'');}
function dit(t,c){msg.textContent=t;msg.className='msg'+(c?' '+c:'');}
var pav=document.getElementById('pav');
['1','2','3','4','5','6','7','8','9','','0','eff'].forEach(function(t){
  var b=document.createElement('button');
  if(t==='')  {b.style.visibility='hidden';b.disabled=true;}
  b.textContent=t==='eff'?'\\u232B':t;
  if(t==='eff')b.className='eff';
  b.onclick=function(){
    if(envoi)return;
    if(t==='eff'){code=code.slice(0,-1);dessine();return;}
    if(t===''||code.length>=4)return;
    code+=t;dessine();
    if(code.length===4)envoyer();
  };
  pav.appendChild(b);
});
function envoyer(){
  envoi=true;dit('Enregistrement…');
  fetch('/api/pointage-public',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({jeton:J,code:code})})
  .then(function(r){return r.json();})
  .then(function(d){
    code="";dessine();envoi=false;
    if(!d||!d.success){dit((d&&d.error)||'Code incorrect','ko');return;}
    // Le prénom vient de la base. Il est écrit par l'assistante maternelle,
    // pas par un inconnu — mais il passe par du texte, jamais par du HTML :
    // c'est la règle partout ailleurs dans TiMat, elle vaut aussi ici.
    var b=document.getElementById('b');
    b.textContent='';
    var g=document.createElement('p');g.className='gd';g.textContent=d.emoji||'';
    var h=document.createElement('h1');
    h.textContent=d.action==='arrivee'?'Arrivée enregistrée':'Départ enregistré';
    var l=document.createElement('p');l.className='s';
    l.textContent=(d.prenom||'')+' \u2014 '+(d.heure||'');
    b.appendChild(g);b.appendChild(h);b.appendChild(l);
  })
  .catch(function(){code="";dessine();envoi=false;dit("Pas de réseau. Réessayez dans un instant.",'ko');});
}
dessine();
</script></body></html>`;
}

export default async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const jeton = String(req.query?.j || '').trim();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Un jeton mal formé ne dit pas qu'il est mal formé : la page est la même
    // que pour un jeton valide, le code sera simplement toujours refusé.
    return res.status(200).send(page(JETON.test(jeton) ? jeton : ''));
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ success: false, error: 'Méthode non autorisée' });
  }

  const corps = typeof req.body === 'string' ? safeJson(req.body) : req.body || {};
  const jeton = String(corps.jeton || '').trim();
  const code = String(corps.code || '').trim();

  // Même réponse qu'un code faux : la forme du jeton ne se devine pas plus
  // que son existence.
  if (!JETON.test(jeton) || !CODE.test(code)) {
    return res.status(200).json({ success: false, error: 'Code incorrect' });
  }

  const { data, error } = await supabase.rpc('pointage_par_jeton', {
    p_jeton: jeton,
    p_code: code,
  });

  if (error) {
    console.error('[pointage-public] Supabase :', error.message);
    return res.status(500).json({ success: false, error: "Le pointage n'a pas pu être enregistré. Réessayez." });
  }

  return res.status(200).json(data);
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
