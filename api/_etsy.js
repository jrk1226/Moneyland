// Etsy Open API v3 helpers (seller app for Josh's own shop).
const crypto = require("crypto");
const { db } = require("./_lib");
const API = "https://api.etsy.com/v3";
const SCOPES = "listings_r listings_w transactions_r shops_r";

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
module.exports = { SCOPES, keystring, etsyConfigured, link, saveLink, newPkce, tokenRequest, accessToken, etsy };
