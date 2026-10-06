// Listing video maker: a 10 to 12 second silent flip-through of the real product (Etsy allows 5-15 s, one per listing).
// Frames are drawn with the design engine, put together with sharp and encoded to MP4 with ffmpeg.
const { spawn } = require("child_process");
const OUT = require("../lib/design/output");
const { tint } = require("../lib/design/core");

const W = 1440, H = 1080, FPS = 30;
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const hex = c => { const m = String(c || "#ffffff").replace("#", ""); const n = parseInt(m.length === 3 ? m.split("").map(x => x + x).join("") : m, 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; };

function ffmpegPath() {
  let p; try { p = require("ffmpeg-static"); } catch (e) { return "ffmpeg"; }
  const fs = require("fs");
  try { fs.accessSync(p, fs.constants.X_OK); return p; } catch (e) {}
  // the server may copy the encoder without its run permission: use a runnable copy in /tmp
  const t = "/tmp/ffmpeg-ml"; try { if (!fs.existsSync(t)) { fs.copyFileSync(p, t); fs.chmodSync(t, 0o755); } return t; } catch (e) { return p; }
}

// What the video shows, taken from the product itself.
function storyboard(spec) {
  const isArt = spec.category === "wallart";
  if (isArt) {
    const WA = require("../lib/design/wallart");
    const photos = WA.listingPhotos(spec);
    const prints = (spec.prints || []).map(p => WA.artSVG(p, spec.palette, "3x4").svg);
    return { photos, pages: prints, bg: "#F4F1EC", accent: "#2B2B2B" };
  }
  const B = require("../lib/design/book");
  const b = B.build(spec), th = b.th;
  const photos = B.listingPhotos(spec);
  const content = b.pages.filter(c => c.label !== "What's inside");
  // cover + a spread of different page types (no answer keys)
  const seen = {}, picks = [];
  content.forEach((c, i) => { const base = String(c.label).replace(/\s*\d+.*$/, ""); if (i === 0 || (!c.key && !seen[base])) { seen[base] = 1; picks.push(c); } });
  const pages = picks.slice(0, 7).map(c => c.page.svg(c.page.bg));
  const bg = th.style === "kids" ? tint(th.c[1], 0.86) : tint(th.c[0], 0.86);
  return { photos, pages, bg, accent: th.c[0] };
}

// Frames are streamed straight into the encoder (never all held in memory). A short crossfade joins each clip.
function encoder() {
  const fs = require("fs"), os = require("os"), path = require("path");
  const file = path.join(os.tmpdir(), "ml-video-" + Date.now() + "-" + Math.floor(Math.random() * 1e6) + ".mp4");
  const args = ["-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", W + "x" + H, "-r", String(FPS), "-i", "-",
    "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p", "-movflags", "+faststart", file];
  const p = spawn(ffmpegPath(), args, { stdio: ["pipe", "ignore", "pipe"] });
  const err = []; let failed = null;
  p.stderr.on("data", c => { err.push(c); if (err.length > 50) err.shift(); });
  p.stdin.on("error", e => { failed = failed || e; });
  const done = new Promise((resolve, reject) => {
    p.on("error", reject);
    p.on("close", code => { if (code !== 0) return reject(new Error("video encoder failed: " + Buffer.concat(err).toString().slice(-300)));
      try { const buf = fs.readFileSync(file); fs.unlinkSync(file); resolve(buf); } catch (e) { reject(e); } });
  });
  let held = null, boundary = false, count = 0;
  const max = FPS * 14;
  const write = async f => { if (count >= max || failed) return; count++; if (!p.stdin.write(f)) await new Promise(r => p.stdin.once("drain", r)); };
  return {
    clip() { boundary = true; },
    async push(f) {
      if (held) { await write(held);
        if (boundary) for (let i = 1; i <= 8; i++) { const t = i / 9, b = Buffer.allocUnsafe(f.length); for (let k = 0; k < f.length; k++) b[k] = held[k] + (f[k] - held[k]) * t; await write(b); } }
      boundary = false; held = f;
    },
    async finish() { if (held) await write(held); p.stdin.end(); const mp4 = await done; return { mp4, seconds: count / FPS }; },
  };
}
// Ken Burns: slow push-in (or pull-out) on a still photo.
async function kenBurns(enc, png, frames, zoomFrom, zoomTo) {
  const sharp = require("sharp");
  const big = await sharp(png).resize(Math.round(W * 1.15), Math.round(H * 1.15)).flatten({ background: "#ffffff" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const raw = { width: big.info.width, height: big.info.height, channels: 3 };
  enc.clip();
  for (let f = 0; f < frames; f++) {
    const z = zoomFrom + (zoomTo - zoomFrom) * ease(f / Math.max(1, frames - 1));
    const cw = Math.round(big.info.width / z), ch = Math.round(big.info.height / z);
    const left = Math.round((big.info.width - cw) / 2), top = Math.round((big.info.height - ch) / 2);
    await enc.push(await sharp(big.data, { raw }).extract({ left, top, width: cw, height: ch }).resize(W, H).raw().toBuffer());
  }
}
// Flip-through: pages slide in one after another and stack up.
async function flipThrough(enc, pageSvgs, bgHex, framesPer) {
  const sharp = require("sharp");
  const ph = 900, pw = Math.round(ph * 612 / 792);
  const pagePNGs = [];
  for (const svg of pageSvgs) {
    const png = Buffer.from(OUT.png(svg, pw * 1.2));
    pagePNGs.push(await sharp(png).resize(pw, ph, { fit: "contain", background: "#ffffff" }).flatten({ background: "#ffffff" }).png().toBuffer());
  }
  const shadow = await sharp({ create: { width: pw + 60, height: ph + 60, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${pw + 60}" height="${ph + 60}"><rect x="30" y="38" width="${pw}" height="${ph}" fill="rgba(0,0,0,0.22)"/></svg>`) }]).blur(14).png().toBuffer();
  const bg = await sharp({ create: { width: W, height: H, channels: 3, background: hex(bgHex) } }).png().toBuffer();
  const cx = Math.round((W - pw) / 2), cy = Math.round((H - ph) / 2);
  enc.clip();
  for (let k = 0; k < pagePNGs.length; k++) {
    for (let f = 0; f < framesPer; f++) {
      const t = ease(Math.min(1, f / (framesPer * 0.55)));
      const layers = [];
      for (let j = Math.max(0, k - 2); j < k; j++) { const back = k - j, x = cx - back * 70, y = cy + back * 6;
        layers.push({ input: shadow, left: x - 30, top: y - 30 }, { input: pagePNGs[j], left: x, top: y }); }
      const x = Math.round(cx + (1 - t) * (W - cx + 40));
      if (x - 30 < W) layers.push({ input: x - 30 + pw + 60 > W ? await sharp(shadow).extract({ left: 0, top: 0, width: W - (x - 30), height: ph + 60 }).toBuffer() : shadow, left: x - 30, top: cy - 30 });
      if (x < W) layers.push({ input: x + pw > W ? await sharp(pagePNGs[k]).extract({ left: 0, top: 0, width: W - x, height: ph }).toBuffer() : pagePNGs[k], left: x, top: cy });
      await enc.push(await sharp(bg).composite(layers).removeAlpha().raw().toBuffer());
    }
  }
}
// Builds the MP4 (about 12 seconds). An optional lifestyle photo opens the video.
async function listingVideo(spec, opts = {}) {
  const sb = storyboard(spec);
  const photoPNG = i => Buffer.from(OUT.png(sb.photos[Math.min(sb.photos.length - 1, i)], 1700));
  const opener = opts.lifestyle && opts.lifestyle[0] ? opts.lifestyle[0] : photoPNG(0);
  const enc = encoder();
  await kenBurns(enc, opener, Math.round(FPS * 2.6), 1.0, 1.08);
  if (sb.pages.length) await flipThrough(enc, sb.pages.slice(0, 6), sb.bg, Math.round(FPS * 0.95));
  if (sb.photos.length > 1) await kenBurns(enc, photoPNG(1), Math.round(FPS * 1.8), 1.06, 1.0);
  await kenBurns(enc, opts.lifestyle && opts.lifestyle[0] ? photoPNG(0) : photoPNG(sb.photos.length - 1), Math.round(FPS * 1.8), 1.08, 1.0);
  return enc.finish();
}
// Uploads (or replaces) the listing video on Etsy.
async function uploadVideo(listingId, mp4, name) {
  const { etsy, link } = require("./_etsy");
  const l = await link();
  try { const v = await etsy("/application/listings/" + listingId + "/videos");
    for (const x of (v.results || [])) await etsy("/application/shops/" + l.shop_id + "/listings/" + listingId + "/videos/" + x.video_id, { method: "DELETE" }); } catch (e) {}
  const f = new FormData();
  f.append("video", new Blob([mp4], { type: "video/mp4" }), (name || "listing-video") + ".mp4");
  f.append("name", (name || "listing-video") + ".mp4");
  return etsy("/application/shops/" + l.shop_id + "/listings/" + listingId + "/videos", { method: "POST", body: f });
}
module.exports = { listingVideo, uploadVideo, storyboard };
