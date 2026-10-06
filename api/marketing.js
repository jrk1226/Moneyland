// Marketing Room: brand kit images, Pinterest pins, shop announcement, listing check-ups (category, attributes, sections) and search tuning of slow listings.
// GET ?kind=asset&name=...  |  GET ?kind=pin&id=...  |  GET ?do=cron (Vercel cron)  |  GET ?do=pconnect
// POST {action: status | run | shoptext.apply}
const { cfg, codeOk, readBody, db, claudeJSON } = require("./_lib");
const P = require("./_pinterest");
const BR = require("../lib/design/brand");
const OUT = require("../lib/design/output");

const SHOP_URL = "https://www.etsy.com/shop/BrightPagePrintsShop";
async function note(text) { try { await db("autopilot_log", { method: "POST", prefer: "return=minimal", body: [{ kind: "marketing", text: String(text).slice(0, 500) }] }); } catch (e) {} }

function coverOf(spec) {
  if (spec.category === "wallart") { const WA = require("../lib/design/wallart"); return WA.artSVG((spec.prints || [])[0] || {}, spec.palette, "2x3").page; }
  const B = require("../lib/design/book"); return B.build(spec).pages[0].page;
}
async function liveCovers(n) {
  const rows = await db("products?select=spec&etsy_state=eq.active&order=etsy_views.desc,id.desc&limit=" + (n || 3));
  return rows.map(r => { try { return coverOf(r.spec); } catch (e) { return null; } }).filter(Boolean);
}
async function assetPNG(name, w) {
  let p;
  if (name === "icon") p = BR.shopIcon();
  else if (name === "banner") p = BR.banner(await liveCovers(3));
  else if (name === "receipt") p = BR.receiptBanner();
  else p = BR.logo(name === "logo_badge" ? "badge" : name === "logo_wide" ? "wide" : "stacked");
  const width = w || { icon: 500, banner: 3360, receipt: 760 }[name] || 1000;
  return Buffer.from(OUT.png(p.svg(p.bg), width));
}
async function pinPNG(pinRow, w) {
  const prod = (await db("products?select=spec&id=eq." + pinRow.product_id))[0];
  if (!prod) throw new Error("Product not found");
  const spec = prod.spec, n = spec.category === "wallart" ? 0 : (spec.pageCount || 0);
  const p = BR.pin(spec, coverOf(spec), n, pinRow.style || 1);
  return Buffer.from(OUT.png(p.svg(p.bg), w || 1000));
}

