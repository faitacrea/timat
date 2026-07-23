// api/seo-audit.js
// Audit SEO des PROPRES pages du site (celles listees dans sitemap.xml).
// Verifie : titre, meta description, canonical, H1/H2, Open Graph, statut HTTP, contenu lisible.
// Enregistre un resume de chaque audit dans Supabase (table seo_audit_history) pour l'historique.

import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "./_admin.js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function fetchWithTimeout(url, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { redirect: "follow", signal: ctrl.signal, headers: { "User-Agent": "TiMat-SEO-Audit" } })
    .finally(() => clearTimeout(t));
}

export default async function handler(req, res) {
  try {
    if (!(await requireAdmin(req, res))) return;

    const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
    const host = req.headers["host"] || "timat.app";
    const base = proto + "://" + host;

    // 1) Lire le sitemap pour connaitre les URLs a auditer
    let urls = [];
    try {
      const sm = await fetchWithTimeout(base + "/sitemap.xml", 8000);
      if (sm.ok) {
        const xml = await sm.text();
        urls = (xml.match(/<loc>([^<]+)<\/loc>/g) || []).map(function (m) {
          return m.replace(/<\/?loc>/g, "").trim();
        });
      }
    } catch (e) {}
    if (!urls.length) urls = [base + "/"]; // au minimum la home
    urls = urls.slice(0, 25); // borne de securite

    // 2) Auditer chaque URL en parallele
    const results = await Promise.all(urls.map(async function (url) {
      const r = { url: url, status: 0, checks: [], error: null };
      try {
        const resp = await fetchWithTimeout(url, 9000);
        r.status = resp.status;
        if (resp.status >= 400) { r.error = "Page inaccessible (" + resp.status + ")"; return r; }
        const html = await resp.text();

        const pick = function (re) { const m = html.match(re); return m ? m[1].trim() : null; };
        const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
        let desc = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i);
        if (!desc) desc = pick(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["']/i);
        const canonical = pick(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
        const ogTitle = /property=["']og:title["']/i.test(html);
        const ogDesc = /property=["']og:description["']/i.test(html);
        const ogImg = /property=["']og:image["']/i.test(html);
        const h1count = (html.match(/<h1[\s>]/gi) || []).length;
        const h2count = (html.match(/<h2[\s>]/gi) || []).length;
        const textLen = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim().length;

        const push = function (label, state, detail) { r.checks.push({ label: label, state: state, detail: detail }); };

        // Titre
        if (!title) push("Titre", "fail", "Aucune balise <title>");
        else if (title.length < 30) push("Titre", "warn", title.length + " caracteres, un peu court (vise 30-65)");
        else if (title.length > 65) push("Titre", "warn", title.length + " caracteres, un peu long (vise 30-65)");
        else push("Titre", "ok", title.length + " caracteres");

        // Meta description
        if (!desc) push("Meta description", "fail", "Absente");
        else if (desc.length < 120) push("Meta description", "warn", desc.length + " caracteres, un peu courte (vise 120-160)");
        else if (desc.length > 170) push("Meta description", "warn", desc.length + " caracteres, un peu longue (vise 120-160)");
        else push("Meta description", "ok", desc.length + " caracteres");

        // Canonical
        push("Lien canonical", canonical ? "ok" : "warn", canonical ? "Present" : "Absent (recommande)");

        // H1
        if (h1count === 0) push("Titre H1", "fail", "Aucun H1 detecte");
        else if (h1count > 1) push("Titre H1", "warn", h1count + " balises H1 (ideal : 1 seule)");
        else push("Titre H1", "ok", "1 seul H1");

        // H2
        push("Sous-titres H2", h2count > 0 ? "ok" : "warn", h2count + " balise(s) H2");

        // Open Graph
        const ogAll = ogTitle && ogDesc && ogImg;
        push("Open Graph (partage reseaux)", ogAll ? "ok" : ((ogTitle || ogDesc || ogImg) ? "warn" : "fail"),
          ogAll ? "Titre, description et image presents" : "Incomplet (og:title / og:description / og:image)");

        // Contenu lisible par les robots / IA
        push("Contenu lisible", textLen > 600 ? "ok" : (textLen > 200 ? "warn" : "fail"),
          Math.round(textLen) + " caracteres de texte" + (textLen <= 200 ? " (page quasi vide pour les robots)" : ""));

      } catch (e) {
        r.error = (e && e.name === "AbortError") ? "Delai depasse" : "Erreur de chargement";
      }
      return r;
    }));

    const dead = results.filter(function (x) { return x.status >= 400 || x.error; }).length;
    const withWarn = results.filter(function (x) { return x.checks.some(function (c) { return c.state === "warn"; }); }).length;
    const withFail = results.filter(function (x) { return x.checks.some(function (c) { return c.state === "fail"; }); }).length;

    try {
      await supabase.from("seo_audit_history").insert({
        generated_at: new Date().toISOString(),
        total: results.length,
        dead: dead,
        with_warn: withWarn,
        with_fail: withFail,
        base: base
      });
    } catch (e) {
      // On ne fait pas echouer l'audit si la sauvegarde de l'historique rate.
    }

    res.status(200).json({
      base: base,
      generatedAt: new Date().toISOString(),
      total: results.length,
      dead: dead,
      withWarn: withWarn,
      withFail: withFail,
      results: results
    });
  } catch (e) {
    res.status(500).json({ error: (e && e.message) || "Erreur pendant l'audit" });
  }
}
