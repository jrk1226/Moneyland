// Etsy Open API v3 helpers (seller app for Josh's own shop).
const crypto = require("crypto");
const { db } = require("./_lib");
const API = "https://api.etsy.com/v3";
const SCOPES = "listings_r listings_w transactions_r shops_r shops_w";

function keystring() { return process.env.ETSY_KEYSTRING || ""; }
function apiKeyHeader() { return keystring() + ":" + (process.env.ETSY_SHARED_SECRET || ""); }
function etsyConfigured() { return !!(process.env.ETSY_KEYSTRING && process.env.ETSY_SHARED_SECRET); }
const b64url = buf => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function link() { return (await db("etsy_link?id=eq.1"))[0] || null; }
async function saveLink(fields) {
  return db("etsy_link?on_conflict=id", { method: "POST", prefer: "resolution=merge-duplicates,return=representation", body: [Object.assign({ id: 1, updated_at: new Date().toISOString() }, fields)] });
}
function newPkce() {
  const verifier = b64url(crypto.randomBytes(48));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge, state: b64url(crypto.randomBytes(16)) };
}
async function tokenRequest(params) {
  const r = await fetch(API + "/public/oauth/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params).toString() });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error("Etsy sign-in failed: " + (d.error_description || d.error || r.status));
  return d;
}
async function accessToken() {
  const l = await link();
  if (!l || !l.refresh_token) throw new Error("Etsy is not connected yet.");
  if (l.access_token && new Date(l.expires_at).getTime() - Date.now() > 120000) return { token: l.access_token, link: l };
  const d = await tokenRequest({ grant_type: "refresh_token", client_id: keystring(), refresh_token: l.refresh_token });
  const fields = { access_token: d.access_token, refresh_token: d.refresh_token || l.refresh_token, expires_at: new Date(Date.now() + (d.expires_in || 3600) * 1000).toISOString() };
  await saveLink(fields);
  return { token: fields.access_token, link: Object.assign(l, fields) };
}
async function etsy(path, opts = {}) {
  const { token } = opts.noAuth ? { token: null } : await accessToken();
  const headers = Object.assign({ "x-api-key": apiKeyHeader() }, token ? { Authorization: "Bearer " + token } : {}, opts.headers || {});
  const r = await fetch(API + path, { method: opts.method || "GET", headers, body: opts.body });
  const text = await r.text(); let data = null; try { data = text ? JSON.parse(text) : null; } catch (e) { data = { raw: text }; }
  if (!r.ok) { const e = new Error("Etsy " + r.status + ": " + ((data && (data.error || data.message)) || text).toString().slice(0, 300)); e.status = r.status; throw e; }
  return data;
}
const CAT_WORDS = {
  kids: ["worksheets", "learning & school", "educational", "activity books", "coloring books", "games & puzzles", "paper & party supplies"],
  wallart: ["prints", "digital prints", "art & collectibles", "wall decor"],
  planner: ["calendars & planners", "planners", "paper", "paper & party supplies"],
  party: ["party games", "party supplies", "games", "paper & party supplies"],
};
let taxCache = null;
async function pickTaxonomy(category) {
  if (!taxCache) {
    const d = await etsy("/application/seller-taxonomy/nodes", { noAuth: true });
    const flat = []; const walk = (n, p) => { const path = p.concat(n.name); flat.push({ id: n.id, name: n.name, path: path.join(" > ").toLowerCase() }); (n.children || []).forEach(c => walk(c, path)); };
    (d.results || []).forEach(n => walk(n, []));
    taxCache = flat;
  }
  for (const w of CAT_WORDS[category] || CAT_WORDS.planner) {
    const hit = taxCache.find(t => t.name.toLowerCase() === w) || taxCache.find(t => t.path.includes(w));
    if (hit) return hit.id;
  }
  return taxCache[0] && taxCache[0].id;
}
// Creates (or reuses) the Etsy listing for a product, uploads the photos and download files, and optionally makes it live.
async function publishProduct(prod, opts = {}) {
  const { link: l } = await accessToken();
  if (!l.shop_id) throw new Error("No Etsy shop on this account yet. Finish opening the shop on Etsy first.");
  const spec = prod.spec || {}, L = spec.listing || {};
  const R = require("./_render");
  const description = opts.description || R.listingDesc(spec);
  const title = String(opts.title || L.etsyTitle || spec.title).slice(0, 140);
  const tags = (L.tags || []).map(t => String(t).replace(/[^A-Za-z0-9 \-']/g, "").slice(0, 20).trim()).filter(Boolean).slice(0, 13);
  let lid = prod.etsy_listing_id, isNew = false;
  if (!lid) {
    const listing = { quantity: 999, title, description: String(description).slice(0, 60000), price: Number(prod.price), who_made: "i_did", when_made: "made_to_order",
      taxonomy_id: await pickTaxonomy(spec.category), type: "download", is_supply: false, should_auto_renew: true, tags };
    let created;
    try { created = await etsy("/application/shops/" + l.shop_id + "/listings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(listing) }); }
    catch (e) { const form = new URLSearchParams(); Object.entries(listing).forEach(([k, v]) => form.append(k, Array.isArray(v) ? v.join(",") : String(v)));
      created = await etsy("/application/shops/" + l.shop_id + "/listings", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form.toString() }); }
    lid = created.listing_id; isNew = true;
    await db("products?id=eq." + prod.id, { method: "PATCH", body: { etsy_listing_id: lid, etsy_state: "draft" } });
  }
  const base = "/application/shops/" + l.shop_id + "/listings/" + lid;
  if (isNew || opts.reupload) {
    if (!isNew) {
      try { const im = await etsy("/application/listings/" + lid + "/images"); for (const x of (im.results || [])) await etsy(base + "/images/" + x.listing_image_id, { method: "DELETE" }); } catch (e) {}
      try { const fl = await etsy(base + "/files"); for (const x of (fl.results || [])) await etsy(base + "/files/" + x.listing_file_id, { method: "DELETE" }); } catch (e) {}
    }
    const images = R.listingImages(spec);
    for (let i = 0; i < images.length; i++) { const f = new FormData(); f.append("image", new Blob([images[i]], { type: "image/png" }), "listing-photo-" + (i + 1) + ".png"); f.append("rank", String(i + 1)); await etsy(base + "/images", { method: "POST", body: f }); }
    const files = await R.downloadFiles(spec);
    for (let i = 0; i < files.length && i < 5; i++) { const f = new FormData(); f.append("file", new Blob([files[i].buf], { type: files[i].type }), files[i].name); f.append("name", files[i].name); f.append("rank", String(i + 1)); await etsy(base + "/files", { method: "POST", body: f }); }
  }
  if (opts.activate) {
    await etsy(base, { method: "PATCH", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ state: "active" }).toString() });
    await db("products?id=eq." + prod.id, { method: "PATCH", body: { status: "listed", etsy_state: "active", published_at: new Date().toISOString(), auto_published: !!opts.auto } });
  }
  return { listing_id: lid, edit_url: "https://www.etsy.com/your/shops/me/listing-editor/edit/" + lid };
}
module.exports = { pickTaxonomy, publishProduct, SCOPES, keystring, etsyConfigured, link, saveLink, newPkce, tokenRequest, accessToken, etsy };
