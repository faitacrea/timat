#!/usr/bin/env node
/**
 * TiMat — Generation des pages de blog statiques depuis Sanity.
 *
 * Lance au moment du build Vercel, AVANT vite build, pour que les fichiers
 * ecrits dans public/ soient copies dans dist/.
 *
 *   "build": "node scripts/generate-blog.mjs && vite build"
 *
 * Le dataset Sanity etant public, aucune cle n'est necessaire.
 * Si un article n'apparait pas : verifier que statut = "publie" dans le Studio.
 */

import { mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------------------------

const PROJECT_ID = "740dzcep";
const DATASET = "production";
const API_VERSION = "2024-01-01";
const SITE = "https://www.timat.app";

// Structure des fichiers generes.
//   false -> public/blog/<slug>/index.html   URL : /blog/<slug>
//   true  -> public/blog-<slug>.html         URL : /blog-<slug>.html
// Passer a true UNIQUEMENT si Vercel renvoie des 404 sur /blog/...
const FLAT = false;

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const BLOG_DIR = path.join(PUBLIC_DIR, "blog");

// ---------------------------------------------------------------------------
// PALETTE ET TYPOGRAPHIE — alignees sur la landing TiMat
// ---------------------------------------------------------------------------

const T = {
  cream: "#FDFBF8",
  white: "#FFFFFF",
  ink: "#2E4A5A",
  mauve: "#6B4F5A",
  light: "#A8909A",
  border: "#EAE0E8",
  terracotta: "#E49178",
  terracottaPale: "#FDF6F4",
  terracottaLine: "#F3CEC2",
  sage: "#90A093",
  sagePale: "#F6F7F6",
  sageLine: "#CDD4CE",
  red: "#C84B31",
  redPale: "#FBF1EF",
};

// ---------------------------------------------------------------------------
// UTILITAIRES
// ---------------------------------------------------------------------------

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const escAttr = esc;

/** Convertit une reference d'asset Sanity en URL CDN. */
function imageUrl(source, width) {
  const ref = source?.asset?._ref || source?._ref;
  if (!ref) return null;
  // format : image-<id>-<w>x<h>-<ext>
  const m = /^image-([a-f0-9]+)-(\d+)x(\d+)-(\w+)$/.exec(ref);
  if (!m) return null;
  const [, id, w, h, ext] = m;
  const base = `https://cdn.sanity.io/images/${PROJECT_ID}/${DATASET}/${id}-${w}x${h}.${ext}`;
  return width ? `${base}?w=${width}&auto=format&fit=max` : base;
}

function imageDims(source) {
  const ref = source?.asset?._ref || source?._ref;
  const m = ref && /^image-[a-f0-9]+-(\d+)x(\d+)-\w+$/.exec(ref);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : null;
}

const dateFr = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const isoDay = (iso) => (iso ? String(iso).slice(0, 10) : "");

/** Chemin fichier + URL publique d'un article, selon le mode FLAT. */
function articleTarget(slug) {
  if (FLAT) {
    return {
      file: path.join(PUBLIC_DIR, `blog-${slug}.html`),
      url: `/blog-${slug}.html`,
    };
  }
  return {
    file: path.join(BLOG_DIR, slug, "index.html"),
    url: `/blog/${slug}`,
  };
}

function indexTarget() {
  if (FLAT) {
    return { file: path.join(PUBLIC_DIR, "blog.html"), url: "/blog.html" };
  }
  return { file: path.join(BLOG_DIR, "index.html"), url: "/blog" };
}

/** Estimation du temps de lecture, a partir du texte brut du corps. */
function readingMinutes(corps) {
  const words = plainText(corps).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Texte brut d'un tableau Portable Text (pour JSON-LD et temps de lecture). */
function plainText(blocks) {
  if (!Array.isArray(blocks)) return "";
  return blocks
    .map((b) => {
      if (b._type === "block") return (b.children || []).map((c) => c.text || "").join("");
      if (b._type === "encadre") return b.texte || "";
      return "";
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// RENDU PORTABLE TEXT -> HTML
// ---------------------------------------------------------------------------

/** Rend les enfants d'un bloc texte en appliquant marks et annotations. */
function renderSpans(block) {
  const defs = new Map((block.markDefs || []).map((d) => [d._key, d]));
  return (block.children || [])
    .map((child) => {
      let html = esc(child.text || "");
      const marks = child.marks || [];
      // Les annotations (liens) enveloppent en dernier pour rester exterieures.
      const decorators = marks.filter((m) => !defs.has(m));
      const annotations = marks.filter((m) => defs.has(m));
      for (const d of decorators) {
        if (d === "strong") html = `<strong>${html}</strong>`;
        else if (d === "em") html = `<em>${html}</em>`;
        else if (d === "underline") html = `<u>${html}</u>`;
        else if (d === "code") html = `<code>${html}</code>`;
      }
      for (const a of annotations) {
        const def = defs.get(a);
        if (def?._type === "lien" && def.href) {
          const externe = !String(def.href).startsWith("/") && !String(def.href).includes("timat.app");
          const attrs = def.nouvelOnglet || externe ? ' target="_blank" rel="noopener noreferrer"' : "";
          html = `<a href="${escAttr(def.href)}"${attrs}>${html}</a>`;
        }
      }
      return html;
    })
    .join("");
}

const ENCADRE_STYLES = {
  info: { bg: T.sagePale, line: T.sageLine, label: "Information", ic: "•" },
  attention: { bg: T.redPale, line: "#EBB9AA", label: "À noter", ic: "!" },
  astuce: { bg: T.terracottaPale, line: T.terracottaLine, label: "Bon à savoir", ic: "+" },
};

/** Convertit un tableau Portable Text en HTML. Gere les listes imbriquees a plat. */
function renderPortableText(blocks) {
  if (!Array.isArray(blocks)) return "";
  const out = [];
  let listType = null; // "bullet" | "number" | null

  const closeList = () => {
    if (listType) {
      out.push(listType === "bullet" ? "</ul>" : "</ol>");
      listType = null;
    }
  };

  for (const block of blocks) {
    if (block._type === "block") {
      if (block.listItem) {
        const wanted = block.listItem === "number" ? "number" : "bullet";
        if (listType !== wanted) {
          closeList();
          out.push(wanted === "bullet" ? "<ul>" : "<ol>");
          listType = wanted;
        }
        out.push(`<li>${renderSpans(block)}</li>`);
        continue;
      }
      closeList();
      const inner = renderSpans(block);
      if (!inner.trim()) continue;
      switch (block.style) {
        case "h2":
          out.push(`<h2 id="${slugifyHeading(block)}">${inner}</h2>`);
          break;
        case "h3":
          out.push(`<h3>${inner}</h3>`);
          break;
        case "blockquote":
          out.push(`<blockquote>${inner}</blockquote>`);
          break;
        default:
          out.push(`<p>${inner}</p>`);
      }
      continue;
    }

    closeList();

    if (block._type === "image") {
      const src = imageUrl(block, 1400);
      if (!src) continue;
      const dims = imageDims(block);
      const sizeAttrs = dims ? ` width="${dims.w}" height="${dims.h}"` : "";
      out.push(
        `<figure><img src="${escAttr(src)}" alt="${escAttr(block.alt || "")}" loading="lazy"${sizeAttrs}>` +
          (block.legende ? `<figcaption>${esc(block.legende)}</figcaption>` : "") +
          `</figure>`
      );
      continue;
    }

    if (block._type === "encadre") {
      const s = ENCADRE_STYLES[block.ton] || ENCADRE_STYLES.info;
      out.push(
        `<aside class="encadre" style="background:${s.bg};border-color:${s.line}">` +
          `<span class="encadre-label">${esc(s.label)}</span>` +
          `<p>${esc(block.texte || "")}</p>` +
          `</aside>`
      );
      continue;
    }
  }

  closeList();
  return out.join("\n");
}

/** Identifiant d'ancre stable pour un titre H2 (sommaire). */
function slugifyHeading(block) {
  const text = (block.children || []).map((c) => c.text || "").join("");
  return (
    "s-" +
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50)
  );
}

/** Extrait les H2 pour construire le sommaire. */
function extractHeadings(blocks) {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .filter((b) => b._type === "block" && b.style === "h2")
    .map((b) => ({
      id: slugifyHeading(b),
      texte: (b.children || []).map((c) => c.text || "").join(""),
    }))
    .filter((h) => h.texte.trim());
}

// ---------------------------------------------------------------------------
// GABARIT HTML
// ---------------------------------------------------------------------------

const CSS = `
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:${T.cream};color:${T.ink};
  font-family:'Plus Jakarta Sans','DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  font-size:17px;line-height:1.7;-webkit-font-smoothing:antialiased}
a{color:${T.ink};text-decoration:underline;text-decoration-color:${T.terracottaLine};text-underline-offset:3px}
a:hover{text-decoration-color:${T.terracotta}}
img{max-width:100%;height:auto}
.wrap{max-width:720px;margin:0 auto;padding:0 22px}
.topbar{border-bottom:1px solid ${T.border};background:${T.white};position:sticky;top:0;z-index:10}
.topbar .wrap{max-width:1100px;display:flex;align-items:center;justify-content:space-between;height:62px}
.brand{display:flex;align-items:center;text-decoration:none;color:${T.ink};line-height:0}
.brand img{height:30px;width:auto;display:block}
.brand .wm{font-family:'Fraunces',Georgia,serif;font-weight:800;font-size:21px;letter-spacing:-.4px;line-height:1}
.brand .wm span{color:${T.terracotta}}
.topnav{display:flex;gap:18px;align-items:center;font-size:14px;font-weight:600}
.topnav a{text-decoration:none;color:${T.mauve}}
.topnav a:hover{color:${T.ink}}
.cta-top{background:${T.terracotta};color:#fff!important;padding:9px 16px;border-radius:10px;font-weight:700}
.crumbs{font-size:13px;color:${T.light};padding:26px 0 0}
.crumbs a{color:${T.light};text-decoration:none}
.crumbs a:hover{color:${T.mauve};text-decoration:underline}
.eyebrow{display:inline-block;font-size:11.5px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;
  color:${T.terracotta};background:${T.terracottaPale};border:1px solid ${T.terracottaLine};
  padding:5px 12px;border-radius:20px;margin:20px 0 14px;text-decoration:none}
h1{font-family:'Fraunces',Georgia,serif;font-size:clamp(29px,5.4vw,44px);line-height:1.12;
  font-weight:800;letter-spacing:-.8px;margin:0 0 16px}
.chapo{font-size:19px;line-height:1.6;color:${T.mauve};margin:0 0 22px}
.reponse{background:${T.white};border:1px solid ${T.border};border-left:5px solid ${T.terracotta};
  border-radius:4px 14px 14px 4px;padding:18px 22px;margin:0 0 24px;
  box-shadow:0 6px 20px rgba(46,74,90,.07)}
.reponse h2{font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;letter-spacing:1.2px;
  text-transform:uppercase;color:${T.terracotta};margin:0 0 8px;font-weight:800;border:0;padding:0}
.reponse p{margin:0;font-size:17.5px;line-height:1.6;color:${T.ink};font-weight:600}
.meta{display:flex;flex-wrap:wrap;gap:14px;align-items:center;font-size:13px;color:${T.light};
  border-top:1px solid ${T.border};border-bottom:1px solid ${T.border};padding:14px 0;margin-bottom:30px}
.maj{display:inline-flex;align-items:center;gap:7px;background:${T.sagePale};border:1px solid ${T.sageLine};
  color:#5F7264;font-weight:700;padding:4px 11px;border-radius:20px;font-size:12px}
.cover{border-radius:16px;overflow:hidden;border:1px solid ${T.border};margin-bottom:32px}
.cover img{display:block;width:100%}
.sommaire{background:${T.white};border:1px solid ${T.border};border-radius:14px;padding:20px 22px;margin:0 0 34px}
.sommaire h2{font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;letter-spacing:1.2px;text-transform:uppercase;
  color:${T.light};margin:0 0 12px;font-weight:800;border:0;padding:0}
.sommaire ol{margin:0;padding-left:20px;font-size:15px}
.sommaire li{margin:7px 0}
.sommaire a{text-decoration:none;color:${T.mauve};font-weight:600}
.sommaire a:hover{color:${T.terracotta}}
article h2{font-family:'Fraunces',Georgia,serif;font-size:27px;line-height:1.25;font-weight:800;
  letter-spacing:-.4px;margin:42px 0 14px;padding-top:12px;border-top:2px solid ${T.border}}
article h3{font-size:19px;font-weight:800;margin:30px 0 10px;color:${T.ink}}
article p{margin:0 0 18px}
article ul,article ol{margin:0 0 20px;padding-left:24px}
article li{margin:8px 0}
article blockquote{margin:26px 0;padding:4px 0 4px 20px;border-left:3px solid ${T.terracotta};
  font-family:'Fraunces',Georgia,serif;font-size:20px;line-height:1.5;color:${T.mauve}}
article figure{margin:28px 0}
article figure img{border-radius:14px;border:1px solid ${T.border};display:block}
article figcaption{font-size:13px;color:${T.light};margin-top:9px;text-align:center}
.encadre{border:1px solid;border-radius:14px;padding:17px 19px;margin:26px 0}
.encadre-label{display:block;font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;
  color:${T.mauve};margin-bottom:7px}
.encadre p{margin:0;font-size:15.5px;line-height:1.65}
.faq{margin:46px 0 0}
.faq h2{margin-top:0}
.faq details{border:1px solid ${T.border};border-radius:12px;background:${T.white};margin-bottom:10px;overflow:hidden}
.faq summary{padding:15px 18px;font-weight:700;cursor:pointer;font-size:16px;list-style:none}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";float:right;color:${T.terracotta};font-weight:800;font-size:19px;line-height:1}
.faq details[open] summary::after{content:"−"}
.faq .rep{padding:0 18px 16px;font-size:15.5px;color:${T.mauve};margin:0}
.sources{margin:42px 0 0;background:${T.white};border:1px solid ${T.border};border-radius:14px;padding:20px 22px}
.sources h2{font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;letter-spacing:1.2px;text-transform:uppercase;
  color:${T.light};margin:0 0 12px;font-weight:800;border:0;padding:0}
.sources ul{margin:0;padding-left:20px;font-size:15px}
.sources li{margin:7px 0}
.lire{margin:42px 0 0;background:${T.white};border:1px solid ${T.border};border-radius:14px;padding:20px 22px}
.lire h2{font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;letter-spacing:1.2px;text-transform:uppercase;
  color:${T.light};margin:0 0 14px;font-weight:800;border:0;padding:0}
.lire ul{margin:0;padding:0;list-style:none}
.lire li{margin:0;padding:0;border-top:1px solid ${T.border}}
.lire li:first-child{border-top:0}
.lire a{display:block;padding:14px 0;text-decoration:none;color:${T.ink}}
.lire .cat{display:inline-block;font-size:10px;letter-spacing:.6px;text-transform:uppercase;
  font-weight:800;padding:3px 9px;border-radius:99px;margin:0 0 7px}
.lire .t{display:flex;justify-content:space-between;gap:14px;font-size:15px;font-weight:700;
  line-height:1.35;letter-spacing:-.2px}
.lire .arw{flex:0 0 auto;color:${T.terracotta};font-size:17px;font-weight:800}
.lire a:hover .t{text-decoration:underline}
.lire .d{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
  font-size:13px;color:${T.mauve};line-height:1.5;margin-top:4px}
.cta{margin:48px 0;background:${T.ink};border-radius:18px;padding:32px 28px;color:#fff;text-align:center}
.cta h2{font-family:'Fraunces',Georgia,serif;font-size:25px;margin:0 0 10px;color:#fff;border:0;padding:0;letter-spacing:-.4px}
.cta p{color:rgba(255,255,255,.85);font-size:15.5px;margin:0 0 20px}
.cta a{display:inline-block;background:${T.terracotta};color:#fff;text-decoration:none;font-weight:700;
  padding:13px 26px;border-radius:12px;font-size:15px}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px;margin:26px 0 50px}
.card{background:${T.white};border:1px solid ${T.border};border-radius:16px;overflow:hidden;display:flex;flex-direction:column}
.card img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}
.card-body{padding:18px 19px;display:flex;flex-direction:column;flex:1}
.card .cat{font-size:11px;font-weight:800;letter-spacing:1.1px;text-transform:uppercase;color:${T.terracotta};margin-bottom:8px}
.card h2{font-family:'Fraunces',Georgia,serif;font-size:19px;line-height:1.3;margin:0 0 9px;border:0;padding:0;letter-spacing:-.2px}
.card h2 a{text-decoration:none}
.card p{font-size:14.5px;color:${T.mauve};margin:0 0 14px;flex:1}
.card .date{font-size:12px;color:${T.light}}
.lead{font-size:19px;color:${T.mauve};max-width:620px;margin:0 0 8px}
footer{border-top:1px solid ${T.border};margin-top:60px;padding:26px 0 40px;font-size:13.5px;color:${T.light}}
footer .wrap{max-width:1100px;display:flex;flex-wrap:wrap;gap:14px;justify-content:space-between}
footer a{color:${T.mauve};text-decoration:none}
:focus-visible{outline:3px solid ${T.terracotta};outline-offset:2px;border-radius:4px}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{animation:none!important;transition:none!important}}
@media(max-width:640px){
  body{font-size:16.5px}
  .topnav a:not(.cta-top){display:none}
  article h2{font-size:23px}
}
`;

function layout({ title, description, canonical, ogImage, jsonLd, body, wide }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${escAttr(description)}">
<link rel="canonical" href="${escAttr(canonical)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="TiMat">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${escAttr(title)}">
<meta property="og:description" content="${escAttr(description)}">
<meta property="og:url" content="${escAttr(canonical)}">
${ogImage ? `<meta property="og:image" content="${escAttr(ogImage)}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assmat.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,800&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>${CSS}${wide ? "\n.wrap{max-width:1100px}" : ""}</style>
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ""}
</head>
<body>
<header class="topbar">
  <div class="wrap">
    <a class="brand" href="/" aria-label="TiMat"><img src="/logo.png" alt="TiMat" width="95" height="30" onerror="this.outerHTML='<span class=&quot;wm&quot;>Ti<span>Mat</span></span>'"></a>
    <nav class="topnav">
      <a href="${indexTarget().url}">Blog</a>
      <a href="/boutique.html">Boutique</a>
      <a class="cta-top" href="/?connexion=1">Essayer gratuitement</a>
    </nav>
  </div>
</header>
${body}
<footer>
  <div class="wrap">
    <span>© ${new Date().getFullYear()} TiMat — L'application des assistantes maternelles et des parents employeurs.</span>
    <span><a href="/">Accueil</a> · <a href="${indexTarget().url}">Blog</a> · <a href="/parents">Espace parent employeur</a> · <a href="/confidentialite.html">Confidentialité</a></span>
  </div>
</footer>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// PAGES
// ---------------------------------------------------------------------------

// Le format « situation pratique » : une fiche courte qui repond a UNE question
// concrete, la ou les guides traitent un sujet en entier. Faute de champ dedie
// dans le schema Sanity, la rubrique porte le format — elle reste selectionnable
// dans le Studio sans redeploiement de schema.
const SLUG_SITUATION = "situation-pratique";
const estSituation = (a) => a?.categorie?.slug === SLUG_SITUATION;

// Une teinte par categorie, tiree de la palette TiMat. Les couples fond/texte
// sont choisis pour rester lisibles ; toute categorie inconnue retombe sur le gris.
const PASTILLES = {
  "Contrat et paie": ["#F0E2D6", "#8A5240"],
  "Démarches et Pajemploi": ["#DFEAF0", "#2E4859"],
  "Le quotidien de l'accueil": ["#EDE6F0", "#5C4A64"],
  "Devenir assistante maternelle": ["#E4EDE6", "#40614A"],
  "Choisir son mode de garde": ["#E6EFEE", "#2E5C57"],
  "Situation pratique": ["#F4EAD5", "#7A5E28"],
};
function pastilleStyle(titre) {
  const [fond, texte] = PASTILLES[titre] || ["#EDEAE6", "#6E6669"];
  return `background:${fond};color:${texte}`;
}

function pageArticle(a, tous = []) {
  // Maillage interne : jusqu'a 3 autres articles, meme categorie d'abord.
  const autres = tous.filter((x) => x.slug && x.slug !== a.slug);
  const memeCat = autres.filter((x) => x.categorie?.slug && x.categorie?.slug === a.categorie?.slug);
  const reste = autres.filter((x) => !memeCat.includes(x));
  // Deux articles proches, puis un venu d'ailleurs : la pastille de categorie
  // n'apprend rien si les trois suggestions portent le meme libelle, et le
  // lecteur ne decouvre jamais les autres rubriques du blog.
  const lies = [...memeCat.slice(0, 2), ...reste, ...memeCat.slice(2)].slice(0, 3);
  // Une entree de source vide (ajoutee par megarde dans le Studio) ne doit pas
  // afficher un encadre "Sources officielles" vide : on filtre avant de decider.
  const sourcesValides = (Array.isArray(a.sourcesOfficielles) ? a.sourcesOfficielles : [])
    .filter((s) => s && s.libelle);
  const url = SITE + articleTarget(a.slug).url;
  const title = a.seoTitre || a.titre;
  const description = a.seoDescription || a.chapo || "";
  const cover = a.imageCouverture ? imageUrl(a.imageCouverture, 1200) : null;
  const situation = estSituation(a);
  const headings = extractHeadings(a.corps);
  const minutes = readingMinutes(a.corps);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: a.titre,
      description,
      inLanguage: "fr-FR",
      datePublished: a.datePublication,
      dateModified: a.dateMiseAJour || a.datePublication,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      author: { "@type": "Organization", name: "TiMat", url: SITE },
      publisher: {
        "@type": "Organization",
        name: "TiMat",
        url: SITE,
        logo: { "@type": "ImageObject", url: SITE + "/logo.png" },
      },
      ...(cover ? { image: [cover] } : {}),
      ...(a.categorie?.titre ? { articleSection: a.categorie.titre } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: SITE },
        { "@type": "ListItem", position: 2, name: "Blog", item: SITE + indexTarget().url },
        { "@type": "ListItem", position: 3, name: a.titre, item: url },
      ],
    },
  ];

  if (Array.isArray(a.faq) && a.faq.length) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: a.faq
        .filter((q) => q.question && q.reponse)
        .map((q) => ({
          "@type": "Question",
          name: q.question,
          acceptedAnswer: { "@type": "Answer", text: q.reponse },
        })),
    });
  }

  const body = `
<main class="wrap">
  <nav class="crumbs" aria-label="Fil d'Ariane">
    <a href="/">Accueil</a> › <a href="${indexTarget().url}">Blog</a> › <span>${esc(a.titre)}</span>
  </nav>
  ${a.categorie?.titre ? `<span class="eyebrow">${esc(a.categorie.titre)}</span>` : ""}
  <h1>${esc(a.titre)}</h1>
  ${
    a.chapo
      ? situation
        ? `<section class="reponse"><h2>Réponse courte</h2><p>${esc(a.chapo)}</p></section>`
        : `<p class="chapo">${esc(a.chapo)}</p>`
      : ""
  }
  <div class="meta">
    ${
      a.dateMiseAJour
        ? `<span class="maj">Mis à jour le ${esc(dateFr(a.dateMiseAJour))}</span>`
        : `<span>Publié le ${esc(dateFr(a.datePublication))}</span>`
    }
    <span>${minutes} min de lecture</span>
  </div>
  ${
    cover
      ? `<div class="cover"><img src="${escAttr(cover)}" alt="${escAttr(
          a.imageCouverture?.alt || a.titre
        )}"></div>`
      : ""
  }
  ${
    !situation && headings.length >= 3
      ? `<nav class="sommaire" aria-label="Sommaire"><h2>Au sommaire</h2><ol>${headings
          .map((h) => `<li><a href="#${h.id}">${esc(h.texte)}</a></li>`)
          .join("")}</ol></nav>`
      : ""
  }
  <article>
    ${renderPortableText(a.corps)}
  </article>
  ${
    Array.isArray(a.faq) && a.faq.length
      ? `<section class="faq"><h2>Questions fréquentes</h2>${a.faq
          .filter((q) => q.question && q.reponse)
          .map(
            (q) =>
              `<details><summary>${esc(q.question)}</summary><p class="rep">${esc(q.reponse)}</p></details>`
          )
          .join("")}</section>`
      : ""
  }
  ${
    sourcesValides.length
      ? `<section class="sources"><h2>Sources officielles</h2><ul>${sourcesValides
          .map(
            (s) =>
              `<li>${
                s.url
                  ? `<a href="${escAttr(s.url)}" target="_blank" rel="noopener noreferrer">${esc(
                      s.libelle
                    )}</a>`
                  : esc(s.libelle)
              }</li>`
          )
          .join("")}</ul></section>`
      : ""
  }
  ${
    lies.length
      ? `<section class="lire"><h2>À lire aussi</h2><ul>${lies
          .map(
            (x) =>
              `<li><a href="${articleTarget(x.slug).url}">` +
              (x.categorie?.titre
                ? `<span class="cat" style="${pastilleStyle(x.categorie.titre)}">${esc(x.categorie.titre)}</span>`
                : "") +
              `<span class="t">${esc(x.titre)}<span class="arw">&rarr;</span></span>` +
              (x.chapo ? `<span class="d">${esc(x.chapo)}</span>` : "") +
              `</a></li>`
          )
          .join("")}</ul></section>`
      : ""
  }
  <section class="cta">
    <h2>Gérez tout ça sans y penser</h2>
    <p>Contrat, mensualisation, déclarations Pajemploi, journal quotidien partagé avec les parents : TiMat s'occupe du calcul et de la paperasse.</p>
    <a href="/?connexion=1">Essayer gratuitement</a>
  </section>
</main>`;

  return layout({
    title: title.includes("TiMat") ? title : `${title} | TiMat`,
    description,
    canonical: url,
    ogImage: cover,
    jsonLd,
    body,
  });
}

function pageIndex(articles) {
  const url = SITE + indexTarget().url;
  const body = `
<main class="wrap">
  <nav class="crumbs" aria-label="Fil d'Ariane"><a href="/">Accueil</a> › <span>Blog</span></nav>
  <span class="eyebrow">Le blog TiMat</span>
  <h1>Comprendre l'accueil chez une assistante maternelle</h1>
  <p class="lead">Contrat, salaire, Pajemploi, agrément, quotidien de l'accueil : des réponses claires et sourcées, pour les assistantes maternelles agréées comme pour les parents employeurs.</p>
  <div class="cards">
    ${
      articles.length
        ? articles
            .map((a) => {
              const img = a.imageCouverture ? imageUrl(a.imageCouverture, 700) : null;
              const href = articleTarget(a.slug).url;
              return `<article class="card">
        ${
          img
            ? `<a href="${escAttr(href)}" aria-hidden="true" tabindex="-1"><img src="${escAttr(
                img
              )}" alt="${escAttr(a.imageCouverture?.alt || "")}" loading="lazy"></a>`
            : ""
        }
        <div class="card-body">
          ${a.categorie?.titre ? `<div class="cat">${esc(a.categorie.titre)}</div>` : ""}
          <h2><a href="${escAttr(href)}">${esc(a.titre)}</a></h2>
          <p>${esc(a.chapo || "")}</p>
          <div class="date">${esc(dateFr(a.dateMiseAJour || a.datePublication))}</div>
        </div>
      </article>`;
            })
            .join("\n")
        : `<p class="lead">Les premiers articles arrivent très bientôt.</p>`
    }
  </div>
</main>`;

  return layout({
    title: "Blog assistante maternelle : salaire et contrat | TiMat",
    description:
      "Contrat de travail, mensualisation, indemnités, Pajemploi, agrément : des réponses claires et sourcées pour assistantes maternelles agréées et parents employeurs.",
    canonical: url,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "Blog TiMat",
      url,
      inLanguage: "fr-FR",
      publisher: { "@type": "Organization", name: "TiMat", url: SITE },
    },
    body,
    wide: true,
  });
}

function sitemap(articles) {
  const entries = [
    { loc: SITE + indexTarget().url, lastmod: isoDay(new Date().toISOString()), prio: "0.7" },
    ...articles.map((a) => ({
      loc: SITE + articleTarget(a.slug).url,
      lastmod: isoDay(a.dateMiseAJour || a.datePublication),
      prio: "0.8",
    })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) =>
      `  <url><loc>${e.loc}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}<changefreq>monthly</changefreq><priority>${e.prio}</priority></url>`
  )
  .join("\n")}
</urlset>`;
}

// ---------------------------------------------------------------------------
// EXECUTION
// ---------------------------------------------------------------------------

const QUERY = `*[_type == "article" && statut == "publie" && noIndex != true && !(_id in path("drafts.**"))] | order(coalesce(dateMiseAJour, datePublication) desc){
  titre,
  "slug": slug.current,
  chapo,
  datePublication,
  dateMiseAJour,
  imageCouverture,
  corps,
  faq,
  sourcesOfficielles,
  seoTitre,
  seoDescription,
  categorie->{titre, "slug": slug.current, audience}
}`;

async function fetchArticles() {
  const url =
    `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}` +
    `?query=${encodeURIComponent(QUERY)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity a répondu ${res.status} ${res.statusText}`);
  const json = await res.json();
  return Array.isArray(json.result) ? json.result : [];
}

async function main() {
  if (!existsSync(PUBLIC_DIR)) {
    throw new Error(`Dossier introuvable : ${PUBLIC_DIR}. Lancer le script depuis la racine du projet.`);
  }

  let articles = [];
  try {
    articles = await fetchArticles();
  } catch (err) {
    // Ne jamais casser un deploiement pour un blog indisponible.
    console.warn(`[blog] Récupération Sanity impossible (${err.message}). Génération ignorée.`);
    return;
  }

  const valides = articles.filter((a) => a.slug && a.titre && Array.isArray(a.corps));
  const ignores = articles.length - valides.length;
  if (ignores > 0) console.warn(`[blog] ${ignores} article(s) ignoré(s) : slug, titre ou corps manquant.`);

  // Repartir d'un dossier propre pour supprimer les articles depubliés.
  if (!FLAT && existsSync(BLOG_DIR)) await rm(BLOG_DIR, { recursive: true, force: true });
  await mkdir(FLAT ? PUBLIC_DIR : BLOG_DIR, { recursive: true });

  for (const a of valides) {
    const { file } = articleTarget(a.slug);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, pageArticle(a, valides), "utf8");
  }

  const idx = indexTarget();
  await mkdir(path.dirname(idx.file), { recursive: true });
  await writeFile(idx.file, pageIndex(valides), "utf8");

  await writeFile(path.join(PUBLIC_DIR, "sitemap-blog.xml"), sitemap(valides), "utf8");

  console.log(
    `[blog] ${valides.length} article(s) généré(s) + index + sitemap-blog.xml (mode ${FLAT ? "plat" : "dossiers"}).`
  );
}

main().catch((err) => {
  console.error("[blog] Échec :", err);
  process.exit(1);
});
