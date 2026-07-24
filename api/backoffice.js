// api/backoffice.js
// Regroupe TOUS les endpoints du backoffice en UNE SEULE fonction serverless.
// Raison : le plan Vercel Hobby limite a 12 fonctions par deploiement.
// Avant : 5 fichiers (seo-audit, seo-audit-history, orphan-pages, stripe-mrr,
// search-console). Maintenant : 1 seul, donc 4 slots liberes.
//
// Appel : /api/backoffice?action=<nom>
//   seo-audit | seo-audit-history | orphan-pages | stripe-mrr | search-console
//
// La verification administrateur est faite UNE FOIS, avant toute action.

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import Stripe from "stripe";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const REPO = "faitacrea/timat";
const EXCLUDE_HTML = new Set(["404.html"]);

/* ------------------------------------------------------------------ */
/* Outils communs                                                      */
/* ------------------------------------------------------------------ */

function fetchWithTimeout(url, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { redirect: "follow", signal: ctrl.signal, headers: { "User-Agent": "TiMat-SEO-Audit" } })
    .finally(() => clearTimeout(t));
}

function b64url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

// Verification serveur que l appelant est bien l administrateur.
// Cacher un bouton dans l interface ne protege rien : c est cette
// verification qui protege reellement les donnees.
async function requireAdmin(req, res) {
  try {
    const header = req.headers["authorization"] || req.headers["Authorization"] || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) {
      res.status(401).json({ ok: false, error: "Authentification requise." });
      return null;
    }
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data || !data.user) {
      res.status(401).json({ ok: false, error: "Session invalide ou expiree." });
      return null;
    }
    const { data: profile, error: pErr } = await supabase
      .from("profiles").select("is_admin").eq("id", data.user.id).maybeSingle();
    if (pErr || !profile || profile.is_admin !== true) {
      res.status(403).json({ ok: false, error: "Acces reserve a l administrateur." });
      return null;
    }
    return data.user;
  } catch (e) {
    res.status(500).json({ ok: false, error: "Erreur de verification des droits." });
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Action : audit SEO des pages du site                                */
/* ------------------------------------------------------------------ */

async function actionSeoAudit(req, res) {
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = req.headers["host"] || "timat.app";
  const base = proto + "://" + host;

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
  if (!urls.length) urls = [base + "/"];
  urls = urls.slice(0, 25);

  const results = await Promise.all(urls.map(async function (url) {
    const r = { url: url, status: 0, checks: [], error: null };
    try {
      const resp = await fetchWithTimeout(url, 9000);
      r.status = resp.status;
      if (resp.status >= 400) { r.error = "Page inaccessible (" + resp.status + ")"; return r; }
      const html = await resp.text();

      const pick = function (re) { const m = html.match(re); return m ? m[1].trim() : null; };
      const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
      // On capture le guillemet ouvrant puis on s'arrete sur LE MEME guillemet
      // (\1). Sans cela, une apostrophe dans le texte coupait la valeur en deux.
      const pick2 = function (re) { const m = html.match(re); return m ? m[2].trim() : null; };
      let desc = pick2(/<meta[^>]+name=["']description["'][^>]*?content=(["'])([\s\S]*?)\1/i);
      if (!desc) desc = pick2(/<meta[^>]+content=(["'])([\s\S]*?)\1[^>]*?name=["']description["']/i);
      const canonical = pick2(/<link[^>]+rel=["']canonical["'][^>]*?href=(["'])([\s\S]*?)\1/i);
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

      if (!title) push("Titre", "fail", "Aucune balise <title>");
      else if (title.length < 30) push("Titre", "warn", title.length + " caracteres, un peu court (vise 30-65)");
      else if (title.length > 65) push("Titre", "warn", title.length + " caracteres, un peu long (vise 30-65)");
      else push("Titre", "ok", title.length + " caracteres");

      if (!desc) push("Meta description", "fail", "Absente");
      else if (desc.length < 120) push("Meta description", "warn", desc.length + " caracteres, un peu courte (vise 120-160)");
      else if (desc.length > 170) push("Meta description", "warn", desc.length + " caracteres, un peu longue (vise 120-160)");
      else push("Meta description", "ok", desc.length + " caracteres");

      push("Lien canonical", canonical ? "ok" : "warn", canonical ? "Present" : "Absent (recommande)");

      if (h1count === 0) push("Titre H1", "fail", "Aucun H1 detecte");
      else if (h1count > 1) push("Titre H1", "warn", h1count + " balises H1 (ideal : 1 seule)");
      else push("Titre H1", "ok", "1 seul H1");

      push("Sous-titres H2", h2count > 0 ? "ok" : "warn", h2count + " balise(s) H2");

      const ogAll = ogTitle && ogDesc && ogImg;
      push("Open Graph (partage reseaux)", ogAll ? "ok" : ((ogTitle || ogDesc || ogImg) ? "warn" : "fail"),
        ogAll ? "Titre, description et image presents" : "Incomplet (og:title / og:description / og:image)");

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
}

/* ------------------------------------------------------------------ */
/* Action : historique des audits                                      */
/* ------------------------------------------------------------------ */

async function actionSeoAuditHistory(req, res) {
  const { data, error } = await supabase
    .from("seo_audit_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  res.status(200).json({ ok: true, history: data || [] });
}

/* ------------------------------------------------------------------ */
/* Action : pages orphelines (public/ vs sitemap.xml)                  */
/* ------------------------------------------------------------------ */

async function actionOrphanPages(req, res) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    res.status(200).json({ ok: false, error: "GITHUB_TOKEN manquant dans les variables Vercel." });
    return;
  }

  const sitemapRes = await fetch("https://timat.app/sitemap.xml");
  if (!sitemapRes.ok) {
    res.status(200).json({ ok: false, error: "sitemap.xml injoignable (" + sitemapRes.status + ")." });
    return;
  }
  const xml = await sitemapRes.text();
  const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1].trim());
  const sitemapFiles = new Set(
    locs.map((u) => {
      try {
        const p = new URL(u).pathname;
        return p === "/" || p === "" ? "index.html" : p.replace(/^\//, "");
      } catch (e) { return null; }
    }).filter(Boolean)
  );

  const ghRes = await fetch("https://api.github.com/repos/" + REPO + "/contents/public", {
    headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" }
  });
  if (!ghRes.ok) {
    res.status(200).json({ ok: false, error: "GitHub a repondu " + ghRes.status + " (token invalide ou repo inaccessible)." });
    return;
  }
  const files = await ghRes.json();
  const htmlFiles = (Array.isArray(files) ? files : []).filter(
    (f) => f.type === "file" && f.name.toLowerCase().endsWith(".html")
  );

  const orphans = htmlFiles
    .filter((f) => !sitemapFiles.has(f.name) && !EXCLUDE_HTML.has(f.name))
    .map((f) => ({ name: f.name, path: "public/" + f.name }));

  res.status(200).json({
    ok: true,
    orphans: orphans,
    totalPublicHtml: htmlFiles.length,
    totalSitemapUrls: sitemapFiles.size
  });
}

/* ------------------------------------------------------------------ */
/* Action : MRR et abonnes Pro (Stripe)                                */
/* ------------------------------------------------------------------ */

async function actionStripeMrr(req, res) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    res.status(200).json({ ok: false, error: "STRIPE_SECRET_KEY manquante dans les variables Vercel." });
    return;
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });
  const mode = secretKey.startsWith("sk_live_") ? "live" : "test";

  let mrrCents = 0;
  let activeCount = 0;
  let trialingCount = 0;
  let currency = "eur";

  let hasMore = true;
  let startingAfter;

  while (hasMore) {
    const page = await stripe.subscriptions.list({
      status: "all",
      limit: 100,
      starting_after: startingAfter,
      expand: ["data.items.data.price"]
    });

    for (const sub of page.data) {
      if (sub.status !== "active" && sub.status !== "trialing") continue;
      if (sub.status === "trialing") trialingCount++;
      if (sub.status === "active") activeCount++;

      for (const item of sub.items.data) {
        const price = item.price;
        if (!price || !price.unit_amount || !price.recurring) continue;
        currency = price.currency || currency;
        const qty = item.quantity || 1;
        let monthly = price.unit_amount * qty;
        const interval = price.recurring.interval;
        const intervalCount = price.recurring.interval_count;
        if (interval === "year") monthly = monthly / (12 * intervalCount);
        else if (interval === "week") monthly = (monthly * (52 / 12)) / intervalCount;
        else if (interval === "day") monthly = (monthly * 30) / intervalCount;
        else if (interval === "month") monthly = monthly / intervalCount;
        // Le MRR ne compte que les abonnements deja factures (pas les essais gratuits)
        if (sub.status === "active") mrrCents += monthly;
      }
    }

    hasMore = page.has_more;
    startingAfter = page.data.length ? page.data[page.data.length - 1].id : undefined;
  }

  mrrCents = Math.round(mrrCents);

  res.status(200).json({
    ok: true,
    mode: mode,
    currency: currency,
    mrrCents: mrrCents,
    mrrFormatted: (mrrCents / 100).toLocaleString("fr-FR", { style: "currency", currency: currency.toUpperCase() }),
    activeCount: activeCount,
    trialingCount: trialingCount
  });
}

