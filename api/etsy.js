// Moneyland <-> Etsy: connect the shop, send products to Etsy as drafts, and count real sales.
const { cfg, codeOk, readBody, db } = require("./_lib");
const { SCOPES, keystring, etsyConfigured, link, saveLink, newPkce, accessToken, etsy } = require("./_etsy");

const CAT_WORDS = {
  kids: ["worksheets", "learning & school", "educational", "activity books", "games & puzzles", "paper & party supplies"],
  planner: ["calendars & planners", "planners", "paper", "paper & party supplies"],
  party: ["party games", "party supplies", "games", "paper & party supplies"],
};
let taxCache = null;
async function pickTaxonomy(category) {
  if (!taxCache) {
    const d = await etsy("/application/seller-taxonomy/nodes", { noAuth: true });
    const flat = []; const walk = (n, path) => { const p = path.concat(n.name); flat.push({ id: n.id, name: n.name, path: p.join(" > ").toLowerCase(), leaf: !(n.children && n.children.length) }); (n.children || []).forEach(c => walk(c, p)); };
    (d.results || []).forEach(n => walk(n, []));
    taxCache = flat;
  }
  for (const w of CAT_WORDS[category] || CAT_WORDS.planner) {
    const hit = taxCache.find(t => t.name.toLowerCase() === w) || taxCache.find(t => t.path.includes(w));
    if (hit) return hit.id;
  }
  return taxCache[0] && taxCache[0].id;
}
function blobFrom(b64, type) { return new Blob([Buffer.from(String(b64 || ""), "base64")], { type }); }

async function syncSales() {
  const { link: l } = await accessToken();
  if (!l.shop_id) throw new Error("No Etsy shop on this account.");
  const counts = {}; let offset = 0;
  for (let page = 0; page < 10; page++) {
    const d = await etsy("/application/shops/" + l.shop_id + "/receipts?was_paid=true&limit=100&offset=" + offset);
    (d.results || []).forEach(rc => (rc.transactions || []).forEach(t => { if (t.listing_id) counts[t.listing_id] = (counts[t.listing_id] || 0) + (t.quantity || 1); }));
    if (!d.results || d.results.length < 100) break; offset += 100;
  }
  const products = await db("products?select=id,etsy_listing_id,sales,status,etsy_state&etsy_listing_id=not.is.null");
  let changed = 0;
  for (const p of products) {
    const patch = {};
    const sold = counts[p.etsy_listing_id] || 0;
    if (sold !== p.sales) patch.sales = sold;
    try { const li = await etsy("/application/shops/" + l.shop_id + "/listings/" + p.etsy_listing_id); if (li && li.state && li.state !== p.etsy_state) { patch.etsy_state = li.state; if (li.state === "active") patch.status = "listed"; } } catch (e) {}
    if (Object.keys(patch).length) { await db("products?id=eq." + p.id, { method: "PATCH", body: patch }); changed++; }
  }
  await saveLink({ last_sync: new Date().toISOString() });
  return { changed, listingsWithSales: Object.keys(counts).length };
}

