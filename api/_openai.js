// ChatGPT (OpenAI) helpers. House rule: ChatGPT CREATES content (pictures, artwork, title ideas, review notes),
// Claude RUNS everything and makes every final decision.
const key = () => process.env.OPENAI_API_KEY || process.env.Open_AI || process.env.OPEN_AI || process.env.OPENAI_KEY || "";
const configured = () => !!key();

function apiError(d, r) { const e = new Error("ChatGPT: " + ((d && d.error && d.error.message) || r.status)); e.status = r.status; return e; }

// ---------- pictures ----------
const IMAGE_MODELS = () => (process.env.OPENAI_IMAGE_MODEL ? [process.env.OPENAI_IMAGE_MODEL] : []).concat(["gpt-image-2", "gpt-image-1.5", "gpt-image-1"]);
let goodImageModel = null;
// Daily picture limit (settings.max_images_per_day, default 80) so the bill can never run away.
async function countImage() {
  const { db } = require("./_lib"), day = new Date().toISOString().slice(0, 10);
  const st = (await db("settings?select=max_images_per_day&id=eq.1"))[0] || {}, cap = st.max_images_per_day == null ? 80 : st.max_images_per_day;
  const row = (await db("ai_usage?day=eq." + day))[0];
  if ((row ? row.images : 0) >= cap) { const e = new Error("Daily picture limit reached (" + cap + "). More tomorrow."); e.status = 429; e.cap = true; throw e; }
  await db("ai_usage?on_conflict=day", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: [{ day, images: (row ? row.images : 0) + 1 }] });
}
async function image(prompt, opts = {}) {
  await countImage();
  let last;
  for (const model of goodImageModel ? [goodImageModel] : IMAGE_MODELS()) {
    for (const size of [opts.size || "1024x1024"].concat(opts.size && opts.size !== "1024x1024" ? [opts.fallbackSize || "1024x1024"] : [])) {
      const r = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST", headers: { Authorization: "Bearer " + key(), "content-type": "application/json" },
        body: JSON.stringify({ model, prompt, size, quality: opts.quality || "medium", n: 1 }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.data && d.data[0] && d.data[0].b64_json) { goodImageModel = model; return { png: Buffer.from(d.data[0].b64_json, "base64"), model, size }; }
      last = apiError(d, r);
      if (r.status === 401 || r.status === 429 || /billing|quota|safety|moderation/i.test(last.message)) throw last;
      if (!/size/i.test(last.message)) break; // only a size problem is worth retrying at a smaller size
    }
  }
  throw last;
}
// Makes the plain white background around a picture see-through (flood fill from the edges).
async function removeWhite(png) {
  const sharp = require("sharp");
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, seen = new Uint8Array(W * H), stack = [];
  const white = i => data[i * 4] > 232 && data[i * 4 + 1] > 232 && data[i * 4 + 2] > 232;
  for (let x = 0; x < W; x++) { stack.push(x, (H - 1) * W + x); } for (let y = 0; y < H; y++) { stack.push(y * W, y * W + W - 1); }
  while (stack.length) { const i = stack.pop(); if (seen[i] || !white(i)) continue; seen[i] = 1; data[i * 4 + 3] = 0;
    const x = i % W; if (x > 0) stack.push(i - 1); if (x < W - 1) stack.push(i + 1); if (i >= W) stack.push(i - W); if (i < W * (H - 1)) stack.push(i + W); }
  // soften the edge: light pixels touching the cleared area become partly see-through
  for (let i = 0; i < W * H; i++) { if (seen[i]) continue; const x = i % W;
    const near = (x > 0 && seen[i - 1]) || (x < W - 1 && seen[i + 1]) || (i >= W && seen[i - W]) || (i < W * (H - 1) && seen[i + W]);
    if (near) { const l = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3; if (l > 200) data[i * 4 + 3] = Math.round(255 * (255 - l) / 55); } }
  return sharp(data, { raw: { width: W, height: H, channels: 4 } }).trim({ threshold: 1 }).png().toBuffer();
}

