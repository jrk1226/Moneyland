// Photo Studio: realistic lifestyle listing photos and the listing video.
// An AI photographer (OpenAI images) makes empty styled backgrounds once and keeps them in a library.
// Moneyland then lays the REAL product pages onto them, so the photo always shows exactly what the buyer gets.
// Claude looks at every background and every finished photo and throws out anything that is not good.
const { db, claudeJSON } = require("./_lib");
const openaiKey = () => process.env.OPENAI_API_KEY || process.env.Open_AI || process.env.OPEN_AI || process.env.OPENAI_KEY || "";
const OUT = require("../lib/design/output");
const SUPABASE_URL = process.env.SUPABASE_URL || "https://larxtghtrxcfadtqgcdz.supabase.co";
const BUCKET = "media";
const PW = 2400, PH = 1800; // Etsy photo size (4:3)

const imagesConfigured = () => !!openaiKey();

// ---------- storage ----------
function storeHeaders(type) {
  const key = process.env.SUPABASE_SERVICE_KEY, h = { apikey: key };
  if (!String(key).startsWith("sb_")) h.Authorization = "Bearer " + key;
  if (type) h["content-type"] = type;
  return h;
}
async function putFile(path, buf, type) {
  const r = await fetch(SUPABASE_URL + "/storage/v1/object/" + BUCKET + "/" + path, { method: "POST", headers: Object.assign(storeHeaders(type), { "x-upsert": "true", "cache-control": "3600" }), body: buf });
  if (!r.ok) throw new Error("Storage error " + r.status + ": " + (await r.text()).slice(0, 200));
  return publicURL(path);
}
async function getFile(path) {
  const r = await fetch(SUPABASE_URL + "/storage/v1/object/" + BUCKET + "/" + path, { headers: storeHeaders() });
  if (!r.ok) throw new Error("Storage read error " + r.status);
  return Buffer.from(await r.arrayBuffer());
}
const publicURL = path => SUPABASE_URL + "/storage/v1/object/public/" + BUCKET + "/" + path;

