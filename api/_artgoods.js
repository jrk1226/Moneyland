// Art Studio: makes the pictures for art packs (clipart, stickers, sublimation, labels) and for coloring books.
// ChatGPT draws, Claude checks every picture (7 out of 10 or better is kept). Work is spread over several
// timed runs, so big packs are finished a few pictures at a time. Pictures live in storage, not in the database.
const { db, claude, parseJSON } = require("./_lib");
const O = require("./_openai");
const SUPABASE_URL = process.env.SUPABASE_URL || "https://larxtghtrxcfadtqgcdz.supabase.co";

function headers(type) { const key = process.env.SUPABASE_SERVICE_KEY, h = { apikey: key }; if (!String(key).startsWith("sb_")) h.Authorization = "Bearer " + key; if (type) h["content-type"] = type; return h; }
async function put(path, buf, type) {
  const r = await fetch(SUPABASE_URL + "/storage/v1/object/media/" + path, { method: "POST", headers: Object.assign(headers(type), { "x-upsert": "true" }), body: buf });
  if (!r.ok) throw new Error("Storage error " + r.status);
}
async function get(path) {
  const r = await fetch(SUPABASE_URL + "/storage/v1/object/media/" + path, { headers: headers() });
  if (!r.ok) throw new Error("Storage read error " + r.status + " for " + path);
  return Buffer.from(await r.arrayBuffer());
}
const pool = async (list, n, fn) => { const out = new Array(list.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => { while (i < list.length) { const k = i++; try { out[k] = await fn(list[k], k); } catch (e) { out[k] = { error: e }; } } })); return out; };

// ---------- prompts ----------
function promptFor(spec, it) {
  const style = spec.style || "soft watercolor", k = spec.kind;
  if (k === "clipart" || k === "stickers") return "A single " + style + " clipart illustration of " + it.subject + ". One isolated subject, centered, fully inside the frame with space around it, on a plain pure white background. "
    + (k === "stickers" ? "Bold clean shapes that look good as a die-cut sticker. " : "") + "Professional Etsy clipart quality, consistent with a matching set. No shadow on the ground, no text, no letters, no border, no frame, no watermark, nothing else in the picture.";
  if (k === "sublimation") {
    if (spec.product === "shirt") return "A " + style + " t-shirt graphic design: " + it.subject + ". One centered design on a plain pure white background, bold and readable from a distance, crisp edges. Any words must be spelled exactly as given and nothing else. No mockup, no shirt, no watermark.";
    return "A seamless full-bleed " + style + " design for a " + (spec.product === "mug" ? "mug wrap" : "skinny tumbler wrap") + ": " + it.subject + ". The pattern fills the whole image edge to edge with no border and no empty margins, rich colors, crisp details. No mockup, no tumbler, no text unless given, no watermark.";
  }
  // labels: decorative art with an empty middle for the buyer's text
  return "A " + style + " decorative " + ((spec.shape === "rect") ? "rectangular label background, 2 to 1 wide" : "round label background, circular composition") + " themed around " + it.subject + ". "
    + "The decoration (flowers, leaves, botanicals or ornaments) stays around the outer edge, and the middle 60 percent is an empty soft light area where text will be typed. Elegant, high-end handmade product label look. No text, no letters, no watermark.";
}
function sizeFor(spec) {
  if (spec.kind === "sublimation") return spec.product === "tumbler" ? { size: "2048x1808", fallbackSize: "1536x1024" } : spec.product === "mug" ? { size: "2048x848", fallbackSize: "1536x1024" } : { size: "2048x2048", fallbackSize: "1024x1024" };
  if (spec.kind === "labels" && spec.shape === "rect") return { size: "2048x1024", fallbackSize: "1536x1024" };
  return { size: "2048x2048", fallbackSize: "1024x1024" };
}