const handler = async (req, res) => {
  const c = cfg();
  const q = req.query || {};
  try {
    // Cron: count real sales every 15 minutes.
    if (req.method === "GET" && q.do === "sync") {
      if (!/vercel-cron/i.test(String(req.headers["user-agent"] || ""))) return res.status(401).json({ error: "Not allowed." });
      if (!c.db || !etsyConfigured()) return res.status(200).json({ skipped: "not set up" });
      const l = await link(); if (!l || !l.refresh_token) return res.status(200).json({ skipped: "not connected" });
      return res.status(200).json(await syncSales());
    }
    // Start connecting: send Josh to Etsy's approval page.
    if (req.method === "GET" && q.do === "connect") {
      if (!c.db || !etsyConfigured()) { res.statusCode = 302; res.setHeader("Location", "/?etsy=" + encodeURIComponent("Add the Etsy keys in Vercel first.") + "#shop"); return res.end(); }
      if (!codeOk(req, { code: q.code })) return res.status(401).send("Wrong or missing access code.");
      const p = newPkce();
      await saveLink({ state: p.state, verifier: p.verifier });
      const redirect = "https://" + req.headers.host + "/api/etsy-callback";
      const url = "https://www.etsy.com/oauth/connect?" + new URLSearchParams({ response_type: "code", client_id: keystring(), redirect_uri: redirect, scope: SCOPES, state: p.state, code_challenge: p.challenge, code_challenge_method: "S256" }).toString().replace(/\+/g, "%20");
      res.statusCode = 302; res.setHeader("Location", url); return res.end();
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
    const body = readBody(req);
    if (!codeOk(req, body)) return res.status(401).json({ error: "Wrong or missing access code.", code: "needs_code" });
    if (body.action === "status") {
      if (!c.db || !etsyConfigured()) return res.status(200).json({ configured: false });
      const l = await link();
      return res.status(200).json({ configured: true, connected: !!(l && l.refresh_token), shop_name: l && l.shop_name, last_sync: l && l.last_sync });
    }
    if (!c.db || !etsyConfigured()) return res.status(503).json({ error: "Add the Etsy keys in Vercel first.", code: "not_configured" });
    if (body.action === "sync") return res.status(200).json(await syncSales());
    if (body.action === "draft") {
      const id = parseInt(body.productId, 10);
      const prod = (await db("products?id=eq." + id))[0];
      if (!prod) return res.status(404).json({ error: "Product not found." });
      const { link: l } = await accessToken();
      if (!l.shop_id) throw new Error("No Etsy shop on this account yet. Finish opening the shop on Etsy first.");
      const spec = prod.spec || {}, L = spec.listing || {};
      const title = String(body.title || L.etsyTitle || spec.title).slice(0, 140);
      const tags = (L.tags || []).map(t => String(t).replace(/[^A-Za-z0-9 \-']/g, "").slice(0, 20).trim()).filter(Boolean).slice(0, 13);
      const listing = { quantity: 999, title, description: String(body.description || spec.title).slice(0, 60000), price: Number(prod.price),
        who_made: "i_did", when_made: "made_to_order", taxonomy_id: await pickTaxonomy(spec.category), type: "download", is_supply: false, should_auto_renew: true, tags };
      let created;
      if (prod.etsy_listing_id) created = { listing_id: prod.etsy_listing_id };
      else {
        try { created = await etsy("/application/shops/" + l.shop_id + "/listings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(listing) }); }
        catch (e) { // fall back to form encoding
          const form = new URLSearchParams(); Object.entries(listing).forEach(([k, v]) => form.append(k, Array.isArray(v) ? v.join(",") : String(v)));
          created = await etsy("/application/shops/" + l.shop_id + "/listings", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form.toString() });
        }
        await db("products?id=eq." + id, { method: "PATCH", body: { etsy_listing_id: created.listing_id, etsy_state: "draft" } });
      }
      const lid = created.listing_id, base = "/application/shops/" + l.shop_id + "/listings/" + lid;
      if (body.image) { const f = new FormData(); f.append("image", blobFrom(body.image, "image/png"), "listing-photo.png"); f.append("rank", "1"); await etsy(base + "/images", { method: "POST", body: f }); }
      if (body.pdf) { const f = new FormData(); f.append("file", blobFrom(body.pdf, "application/pdf"), body.fileName || "printable.pdf"); f.append("name", body.fileName || "printable.pdf"); f.append("rank", "1"); await etsy(base + "/files", { method: "POST", body: f }); }
      return res.status(200).json({ ok: true, listing_id: lid, edit_url: "https://www.etsy.com/your/shops/me/listing-editor/edit/" + lid });
    }
    return res.status(400).json({ error: "Unknown action." });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
};

module.exports = handler;
module.exports.syncSales = syncSales;
