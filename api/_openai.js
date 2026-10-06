// ChatGPT (OpenAI) helpers. House rule: ChatGPT CREATES content (pictures, artwork, title ideas, review notes),
// Claude RUNS everything and makes every final decision.
const key = () => process.env.OPENAI_API_KEY || process.env.Open_AI || process.env.OPEN_AI || process.env.OPENAI_KEY || "";
const configured = () => !!key();

function apiError(d, r) { const e = new Error("ChatGPT: " + ((d && d.error && d.error.message) || r.status)); e.status = r.status; return e; }

// ---------- pictures ----------
const IMAGE_MODELS = () => (process.env.OPENAI_IMAGE_MODEL ? [process.env.OPENAI_IMAGE_MODEL] : []).concat(["gpt-image-2", "gpt-image-1.5", "gpt-image-1"]);
let goodImageModel = null;
async function image(prompt, opts = {}) {
  let last;
  for (const model of goodImageModel ? [goodImageModel] : IMAGE_MODELS()) {
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST", headers: { Authorization: "Bearer " + key(), "content-type": "application/json" },
      body: JSON.stringify({ model, prompt, size: opts.size || "1024x1024", quality: opts.quality || "medium", n: 1 }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.data && d.data[0] && d.data[0].b64_json) { goodImageModel = model; return { png: Buffer.from(d.data[0].b64_json, "base64"), model }; }
    last = apiError(d, r);
    if (r.status === 401 || r.status === 429 || /billing|quota|limit|safety|moderation/i.test(last.message)) throw last;
  }
  throw last;
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
  const sharp = require("sharp");
  const prompt = "A coloring book page for " + (audience || "kids ages 3 to 8") + ": " + subject + ". "
    + "Clean bold black outlines on a pure white background, cute friendly cartoon style like a professional children's coloring book. "
    + "The main subject is large and centered, with a few simple background details that fit the scene (ground, grass, clouds, stars, small flowers). "
    + "Large open areas that are easy to color. No shading, no gray tones, no hatching, no color, no filled black areas, no text, no letters, no border or frame.";
  const { png, model } = await image(prompt, { size: "1024x1024", quality: "medium" });
  // pure black and white, then trace
  const bw = await sharp(png).flatten({ background: "#ffffff" }).grayscale().resize(1024, 1024).threshold(170).png().toBuffer();
  const d = await trace(bw);
  if (!d || d.length < 400) throw new Error("drawing came out empty");
  return { viewBox: [0, 0, 1024, 1024], paths: [d], mode: "filled", by: model };
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

module.exports = { configured, key, image, chatJSON, pickTextModel, coloringArt, trace };