/* ------------------------------------------------------------------ */
/* Action : Google Search Console                                      */
/* ------------------------------------------------------------------ */

async function getGoogleAccessToken(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };
  const unsigned = b64url(JSON.stringify(header)) + "." + b64url(JSON.stringify(claim));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  const signature = signer.sign(privateKey).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const jwt = unsigned + "." + signature;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=" + encodeURIComponent(jwt)
  });
  const j = await resp.json();
  if (!j.access_token) throw new Error(j.error_description || j.error || "Authentification Google echouee");
  return j.access_token;
}

async function actionSearchConsole(req, res) {
  const raw = process.env.GSC_SERVICE_ACCOUNT;
  if (!raw) {
    res.status(200).json({ configured: false, message: "Search Console n'est pas encore configure." });
    return;
  }
  let sa;
  try { sa = JSON.parse(raw); } catch (e) {
    res.status(500).json({ error: "GSC_SERVICE_ACCOUNT invalide : un JSON de compte de service est attendu." });
    return;
  }
  const clientEmail = sa.client_email;
  const privateKey = (sa.private_key || "").replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) {
    res.status(500).json({ error: "client_email ou private_key manquant dans le compte de service." });
    return;
  }
  const siteUrl = process.env.GSC_SITE_URL || "sc-domain:timat.app";

  const token = await getGoogleAccessToken(clientEmail, privateKey);

  // Periode : 28 derniers jours (les donnees GSC ont ~2 jours de decalage)
  const end = new Date(); end.setDate(end.getDate() - 2);
  const start = new Date(end); start.setDate(start.getDate() - 28);
  const fmt = (d) => d.toISOString().slice(0, 10);

  const apiUrl = "https://www.googleapis.com/webmasters/v3/sites/" + encodeURIComponent(siteUrl) + "/searchAnalytics/query";
  const runQuery = async (dimensions) => {
    const body = { startDate: fmt(start), endDate: fmt(end), rowLimit: 25 };
    if (dimensions) body.dimensions = dimensions;
    const r = await fetch(apiUrl, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const j = await r.json();
    if (j.error) throw new Error((j.error.message || "Erreur Search Console") + (j.error.code ? " (" + j.error.code + ")" : ""));
    return j.rows || [];
  };

  const queriesRows = await runQuery(["query"]);
  const pagesRows = await runQuery(["page"]);
  const totalRows = await runQuery(null);
  const totals = totalRows[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };

  res.status(200).json({
    configured: true,
    siteUrl: siteUrl,
    start: fmt(start),
    end: fmt(end),
    totals: {
      clicks: totals.clicks || 0,
      impressions: totals.impressions || 0,
      ctr: totals.ctr || 0,
      position: totals.position || 0
    },
    queries: queriesRows.map((r) => ({ q: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
    pages: pagesRows.map((r) => ({ p: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }))
  });
}

/* ------------------------------------------------------------------ */
/* Aiguillage                                                          */
/* ------------------------------------------------------------------ */

export default async function handler(req, res) {
  try {
    if (!(await requireAdmin(req, res))) return;

    const action = (req.query && req.query.action) || "";
    if (action === "seo-audit") return await actionSeoAudit(req, res);
    if (action === "seo-audit-history") return await actionSeoAuditHistory(req, res);
    if (action === "orphan-pages") return await actionOrphanPages(req, res);
    if (action === "stripe-mrr") return await actionStripeMrr(req, res);
    if (action === "search-console") return await actionSearchConsole(req, res);

    res.status(400).json({ ok: false, error: "Action inconnue : " + (action || "(aucune)") });
  } catch (e) {
    res.status(500).json({ ok: false, error: (e && e.message) || "Erreur backoffice." });
  }
}
