// api/search-console.js
// Interroge l'API Google Search Console (positions, clics, impressions, mots-cles)
// via un COMPTE DE SERVICE Google (server-to-server, pas d'OAuth interactif).
//
// Configuration requise (variables d'environnement Vercel) :
//   GSC_SERVICE_ACCOUNT = le contenu JSON complet de la cle du compte de service
//   GSC_SITE_URL        = "sc-domain:timat.app" (propriete Domaine) ou "https://timat.app/" (propriete Prefixe d'URL)
// + ajouter l'email du compte de service comme utilisateur dans Search Console.

import crypto from "crypto";

function b64url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getAccessToken(clientEmail, privateKey) {
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

export default async function handler(req, res) {
  try {
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

    const token = await getAccessToken(clientEmail, privateKey);

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
  } catch (e) {
    res.status(500).json({ error: (e && e.message) || "Erreur Search Console" });
  }
}
