// Detecte les pages "orphelines" : fichiers .html presents dans public/
// mais absents du sitemap.xml (donc invisibles pour Google).
// GET /api/orphan-pages
// Reponse : { ok:true, orphans:[{name,path}], totalPublicHtml, totalSitemapUrls }
//
// Necessite la variable Vercel GITHUB_TOKEN (fine-grained PAT, permission
// "Contents: Read-only" sur le repo faitacrea/timat), car une fonction
// serverless Vercel n'a pas acces au dossier public/ au runtime : on liste
// son contenu via l'API GitHub.

import { requireAdmin } from "./_admin.js";

const REPO = "faitacrea/timat";
const EXCLUDE = new Set(["404.html"]);

export default async function handler(req, res) {
  try {
    if (!(await requireAdmin(req, res))) return;

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      res.status(200).json({ ok: false, error: "GITHUB_TOKEN manquant dans les variables Vercel." });
      return;
    }

    const sitemapRes = await fetch("https://timat.app/sitemap.xml");
    if (!sitemapRes.ok) {
      res.status(200).json({ ok: false, error: `sitemap.xml injoignable (${sitemapRes.status}).` });
      return;
    }
    const xml = await sitemapRes.text();
    const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1].trim());
    const sitemapFiles = new Set(
      locs
        .map((u) => {
          try {
            const p = new URL(u).pathname;
            return p === "/" || p === "" ? "index.html" : p.replace(/^\//, "");
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean)
    );

    const ghRes = await fetch(`https://api.github.com/repos/${REPO}/contents/public`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    });
    if (!ghRes.ok) {
      res.status(200).json({ ok: false, error: `GitHub a répondu ${ghRes.status} (token invalide ou repo inaccessible).` });
      return;
    }
    const files = await ghRes.json();
    const htmlFiles = (Array.isArray(files) ? files : []).filter(
      (f) => f.type === "file" && f.name.toLowerCase().endsWith(".html")
    );

    const orphans = htmlFiles
      .filter((f) => !sitemapFiles.has(f.name) && !EXCLUDE.has(f.name))
      .map((f) => ({ name: f.name, path: `public/${f.name}` }));

    res.status(200).json({
      ok: true,
      orphans,
      totalPublicHtml: htmlFiles.length,
      totalSitemapUrls: sitemapFiles.size,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Erreur inconnue." });
  }
}