// ---------- making one picture ----------
async function makeOne(prod, it, i) {
  const sharp = require("sharp"), spec = prod.spec;
  const { png, model } = await O.image(promptFor(spec, it), Object.assign({ quality: "medium" }, sizeFor(spec)));
  const clear = spec.kind === "clipart" || spec.kind === "stickers" || (spec.kind === "sublimation" && spec.product === "shirt");
  const full = clear ? await O.removeWhite(png) : await sharp(png).png().toBuffer();
  const thumb = await sharp(full).resize(600, 600, { fit: "inside" }).png().toBuffer();
  const v = Date.now() % 100000;
  await put("art/" + prod.id + "/" + i + "-" + v + ".png", full, "image/png");
  await put("art/" + prod.id + "/" + i + "-" + v + "-t.png", thumb, "image/png");
  return { file: "art/" + prod.id + "/" + i + "-" + v + ".png", thumbFile: "art/" + prod.id + "/" + i + "-" + v + "-t.png", model, thumb };
}
// Claude looks at up to 8 pictures at once.
async function review(spec, list) {
  const content = [];
  list.forEach((x, k) => { content.push({ type: "text", text: "Picture " + (k + 1) + " should show: " + x.it.subject }); content.push({ type: "image", source: { type: "base64", media_type: "image/png", data: x.thumb.toString("base64") } }); });
  content.push({ type: "text", text: "You check artwork for a " + spec.kind + " pack called \"" + spec.title + "\" that will be sold on Etsy. For each picture score 1-10: does it clearly show what it should, is it clean and professional, would a paying customer be happy? "
    + "Score 5 or less for: garbled or misspelled text, extra limbs or warped shapes, watermarks, cut-off subjects, messy backgrounds" + (spec.kind === "labels" ? ", or a busy middle with no room for text" : "") + ", brand logos or known characters. Reply with only JSON: {\"scores\": [{\"n\": 1, \"score\": 8, \"note\": \"short\"}]}" });
  const out = await claude({ tier: "smart", prompt: content, maxTokens: 1500 });
  const d = parseJSON(out.text), map = {};
  (d.scores || []).forEach(s => { map[parseInt(s.n, 10)] = { score: parseInt(s.score, 10) || 0, note: String(s.note || "").slice(0, 120) }; });
  return list.map((x, k) => map[k + 1] || { score: 0, note: "not reviewed" });
}

// ---------- coloring pages (books in the "kids" and "coloring" categories) ----------
function coloringJobs(spec) {
  const jobs = [];
  (spec.pages || []).forEach((pg, p) => { if (pg.template === "coloring") (pg.subjects || [pg]).forEach((sj, s) => { if (!sj.art && !sj.dropped && (sj.subject || sj.title)) jobs.push({ sj, key: p + "-" + s }); }); });
  return jobs;
}
async function drawColoring(prod, job) {
  const A = require("./_art"), audience = prod.spec.category === "coloring" ? "adults" : prod.spec.category === "kids" ? "kids ages 3 to 8" : "all ages";
  const art = O.configured() ? await O.coloringArt(job.sj.subject || job.sj.title, audience) : await A.drawOne(job.sj.subject || job.sj.title, audience);
  return art;
}

// ---------- cover illustration for page products (ChatGPT) ----------
function needsCover(spec) { return spec.category !== "artpack" && spec.category !== "wallart" && O.configured() && spec.coverArt && !spec.coverArt.ok && (spec.coverArt.tries || 0) < 2; }
async function makeCover(prod) {
  const sharp = require("sharp"), spec = prod.spec, c = spec.coverArt;
  const style = spec.category === "kids" || spec.category === "party" ? "cute, bright, friendly children's book" : spec.category === "coloring" ? "elegant detailed line-and-watercolor" : "soft modern watercolor";
  const { png, model } = await O.image("A " + style + " illustration for the cover of a printable called \"" + spec.title + "\": " + (c.subject || spec.title) + ". One centered subject on a plain pure white background, no text, no letters, no border, no watermark.", { size: "1024x1024", quality: "medium" });
  const full = await O.removeWhite(png), thumb = await sharp(full).resize(600, 600, { fit: "inside" }).png().toBuffer();
  const v = Date.now() % 100000, file = "art/" + prod.id + "/cover-" + v + ".png";
  await put(file, thumb, "image/png");
  return { file, thumb, model };
}

