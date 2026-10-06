// Pinterest API v5 helpers. Needs PINTEREST_APP_ID and PINTEREST_APP_SECRET in Vercel.
const crypto = require("crypto");
const { db } = require("./_lib");
const API = "https://api.pinterest.com/v5";
const SCOPES = "boards:read,boards:write,pins:read,pins:write,user_accounts:read";

const configured = () => !!(process.env.PINTEREST_APP_ID && process.env.PINTEREST_APP_SECRET);
async function plink() { return (await db("pinterest_link?id=eq.1"))[0] || null; }
async function savePlink(f) { return db("pinterest_link?on_conflict=id", { method: "POST", prefer: "resolution=merge-duplicates,return=representation", body: [Object.assign({ id: 1, updated_at: new Date().toISOString() }, f)] }); }
function basic() { return "Basic " + Buffer.from(process.env.PINTEREST_APP_ID + ":" + process.env.PINTEREST_APP_SECRET).toString("base64"); }
async function token(params) {
  const r = await fetch(API + "/oauth/token", { method: "POST", headers: { Authorization: basic(), "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params).toString() });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error("Pinterest sign-in failed: " + (d.message || d.error_description || r.status));
  return d;
}
async function access() {
  const l = await plink();
  if (!l || !l.refresh_token) throw new Error("Pinterest is not connected yet.");
  if (l.access_token && new Date(l.expires_at).getTime() - Date.now() > 300000) return l;
  const d = await token({ grant_type: "refresh_token", refresh_token: l.refresh_token });
  const f = { access_token: d.access_token, refresh_token: d.refresh_token || l.refresh_token, expires_at: new Date(Date.now() + (d.expires_in || 2592000) * 1000).toISOString() };
  await savePlink(f); return Object.assign(l, f);
}
async function pin(path, opts = {}) {
  const l = await access();
  const r = await fetch(API + path, { method: opts.method || "GET", headers: { Authorization: "Bearer " + l.access_token, "content-type": "application/json" }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const t = await r.text(); let d = null; try { d = t ? JSON.parse(t) : null; } catch (e) { d = { raw: t }; }
  if (!r.ok) { const e = new Error("Pinterest " + r.status + ": " + ((d && (d.message || d.code)) || t).toString().slice(0, 240)); e.status = r.status; throw e; }
  return d;
}
function connectURL(host, state) {
  return "https://www.pinterest.com/oauth/?" + new URLSearchParams({ client_id: process.env.PINTEREST_APP_ID, redirect_uri: "https://" + host + "/api/pinterest-callback", response_type: "code", scope: SCOPES, state }).toString();
}
async function ensureBoard() {
  const l = await plink(); if (l && l.board_id) return l.board_id;
  const boards = await pin("/boards?page_size=100");
  let b = (boards.items || []).find(x => /bright page/i.test(x.name));
  if (!b) b = await pin("/boards", { method: "POST", body: { name: "Bright Page Prints", description: "Printable kids activities, planners, party printables and wall art from Bright Page Prints on Etsy. Instant download.", privacy: "PUBLIC" } });
  await savePlink({ board_id: b.id }); return b.id;
}
async function createPin({ title, description, link, alt_text, png }) {
  const board_id = await ensureBoard();
  return pin("/pins", { method: "POST", body: { board_id, title: String(title).slice(0, 100), description: String(description).slice(0, 500), link, alt_text: String(alt_text || title).slice(0, 500),
    media_source: { source_type: "image_base64", content_type: "image/png", data: Buffer.from(png).toString("base64") } } });
}
module.exports = { configured, plink, savePlink, token, access, pin, connectURL, createPin, ensureBoard, newState: () => crypto.randomBytes(16).toString("hex") };
