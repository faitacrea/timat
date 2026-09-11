// sw.js — Socle hors ligne de TiMat.
//
// Deux regles, et une seule raison a chacune :
//
// 1. Les pages (navigation) sont TOUJOURS demandees au reseau d'abord.
//    Sans cela, une mise en ligne ne serait jamais vue : l'application
//    resterait figee sur la version mise en cache le jour de l'installation.
//    Le cache ne sert que de filet quand le reseau ne repond pas.
//
// 2. Les fichiers de /assets/ portent une empreinte dans leur nom
//    (index-a1b2c3.js). Un nom donne designe un contenu fige pour toujours :
//    on peut donc les servir depuis le cache sans jamais risquer de servir
//    une version perimee.
//
// Rien d'autre n'est mis en cache. Les donnees (contrats, pointages) ne
// passent pas par ici : elles sont conservees par l'application elle-meme,
// qui sait ce qui appartient a qui.

const CACHE = 'timat-hors-ligne-v1';
const COQUILLE = '/';
const MAX_ASSETS = 80; // borne la croissance du cache au fil des mises en ligne

// A l'installation, on met la page ET le code en reserve.
//
// Mettre la seule page ne suffit pas : au tout premier chargement, les fichiers
// de /assets/ sont demandes AVANT que le service worker ne prenne les commandes,
// ils ne passent donc jamais par lui et ne sont jamais mis en cache. Au
// rechargement suivant sans reseau, la page s'affichait mais l'application ne
// demarrait pas — un ecran « Chargement... » qui ne finit jamais.
// On lit donc la page fraichement recuperee et on met en reserve les fichiers
// qu'elle reclame. Leur nom porte une empreinte : on prend toujours les bons.
async function mettreEnReserve() {
  const cache = await caches.open(CACHE);
  const rep = await fetch(COQUILLE, { cache: 'reload' });
  if (!rep || !rep.ok) return;
  const html = await rep.clone().text();
  await cache.put(COQUILLE, rep);
  const fichiers = [...new Set([...html.matchAll(/["'](\/assets\/[^"']+)["']/g)].map((m) => m[1]))];
  // Le logo et l'icone : sans eux, l'ecran de demarrage hors ligne est casse.
  fichiers.push('/logo.png', '/assmat.svg', '/manifest.json');
  await Promise.all(fichiers.map((f) => cache.add(f).catch(() => {})));
}

self.addEventListener('install', (e) => {
  e.waitUntil(mettreEnReserve().catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(noms.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Supprime les plus anciennes entrees d'assets quand le cache depasse la borne.
// keys() rend les entrees dans leur ordre d'insertion : les premieres sont les plus vieilles.
async function elaguer(cache) {
  const entrees = (await cache.keys()).filter((r) => new URL(r.url).pathname.startsWith('/assets/'));
  const trop = entrees.length - MAX_ASSETS;
  for (let i = 0; i < trop; i++) await cache.delete(entrees[i]);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return; // Supabase, Sanity : jamais interceptes

  // 1. Les pages : reseau d'abord, cache en secours.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((rep) => {
          if (rep && rep.ok) {
            const copie = rep.clone();
            caches.open(CACHE).then((c) => c.put(COQUILLE, copie)).catch(() => {});
          }
          return rep;
        })
        .catch(() => caches.match(COQUILLE, { ignoreVary: true }).then((r) => r || Response.error()))
    );
    return;
  }

  // 2. Les fichiers a empreinte et les images de la coquille : cache d'abord.
  //
  // ignoreVary est indispensable : le serveur renvoie un en-tete Vary, et sans
  // cela une reponse pourtant presente en cache n'est jamais retrouvee. Le
  // symptome etait un ecran « Chargement... » qui ne finissait jamais, hors
  // ligne, alors que le fichier etait bien en reserve.
  const enReserve = url.pathname.startsWith('/assets/')
    || ['/logo.png', '/assmat.svg', '/manifest.json'].includes(url.pathname);
  if (enReserve) {
    e.respondWith(
      caches.match(req, { ignoreVary: true }).then((cache) => cache || fetch(req).then((rep) => {
        if (rep && rep.ok) {
          const copie = rep.clone();
          caches.open(CACHE).then((c) => c.put(req, copie).then(() => elaguer(c))).catch(() => {});
        }
        return rep;
      }).catch(() => caches.match(url.pathname, { ignoreVary: true }).then((r) => r || Response.error())))
    );
  }
});