// ---------- the job ----------
async function makePins() {
  const live = await db("products?select=id,spec,etsy_listing_id&etsy_state=eq.active");
  const have = await db("pins?select=product_id");
  const need = live.filter(p => !have.some(h => h.product_id === p.id)).slice(0, 8);
  if (!need.length) return 0;
  const prompt = "You write Pinterest pins for Bright Page Prints, an Etsy shop of printable digital downloads. For each product write a pin that ranks in Pinterest search: a keyword-rich title (max 90 characters), a helpful description (2-3 sentences, max 400 characters, natural keywords people search for, end with 'Instant download on Etsy.'), and alt text describing the image (max 200 characters). Do not use hashtags, emojis, brand names or trademarks. Products:\n"
    + need.map(p => "id " + p.id + ": " + p.spec.title + " - " + (p.spec.subtitle || "") + " (tags: " + ((p.spec.listing || {}).tags || []).join(", ") + ")").join("\n")
    + "\nReply with only JSON: {\"pins\": [{\"id\": number, \"title\": \"...\", \"description\": \"...\", \"alt_text\": \"...\"}]}";
  const out = (await claudeJSON({ tier: "quick", prompt, maxTokens: 3000 })).data;
  const rows = [];
  (out.pins || []).forEach(x => { const p = need.find(n => n.id === Number(x.id)); if (!p) return;
    [1, 2].forEach(style => rows.push({ product_id: p.id, style, status: "ready", title: String(x.title || p.spec.title).slice(0, 100), description: String(x.description || "").slice(0, 500), alt_text: String(x.alt_text || "").slice(0, 500), link: "https://www.etsy.com/listing/" + p.etsy_listing_id })); });
  if (rows.length) await db("pins", { method: "POST", prefer: "return=minimal", body: rows });
  return rows.length;
}
async function postPins(max) {
  if (!P.configured()) return "Pinterest keys not added yet";
  const l = await P.plink(); if (!l || !l.refresh_token) return "Pinterest not connected yet";
  const today = await db("pins?select=id&status=eq.posted&posted_at=gte." + new Date(Date.now() - 86400000).toISOString());
  let room = Math.max(0, max - today.length), posted = 0;
  const queue = await db("pins?select=*&status=eq.ready&order=style.asc,id.asc&limit=" + room);
  for (const row of queue) {
    try { const r = await P.createPin({ title: row.title, description: row.description, link: row.link, alt_text: row.alt_text, png: await pinPNG(row, 1000) });
      await db("pins?id=eq." + row.id, { method: "PATCH", body: { status: "posted", pin_id: r.id, posted_at: new Date().toISOString() } }); posted++; }
    catch (e) { await db("pins?id=eq." + row.id, { method: "PATCH", body: { note: String(e.message).slice(0, 300) } }); if (e.status === 401 || e.status === 403) break; }
  }
  return posted + " pins posted";
}
async function putShop(text) {
  const { etsy, link } = require("./_etsy"); const l = await link();
  await etsy("/application/shops/" + l.shop_id, { method: "PUT", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ title: text.title, announcement: text.announcement, digital_sale_message: text.digital_sale_message }).toString() });
}
async function shopText(force) {
  const st = (await db("settings?id=eq.1"))[0] || {};
  const cur = st.shop_text || {}, month = new Date().toISOString().slice(0, 7);
  if (!force && cur.month === month && cur.applied) return null;
  // Already wrote this month's text but Etsy refused: just retry saving it (no new AI call, no repeat log line).
  if (!force && cur.month === month && cur.title) {
    try { await putShop(cur); cur.applied = true; delete cur.error; await note("Updated the shop headline, announcement and thank-you message on Etsy."); }
    catch (e) { return cur; }
    await db("settings?id=eq.1", { method: "PATCH", body: { shop_text: cur } }); return cur;
  }
  const live = await db("products?select=spec->>title&etsy_state=eq.active&limit=30");
  const prompt = "Write the Etsy shop text for Bright Page Prints, a shop of printable instant downloads (kids activity books, planners, party printables, wall art). Today is " + new Date().toDateString() + ". Our products: " + live.map(r => r.title).join("; ") + ".\n"
    + "Return only JSON: {\"title\": \"shop headline, max 55 characters\", \"announcement\": \"shop announcement, 2-4 short friendly sentences, mention what is new or seasonal, max 500 characters\", \"digital_sale_message\": \"thank-you note buyers see after purchase, how to download from Etsy Purchases, print tips, invite a review, max 500 characters\"}. No emojis, no promises we cannot keep, no discounts unless told.";
  const t = (await claudeJSON({ tier: "smart", prompt, maxTokens: 1200 })).data;
  const text = { month, title: String(t.title || "").slice(0, 55), announcement: String(t.announcement || "").slice(0, 5000), digital_sale_message: String(t.digital_sale_message || "").slice(0, 5000), applied: false };
  try {
    await putShop(text);
    text.applied = true; await note("Updated the shop headline, announcement and thank-you message on Etsy.");
  } catch (e) { text.error = String(e.message).slice(0, 200); await note("Wrote new shop text, but Etsy needs one more permission to save it. Tap Reconnect Etsy in the Marketing Room. (" + text.error + ")"); }
  await db("settings?id=eq.1", { method: "PATCH", body: { shop_text: text } });
  return text;
}
async function tuneSEO(max) {
  const cutoff = new Date(Date.now() - 14 * 86400000).toISOString();
  const recent = (await db("seo_changes?select=product_id,at,new_title&at=gte." + new Date(Date.now() - 21 * 86400000).toISOString()))
    .filter(r => r.new_title || Date.now() - new Date(r.at).getTime() < 86400000); // a failed try waits 1 day, a real change waits 3 weeks
  const slow = (await db("products?select=id,spec,etsy_listing_id,etsy_views,published_at&etsy_state=eq.active&published_at=lte." + cutoff + "&order=etsy_views.asc&limit=10"))
    .filter(p => (p.etsy_views || 0) < 25 && !recent.some(r => r.product_id === p.id)).slice(0, max);
  let n = 0;
  for (const p of slow) {
    const L = p.spec.listing || {};
    const prompt = "You are an Etsy SEO expert. This printable digital download listing has had only " + (p.etsy_views || 0) + " views in 2+ weeks. Use web search to see what buyers search for and how top listings for this kind of product are titled. Then improve the Etsy title and 13 tags so it matches real buyer searches.\n"
      + "Product: " + p.spec.title + " - " + (p.spec.subtitle || "") + "\nCurrent title: " + L.etsyTitle + "\nCurrent tags: " + (L.tags || []).join(", ")
      + "\nRules: title max 140 characters, front-load the main search phrase in the first 50 characters, natural wording, describe only what the product really contains; 13 tags, each max 20 characters, real search phrases, no repeats; no trademarks or brand names. Reply with only JSON: {\"title\": \"...\", \"tags\": [13 strings], \"why\": \"one sentence\"}";
    try {
      const out = (await claudeJSON({ tier: "smart", prompt, maxTokens: 3000, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }] })).data;
      const title = String(out.title || "").slice(0, 140), tags = (out.tags || []).map(t => String(t).replace(/[^A-Za-z0-9 \-']/g, "").slice(0, 20).trim()).filter(Boolean).slice(0, 13);
      if (title.length < 20 || tags.length < 8) throw new Error("the AI answer was too short");
      const { etsy, link } = require("./_etsy"); const l = await link();
      await etsy("/application/shops/" + l.shop_id + "/listings/" + p.etsy_listing_id, { method: "PATCH", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ title, tags: tags.join(",") }).toString() });
      const spec = Object.assign({}, p.spec, { listing: Object.assign({}, L, { etsyTitle: title, tags }) });
      await db("products?id=eq." + p.id, { method: "PATCH", body: { spec } });
      await db("seo_changes", { method: "POST", prefer: "return=minimal", body: [{ product_id: p.id, old_title: L.etsyTitle, new_title: title, old_tags: L.tags || [], new_tags: tags, views_before: p.etsy_views || 0, note: String(out.why || "").slice(0, 300) }] });
      await note("Tuned the Etsy title and tags of \"" + p.spec.title + "\" (only " + (p.etsy_views || 0) + " views in 2 weeks): " + String(out.why || "").slice(0, 200));
      n++;
    } catch (e) {
      await db("seo_changes", { method: "POST", prefer: "return=minimal", body: [{ product_id: p.id, old_title: L.etsyTitle, views_before: p.etsy_views || 0, note: "failed: " + String(e.message).slice(0, 280) }] }).catch(() => {});
      await note("Could not tune \"" + p.spec.title + "\" (will try again tomorrow): " + String(e.message).slice(0, 200)); }
  }
  return n;
}
async function runJob(force) {
  const st = (await db("settings?id=eq.1"))[0] || {};
  if (st.marketing_on === false && !force) return { skipped: "Marketing Room is switched off" };
  const done = {};
  try { done.pinsMade = await makePins(); if (done.pinsMade) await note("Made " + done.pinsMade + " new Pinterest pins for live products."); } catch (e) { done.pinsError = e.message; }
  try { done.pinterest = await postPins(5); } catch (e) { done.pinterest = e.message; }
  try { const t = await shopText(false); done.shopText = t ? (t.applied ? "updated" : "waiting for permission") : "current"; } catch (e) { done.shopText = e.message; }
  try { done.checkups = await require("./_listingfix").runCheckups(3, note); } catch (e) { done.checkups = e.message; }
  try { done.seo = await tuneSEO(2); } catch (e) { done.seo = e.message; }
  return done;
}