// ---------- writing / reviewing ----------
let textModel = null;
async function pickTextModel() {
  if (process.env.OPENAI_TEXT_MODEL) return process.env.OPENAI_TEXT_MODEL;
  if (textModel) return textModel;
  try {
    const r = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: "Bearer " + key() } });
    const d = await r.json();
    const ids = (d.data || []).map(m => m.id).filter(id => /^gpt-\d/.test(id) && !/image|audio|realtime|transcribe|tts|search|codex|oss|nano|instruct|\d{4}-\d{2}-\d{2}/.test(id));
    const ver = id => { const m = id.match(/^gpt-(\d+)(?:\.(\d+))?/); return m ? Number(m[1]) * 100 + Number(m[2] || 0) : 0; };
    ids.sort((a, b) => ver(b) - ver(a) || (/mini/.test(a) ? 1 : 0) - (/mini/.test(b) ? 1 : 0) || a.length - b.length);
    textModel = ids[0] || "gpt-4.1";
  } catch (e) { textModel = "gpt-4.1"; }
  return textModel;
}
// content: string or array of {type:"text",text} / {type:"image", png|jpg: Buffer}
async function chatJSON(content, opts = {}) {
  const model = await pickTextModel();
  const parts = typeof content === "string" ? [{ type: "text", text: content }] : content.map(c => c.type === "image"
    ? { type: "image_url", image_url: { url: "data:image/" + (c.jpg ? "jpeg" : "png") + ";base64," + (c.jpg || c.png).toString("base64") } } : { type: "text", text: c.text });
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST", headers: { Authorization: "Bearer " + key(), "content-type": "application/json" },
    body: JSON.stringify({ model, response_format: { type: "json_object" }, max_completion_tokens: opts.maxTokens || 3000,
      messages: [{ role: "system", content: "You work for Bright Page Prints, an Etsy shop of printable digital downloads. Claude is your manager and makes the final decisions; give your best honest work. Never use emojis. Reply with JSON only." }, { role: "user", content: parts }] }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw apiError(d, r);
  const text = (((d.choices || [])[0] || {}).message || {}).content || "";
  try { return JSON.parse(text); } catch (e) { const m = text.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); throw new Error("ChatGPT did not return JSON"); }
}

// ---------- coloring page artwork: ChatGPT draws, the drawing is traced into crisp vector lines ----------
async function coloringArt(subject, audience) {
  const sharp = require("sharp"), adult = /adult/i.test(audience || "");
  const prompt = adult
    ? "A detailed coloring page for adults: " + subject + ". Intricate clean black line art on a pure white background, in the style of a premium adult coloring book: elegant detailed patterns, decorative shapes and fine details that fill the whole page, many small areas to color. Crisp even line weight. No shading, no gray tones, no color, no solid black areas, no text, no letters, no border or frame."
    : "A coloring book page for " + (audience || "kids ages 3 to 8") + ": " + subject + ". "
    + "Clean bold black outlines on a pure white background, cute friendly cartoon style like a professional children's coloring book. "
    + "The main subject is large and centered, with a few simple background details that fit the scene (ground, grass, clouds, stars, small flowers). "
    + "Large open areas that are easy to color. No shading, no gray tones, no hatching, no color, no filled black areas, no text, no letters, no border or frame.";
  const { png, model } = await image(prompt, adult ? { size: "1536x2048", fallbackSize: "1024x1536", quality: "medium" } : { size: "1024x1024", quality: "medium" });
  // pure black and white, then trace
  const bw = await sharp(png).flatten({ background: "#ffffff" }).grayscale().resize(1024, adult ? 1365 : 1024, { fit: "fill" }).threshold(170).png().toBuffer();
  const d = await trace(bw);
  if (!d || d.length < 400) throw new Error("drawing came out empty");
  return { viewBox: [0, 0, 1024, adult ? 1365 : 1024], paths: [d], mode: "filled", by: model };
}
function trace(pngBuf) {
  const potrace = require("potrace");
  return new Promise((resolve, reject) => {
    potrace.trace(pngBuf, { threshold: 128, turdSize: 12, optTolerance: 0.6, color: "#000000", background: "transparent" }, (err, svg) => {
      if (err) return reject(err);
      const ds = []; const re = /\sd="([^"]+)"/g; let m; while ((m = re.exec(svg))) ds.push(m[1]);
      // round to whole units (1/1024 of the picture) to keep files small
      resolve(ds.join(" ").replace(/-?\d+\.\d+/g, n => String(Math.round(Number(n)))).replace(/\s+/g, " ").trim());
    });
  });
}

module.exports = { configured, key, image, removeWhite, chatJSON, pickTextModel, coloringArt, trace };