// ---------- one timed run ----------
const MIN_KEEP = { clipart: 8, stickers: 8, sublimation: 1, labels: 1 };
async function work(prod, deadline, note) {
  const spec = prod.spec;
  if (spec.category === "artpack") {
    const todo = (spec.items || []).map((it, i) => ({ it, i })).filter(x => !x.it.ok && (x.it.tries || 0) < 2);
    const batch = [];
    for (const x of todo) { if (Date.now() > deadline - 90000 || batch.length >= 8) break; batch.push(x); }
    const made = await pool(batch, 3, x => Date.now() < deadline - 70000 ? makeOne(prod, x.it, x.i) : Promise.reject(new Error("out of time")));
    const good = [];
    made.forEach((m, k) => { const x = batch[k]; x.it.tries = (x.it.tries || 0) + 1; if (m && !m.error) { x.thumb = m.thumb; x.m = m; good.push(x); } else x.it.error = String(m && m.error && m.error.message || "failed").slice(0, 120); });
    if (good.length) { const scores = await review(spec, good).catch(() => good.map(() => ({ score: 0, note: "check failed" })));
      good.forEach((x, k) => { const sc = scores[k]; x.it.score = sc.score; x.it.note = sc.note; if (sc.score >= 7) { x.it.ok = true; x.it.file = x.m.file; x.it.thumbFile = x.m.thumbFile; x.it.by = x.m.model; delete x.it.error; } }); }
    const capHit = made.some(m => m && m.error && m.error.cap);
    const left = (spec.items || []).filter(it => !it.ok && (it.tries || 0) < 2).length, ok = (spec.items || []).filter(it => it.ok).length;
    let status = "building";
    if (!left) status = ok >= (MIN_KEEP[spec.kind] || 1) ? "review" : "archived";
    if (status === "review") spec.items = spec.items.filter(it => it.ok);
    await db("products?id=eq." + prod.id, { method: "PATCH", body: { spec, status, qa_note: status === "archived" ? "Not enough good pictures came out (" + ok + "). Set aside." : null } });
    if (status !== "building") await note(status === "review" ? "built" : "error", (status === "review" ? "Art Studio finished \"" : "Art Studio set aside \"") + spec.title + "\": " + ok + " pictures kept" + (status === "review" ? ", now waiting for the quality check." : " (not enough good ones)."));
    return { product: prod.id, made: good.length, kept: good.filter(x => x.it.ok).length, left, status, capHit };
  }
  // page products: the cover illustration first
  if (needsCover(spec)) {
    spec.coverArt.tries = (spec.coverArt.tries || 0) + 1;
    try { const m = await makeCover(prod), sc = (await review(spec, [{ it: { subject: "a cover illustration of " + (spec.coverArt.subject || spec.title) }, thumb: m.thumb }]))[0];
      spec.coverArt.score = sc.score; if (sc.score >= 7) { spec.coverArt.ok = true; spec.coverArt.file = m.file; spec.coverArt.by = m.model; } }
    catch (e) { spec.coverArt.error = String(e.message).slice(0, 120); }
  }
  // coloring books
  const jobs = coloringJobs(spec), batch = jobs.slice(0, 6);
  const drawn = await pool(batch, 3, j => Date.now() < deadline - 60000 ? drawColoring(prod, j) : Promise.reject(new Error("out of time")));
  const A = require("./_art"), good = [];
  drawn.forEach((d, k) => { const j = batch[k]; j.sj.tries = (j.sj.tries || 0) + 1; if (d && !d.error) { j.art = d; good.push(j); } else if (j.sj.tries >= 2) j.sj.dropped = true; });
  if (good.length) {
    let reviewed = [];
    try { reviewed = await A.review(good.map(j => ({ subject: j.sj.subject || j.sj.title, art: j.art }))); } catch (e) { reviewed = good.map(() => ({ score: 0 })); }
    for (let k = 0; k < good.length; k++) {
      const j = good[k];
      if ((reviewed[k] || {}).score >= 7) {
        if (j.art.mode === "filled") { const path = "art/" + prod.id + "/col-" + j.key + "-" + (Date.now() % 100000) + ".txt"; await put(path, Buffer.from(j.art.paths.join("\n")), "text/plain"); j.sj.art = { mode: "filled", viewBox: j.art.viewBox, ref: path, by: j.art.by }; }
        else j.sj.art = j.art;
      } else if (j.sj.tries >= 2) j.sj.dropped = true;
    }
  }
  const left = coloringJobs(spec).length + (needsCover(spec) ? 1 : 0);
  let status = "building";
  if (!left) {
    (spec.pages || []).forEach(pg => { if (pg.template === "coloring" && pg.subjects) pg.subjects = pg.subjects.filter(sj => sj.art); });
    spec.pages = (spec.pages || []).filter(pg => pg.template !== "coloring" || (pg.subjects ? pg.subjects.length : pg.art));
    const pagesLeft = (spec.pages || []).reduce((n, pg) => n + (pg.template === "coloring" ? (pg.subjects || []).length : 1), 0);
    status = pagesLeft >= 4 || !coloringBook(spec) ? "review" : "archived";
    try { const B = require("../lib/design/book"); await hydrate(spec); spec.pageCount = B.build(spec).pages.length; } catch (e) {}
    await note(status === "review" ? "built" : "error", "Art Studio finished the pictures for \"" + spec.title + "\"" + (status === "review" ? ", now waiting for the quality check." : " but too few came out well; set aside."));
  }
  await db("products?id=eq." + prod.id, { method: "PATCH", body: { spec: stripHydrated(spec), status } });
  return { product: prod.id, made: good.length, left, status };
}
function coloringBook(spec) { return (spec.pages || []).some(pg => pg.template === "coloring") || spec.category === "coloring"; }
function stripHydrated(spec) { return JSON.parse(JSON.stringify(spec)); } // hydrated data is non-enumerable, so it is not saved