module.exports = async (req, res) => {
  const c = cfg(), q = req.query || {};
  try {
    if (req.method === "GET" && q.do === "cron") {
      if (!/vercel-cron/i.test(String(req.headers["user-agent"] || ""))) return res.status(401).json({ error: "Not allowed." });
      if (!c.db || !c.ai) return res.status(200).json({ skipped: "not set up" });
      return res.status(200).json(await runJob(false));
    }
    if (req.method === "GET" && q.do === "pconnect") {
      if (!codeOk(req, { code: q.code })) return res.status(401).send("Wrong or missing access code.");
      if (!P.configured()) { res.statusCode = 302; res.setHeader("Location", "/?pinterest=" + encodeURIComponent("Add the Pinterest app keys in Vercel first.") + "#marketing"); return res.end(); }
      const state = P.newState(); await P.savePlink({ state });
      res.statusCode = 302; res.setHeader("Location", P.connectURL(req.headers.host, state)); return res.end();
    }
    if (req.method === "GET") {
      if (!codeOk(req, { code: q.code })) return res.status(401).json({ error: "Wrong or missing access code.", code: "needs_code" });
      const w = Math.max(100, Math.min(3360, parseInt(q.w, 10) || 0)) || undefined;
      let png, name = "image.png";
      if (q.kind === "asset") { png = await assetPNG(String(q.name || "logo"), w); name = "bright-page-prints-" + String(q.name || "logo") + ".png"; }
      else if (q.kind === "pin") { const row = (await db("pins?id=eq." + parseInt(q.id, 10)))[0]; if (!row) return res.status(404).json({ error: "Pin not found" }); png = await pinPNG(row, w); name = "pin-" + row.id + ".png"; }
      else return res.status(400).json({ error: "Unknown kind." });
      res.setHeader("Content-Type", "image/png"); res.setHeader("Cache-Control", "private, max-age=900");
      if (q.download) res.setHeader("Content-Disposition", 'attachment; filename="' + name + '"');
      return res.status(200).send(png);
    }
    const body = readBody(req);
    if (!codeOk(req, body)) return res.status(401).json({ error: "Wrong or missing access code.", code: "needs_code" });
    if (body.action === "status") {
      const [st, pins, pl, log, seo] = await Promise.all([db("settings?id=eq.1"), db("pins?select=id,product_id,style,status,title,posted_at,note&order=id.desc&limit=40"), P.plink().catch(() => null),
        db("autopilot_log?select=at,text&kind=eq.marketing&order=id.desc&limit=12"), db("seo_changes?select=at,product_id,new_title,views_before,note&new_title=not.is.null&order=id.desc&limit=10")]);
      return res.status(200).json({ shopText: (st[0] || {}).shop_text || null, pins, pinterest: { configured: P.configured(), connected: !!(pl && pl.refresh_token), username: pl && pl.username }, log, seo, shopUrl: SHOP_URL });
    }
    if (body.action === "run") return res.status(200).json(await runJob(true));
    if (body.action === "shoptext.apply") return res.status(200).json(await shopText(true));
    return res.status(400).json({ error: "Unknown action." });
  } catch (e) { return res.status(500).json({ error: String(e.message || e) }); }
};
module.exports.runJob = runJob;