// ---------- moods: what kind of styled scene suits a product ----------
const MOODS = {
  christmas: { kind: "flat", surface: "white-washed wooden table", props: "pine sprigs, a few red and gold ornaments, a small wrapped gift with twine, a mug of cocoa, warm fairy lights, a couple of crayons" },
  thanksgiving: { kind: "flat", surface: "warm oak wooden table", props: "small pumpkins, dried autumn leaves in orange and red, a few pinecones, a linen napkin, a couple of colored pencils" },
  halloween: { kind: "flat", surface: "dark slate table", props: "mini pumpkins, candy corn in a small bowl, a cozy knit blanket corner, a few orange crayons" },
  kids: { kind: "flat", surface: "light birch wooden table", props: "a jar of colored pencils, loose crayons, a small pencil sharpener, a juice cup, a couple of wooden toy blocks" },
  teacher: { kind: "flat", surface: "light wooden classroom desk", props: "a red apple, a cup of sharpened pencils, a stack of sticky notes, paper clips, a small succulent" },
  planner: { kind: "flat", surface: "clean white desk", props: "a latte in a ceramic cup, a gold pen, a small potted plant, a pair of glasses, a few paper clips" },
  budget: { kind: "flat", surface: "clean white marble desk", props: "a calculator, a cup of coffee, a gold pen, a small plant, a few coins in a small dish" },
  party: { kind: "flat", surface: "pastel pink tabletop", props: "colorful confetti, a few balloons at the edge, party straws, a cupcake, curling ribbon" },
  baby: { kind: "flat", surface: "soft cream linen tablecloth", props: "pale sage and blush flowers, a tiny knit baby sock pair, a pacifier, a gold pen" },
  faith: { kind: "flat", surface: "soft linen on a light wooden table", props: "a small candle, dried eucalyptus, a cup of tea, a pen, a few pressed flowers" },
  care: { kind: "flat", surface: "calm light wooden table", props: "a cup of tea, reading glasses, a pen, a small green plant, a soft folded blanket corner" },
  wall: { kind: "wall", surface: "", props: "" },
};
function moodOf(spec) {
  const t = [spec.title, spec.subtitle, ((spec.listing || {}).tags || []).join(" ")].join(" ").toLowerCase();
  if (spec.category === "wallart") return "wall";
  if (/christmas|advent|santa|holiday|xmas/.test(t)) return "christmas";
  if (/thanksgiving|turkey|fall|autumn|harvest/.test(t)) return "thanksgiving";
  if (/halloween|spooky/.test(t)) return "halloween";
  if (/bible|devotional|faith|prayer|scripture|church/.test(t)) return "faith";
  if (/caregiver|medical|health log|medication/.test(t)) return "care";
  if (/teacher|classroom|lesson/.test(t)) return "teacher";
  if (/budget|finance|money|debt|savings|expense/.test(t)) return "budget";
  if (/baby|shower|nursery/.test(t)) return "baby";
  if (spec.category === "party" || /party|birthday|bridal|wedding/.test(t)) return "party";
  if (spec.category === "kids") return "kids";
  return "planner";
}
function scenePrompt(mood, variant) {
  const m = MOODS[mood];
  if (m.kind === "wall") {
    const rooms = ["a bright Scandinavian living room: a light linen sofa and a small side table with a plant at the bottom of the frame",
      "a calm bedroom: the top of a wooden headboard and two small bedside lamps at the bottom of the frame",
      "a cozy entryway: a slim oak console table with a vase of dried pampas grass at the bottom of the frame"];
    return "Interior design photograph, straight-on eye-level view of a wall in " + rooms[variant % rooms.length] + ". "
      + "The top two thirds of the image is a large completely empty plain painted wall in warm off-white, with nothing on it at all: no frames, no art, no shelves, no lights, no text. "
      + "Soft natural daylight, gentle realistic shadows, photorealistic, magazine quality. No people, no text, no logos.";
  }
  const angle = ["shot straight down from directly above (top-down flat lay)", "shot straight down from directly above (top-down flat lay), props a little sparser"][variant % 2];
  return "Professional product photograph for an Etsy shop, " + angle + ". A " + m.surface + ". "
    + "Props placed ONLY around the outer edges and corners of the frame: " + m.props + ". "
    + "The whole central area of the image (the middle 60 percent, both across and up and down) is completely empty bare tabletop with nothing on it: no paper, no objects, no shadows of objects, no text. "
    + "Soft natural window light from the upper left, soft realistic shadows, warm and inviting, photorealistic, high detail. No people, no hands, no text, no letters, no logos, no brand names.";
}

// ---------- AI photographer (ChatGPT) ----------
async function aiImage(prompt) { return require("./_openai").image(prompt, { size: "1536x1024", quality: "medium" }); }
// Claude looks at a picture and scores it.
async function lookAt(png, question) {
  const sharp = require("sharp");
  const small = await sharp(png).resize(1200, null, { withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  let d;
  try { d = (await claudeJSON({ tier: "smart", maxTokens: 1200, prompt: [
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: small.toString("base64") } },
    { type: "text", text: question + "\nAnswer with nothing but this JSON, no other words: {\"score\": <whole number 1-10>, \"note\": \"<short reason>\"}" }] })).data; }
  catch (e) { return { score: 0, note: "picture check did not answer: " + String(e.message).slice(0, 120) }; }
  return { score: parseInt(d.score, 10) || 0, note: String(d.note || "").slice(0, 200) };
}
async function makeScene(mood) {
  const have = await db("scenes?select=id&mood=eq." + mood);
  const variant = have.length;
  const prompt = scenePrompt(mood, variant);
  const { png, model } = await aiImage(prompt);
  const wall = MOODS[mood].kind === "wall";
  const path = "scenes/" + mood + "-" + Date.now() + ".png";
  await putFile(path, png, "image/png");
  const check = await lookAt(png, wall
    ? "This is meant to be an empty interior wall where framed art prints will be added later. Score it: is the top two thirds a large plain empty wall with nothing on it, is it realistic, attractive and free of text, logos, warped furniture or AI mistakes?"
    : "This is meant to be a styled overhead tabletop photo where printed paper pages will be laid in the middle later. Score it: is the central 60 percent completely empty plain surface, are the props only around the edges, is it realistic and attractive, and is it free of text, logos, melted or warped objects and other AI mistakes?");
  const row = { mood, kind: MOODS[mood].kind, prompt, path, score: check.score, note: check.note, model, ok: check.score >= 7 };
  await db("scenes", { method: "POST", prefer: "return=minimal", body: [row] });
  return row;
}
async function sceneFor(mood, n, allowNew) {
  let list = await db("scenes?select=*&ok=eq.true&mood=eq." + mood + "&order=uses.asc,id.asc");
  const tries = await db("scenes?select=id&mood=eq." + mood);
  if (allowNew && list.length < n && tries.length < n + 4) { const s = await makeScene(mood); if (s.ok) list = await db("scenes?select=*&ok=eq.true&mood=eq." + mood + "&order=uses.asc,id.asc"); }
  return list.slice(0, n);
}