// Loads the pictures a spec needs for rendering. full=true also loads the full-size files (for downloads).
async function hydrate(spec, opts = {}) {
  if (!spec) return spec;
  if (spec.category === "artpack") {
    if (!spec._img) Object.defineProperty(spec, "_img", { value: {}, enumerable: false, writable: true });
    await pool((spec.items || []).map((it, i) => ({ it, i })).filter(x => x.it.ok && x.it.file), 6, async x => {
      const cur = spec._img[x.i] || {};
      if (!cur.thumb) cur.thumb = await get(x.it.thumbFile || x.it.file);
      if (opts.full && !cur.full) cur.full = await get(x.it.file);
      spec._img[x.i] = cur;
    });
    return spec;
  }
  if (spec.coverArt && spec.coverArt.ok && spec.coverArt.file && !spec._cover) { try { Object.defineProperty(spec, "_cover", { value: await get(spec.coverArt.file), enumerable: false, writable: true }); } catch (e) {} }
  const refs = [];
  (spec.pages || []).forEach(pg => (pg.subjects || [pg]).forEach(sj => { if (sj.art && sj.art.ref && !sj.art._paths) refs.push(sj.art); }));
  await pool(refs, 6, async art => { const txt = (await get(art.ref)).toString(); Object.defineProperty(art, "_paths", { value: txt.split("\n").filter(Boolean), enumerable: false, writable: true }); });
  return spec;
}
function needsArt(spec) {
  if (spec.category === "artpack") return (spec.items || []).some(it => !it.ok);
  return coloringJobs(spec).length > 0 || needsCover(spec);
}
module.exports = { work, hydrate, needsArt, promptFor };