// ---------- compositing the real product onto a scene ----------
async function pageImage(svg, w) {
  const sharp = require("sharp");
  return sharp(Buffer.from(OUT.png(svg, w))).flatten({ background: "#ffffff" }).png().toBuffer();
}
async function withShadow(img, angle) {
  const sharp = require("sharp");
  const m = await sharp(img).metadata(), pad = Math.round(m.width * 0.08);
  const W = m.width + pad * 2, H = m.height + pad * 2;
  const shadow = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="${pad + m.width * 0.012}" y="${pad + m.width * 0.022}" width="${m.width}" height="${m.height}" fill="rgba(30,20,10,0.38)"/></svg>`) }])
    .blur(Math.max(4, m.width * 0.018)).png().toBuffer();
  const layered = await sharp(shadow).composite([{ input: img, left: pad, top: pad }]).png().toBuffer();
  return angle ? sharp(layered).rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer() : layered;
}
async function sceneBase(scenePng) {
  const sharp = require("sharp");
  const m = await sharp(scenePng).metadata(), cw = Math.min(m.width, Math.round(m.height * 4 / 3));
  return sharp(scenePng).extract({ left: Math.round((m.width - cw) / 2), top: 0, width: cw, height: m.height }).resize(PW, PH).removeAlpha().png().toBuffer();
}
async function place(base, layers) {
  const sharp = require("sharp");
  const ready = [];
  for (const L of layers) { const m = await sharp(L.img).metadata(); ready.push({ input: L.img, left: Math.round(L.cx - m.width / 2), top: Math.round(L.cy - m.height / 2) }); }
  return sharp(base).composite(ready).png().toBuffer();
}
function productPages(spec) {
  const B = require("../lib/design/book");
  const b = B.build(spec), pages = b.pages.filter(c => c.label !== "What's inside" && !c.key);
  return pages.map(c => ({ svg: c.page.svg(c.page.bg), land: c.page.w > c.page.h, label: c.label }));
}
// Layout 1: the cover with two pages fanned out behind it. Layout 2: three pages side by side.
async function flatLayouts(spec, scenePng, which) {
  const base = await sceneBase(scenePng), pages = productPages(spec), port = pages.filter(p => !p.land);
  const pick = port.length ? port : pages;
  const H1 = 1080, w1 = Math.round(H1 * 612 / 792);
  if (which === 1) {
    const back = pick.slice(1, 3), layers = [];
    if (back[1]) layers.push({ img: await withShadow(await pageImage(back[1].svg, w1), 9), cx: PW / 2 + 330, cy: PH / 2 + 10 });
    if (back[0]) layers.push({ img: await withShadow(await pageImage(back[0].svg, w1), -8), cx: PW / 2 - 330, cy: PH / 2 + 20 });
    layers.push({ img: await withShadow(await pageImage(pick[0].svg, w1), -1.5), cx: PW / 2, cy: PH / 2 });
    return place(base, layers);
  }
  const three = (pick.length > 3 ? [pick[1], pick[Math.floor(pick.length / 2)], pick[pick.length - 1]] : pick).slice(0, 3);
  const H2 = 900, w2 = Math.round(H2 * 612 / 792), gap = 60, total = three.length * w2 + (three.length - 1) * gap, layers = [];
  for (let i = 0; i < three.length; i++) layers.push({ img: await withShadow(await pageImage(three[i].svg, w2), [-2.5, 1, 2.5][i] || 0), cx: PW / 2 - total / 2 + w2 / 2 + i * (w2 + gap), cy: PH / 2 + 10 });
  return place(base, layers);
}
async function wallLayout(spec, scenePng) {
  const sharp = require("sharp");
  const WA = require("../lib/design/wallart");
  const base = await sceneBase(scenePng), prints = (spec.prints || []).slice(0, 3);
  const n = Math.max(1, prints.length), fh = n === 1 ? 900 : 640, fw = Math.round(fh * 3 / 4), gap = 90, total = n * fw + (n - 1) * gap, layers = [];
  for (let i = 0; i < prints.length; i++) {
    const a = WA.artSVG(prints[i], spec.palette, "3x4");
    const art = await sharp(Buffer.from(OUT.png(a.svg, fw - 120))).resize(fw - 120, fh - 120, { fit: "cover" }).png().toBuffer();
    const frame = await sharp({ create: { width: fw, height: fh, channels: 4, background: { r: 34, g: 30, b: 28, alpha: 1 } } })
      .composite([{ input: await sharp({ create: { width: fw - 36, height: fh - 36, channels: 4, background: { r: 252, g: 251, b: 248, alpha: 1 } } }).png().toBuffer(), left: 18, top: 18 }, { input: art, left: 60, top: 60 }]).png().toBuffer();
    layers.push({ img: await withShadow(frame, 0), cx: PW / 2 - total / 2 + fw / 2 + i * (fw + gap), cy: PH * 0.36 });
  }
  return place(base, layers);
}
// Makes up to 2 lifestyle photos for a product. Returns [{png, url, note}] (may be empty).
async function lifestylePhotos(prod, deadline) {
  const spec = prod.spec || {}, mood = moodOf(spec), wall = mood === "wall";
  const scenes = await sceneFor(mood, 2, Date.now() < deadline - 120000);
  const out = [];
  for (let i = 0; i < scenes.length && i < 2; i++) {
    if (Date.now() > deadline - 60000) break;
    const sc = scenes[i], png = await getFile(sc.path);
    const photo = wall ? await wallLayout(spec, png) : await flatLayouts(spec, png, i === 0 ? 1 : 2);
    const check = await lookAt(photo, "This is an Etsy listing photo of a printable product (" + (spec.title || "") + ") laid onto a styled background. Score it: does it look like a real, natural, attractive product photo; do the pages sit cleanly on empty space without covering props in a strange way; is anything broken, cut off or odd?");
    await db("scenes?id=eq." + sc.id, { method: "PATCH", body: { uses: (sc.uses || 0) + 1 } });
    if (check.score < 7) continue;
    const sharp = require("sharp");
    const jpg = await sharp(photo).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    const url = await putFile("listings/" + prod.id + "/lifestyle-" + (i + 1) + ".jpg", jpg, "image/jpeg");
    out.push({ jpg, url, note: check.note });
  }
  return out;
}

// ---------- updating the Etsy listing ----------
// Photo order: lifestyle 1 (the thumbnail), the designed hero, inside pages ..., lifestyle 2 near the end. Max 10.
async function replacePhotos(prod, lifestyle) {
  const { etsy, link } = require("./_etsy");
  const R = require("./_render");
  const l = await link(), lid = prod.etsy_listing_id, base = "/application/shops/" + l.shop_id + "/listings/" + lid;
  const designed = R.listingImages(prod.spec).map(b => ({ buf: b, type: "image/png", name: "photo.png" }));
  const ls = lifestyle.map(x => ({ buf: x.jpg, type: "image/jpeg", name: "lifestyle.jpg" }));
  const order = [].concat(ls.slice(0, 1), designed.slice(0, 1), designed.slice(1, designed.length - 1), ls.slice(1, 2), designed.slice(-1)).slice(0, 10);
  const old = ((await etsy("/application/listings/" + lid + "/images")).results || []).map(x => x.listing_image_id);
  // keep one old photo until the new ones are in, so the listing is never without photos
  for (const id of old.slice(1)) await etsy(base + "/images/" + id, { method: "DELETE" }).catch(() => {});
  for (let i = 0; i < order.length; i++) {
    const f = new FormData(); f.append("image", new Blob([order[i].buf], { type: order[i].type }), "listing-photo-" + (i + 1) + (order[i].type === "image/jpeg" ? ".jpg" : ".png")); f.append("rank", String(i + 1));
    await etsy(base + "/images", { method: "POST", body: f });
  }
  if (old[0]) await etsy(base + "/images/" + old[0], { method: "DELETE" }).catch(() => {});
  return order.length;
}
// The whole job for one live product: lifestyle photos (if the picture AI key is there) and the video.
const MEDIA_VERSION = 1;
async function upgradeListing(prod, deadline, note) {
  const V = require("./_video");
  const media = Object.assign({}, prod.media || {});
  let lifestyle = [];
  if (imagesConfigured() && !media.lifestyle_done) {
    try { lifestyle = await lifestylePhotos(prod, deadline); media.lifestyle_done = true; media.lifestyle = lifestyle.map(x => x.url); }
    catch (e) { media.lifestyle_error = String(e.message).slice(0, 200); media.lifestyle_fails = (media.lifestyle_fails || 0) + 1;
      if (e.status === 401 || e.status === 429 || media.lifestyle_fails >= 3) media.lifestyle_blocked_at = new Date().toISOString();
      await note("Studio: lifestyle photos for \"" + prod.spec.title + "\" did not work this time (" + media.lifestyle_error + ")."); }
    if (lifestyle.length) { const n = await replacePhotos(prod, lifestyle); await note("Studio: added " + lifestyle.length + " lifestyle photo" + (lifestyle.length > 1 ? "s" : "") + " to \"" + prod.spec.title + "\" (" + n + " photos on the listing now)."); }
  }
  if (!media.video_id && Date.now() < deadline - 70000) {
    const { mp4, seconds } = await V.listingVideo(prod.spec, { lifestyle: lifestyle.map(x => x.jpg) });
    const name = String(prod.spec.title || "printable").replace(/[^A-Za-z0-9]+/g, "-").slice(0, 50);
    const up = await V.uploadVideo(prod.etsy_listing_id, mp4, name);
    media.video_id = up && up.video_id; media.video_seconds = Math.round(seconds * 10) / 10;
    try { media.video = await putFile("listings/" + prod.id + "/video.mp4", mp4, "video/mp4"); } catch (e) {}
    await note("Studio: made a " + Math.round(seconds) + "-second video for \"" + prod.spec.title + "\" and added it to the Etsy listing.");
  }
  // Etsy rule: say in the description that AI tools were used
  if (!media.disclosed) {
    try { const { etsy, link } = require("./_etsy"), R = require("./_render"), l = await link();
      await etsy("/application/shops/" + l.shop_id + "/listings/" + prod.etsy_listing_id, { method: "PATCH", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ description: R.listingDesc(prod.spec).slice(0, 60000) }).toString() });
      media.disclosed = true; } catch (e) { media.disclose_error = String(e.message).slice(0, 160); media.disclose_tries = (media.disclose_tries || 0) + 1; }
  }
  media.version = MEDIA_VERSION; media.at = new Date().toISOString();
  await db("products?id=eq." + prod.id, { method: "PATCH", body: { media } });
  return media;
}
// Which live product needs the studio next.
async function nextForStudio() {
  const live = await db("products?select=*&etsy_state=eq.active&order=published_at.asc");
  const key = imagesConfigured();
  return live.find(p => { const m = p.media || {}; if (m.failures >= 3 && Date.now() - new Date(m.failed_at || 0).getTime() < 86400000) return false;
    return !m.video_id || (!m.disclosed && (m.disclose_tries || 0) < 3) || (key && !m.lifestyle_done && !(m.lifestyle_blocked_at && Date.now() - new Date(m.lifestyle_blocked_at).getTime() < 6 * 3600000)); }) || null;
}
module.exports = { upgradeListing, nextForStudio, imagesConfigured, moodOf, lifestylePhotos, flatLayouts, wallLayout, sceneBase, putFile, publicURL, MEDIA_VERSION };
