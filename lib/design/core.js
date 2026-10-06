// Moneyland design engine: core drawing. Every page is built as SVG.
// Text is converted to vector glyph shapes (from real font files), so the PDF, the listing
// photos and the on-screen previews all look exactly the same everywhere.
const fontkit = require("fontkit");
const path = require("path");
const FD = path.join(__dirname, "fonts");

const FONTS = {};
function font(key) {
  if (!FONTS[key]) FONTS[key] = fontkit.openSync(path.join(FD, key + ".ttf"));
  return FONTS[key];
}
function clean(t) {
  return String(t == null ? "" : t)
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-")
    .replace(/…/g, "...").replace(/[^\x20-\x7E -ÿ]/g, "").replace(/\s+/g, " ");
}
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
const n2 = v => Math.round(v * 100) / 100;

function measure(txt, key, size, ls) {
  const f = font(key), run = f.layout(clean(txt));
  return run.advanceWidth * size / f.unitsPerEm + (ls || 0) * Math.max(0, run.glyphs.length - 1);
}
// Splits text into lines that fit maxW.
function wrapLines(txt, key, size, maxW) {
  const words = clean(txt).split(" ").filter(Boolean), out = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (measure(t, key, size) <= maxW || !cur) cur = t; else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  return out;
}
// Largest size (<= size, >= min) at which txt fits on one line.
function fitSize(txt, key, size, maxW, min) {
  let s = size; while (s > (min || 8) && measure(txt, key, s) > maxW) s -= 0.5;
  return s;
}

function tint(hex, t) {
  const n = parseInt(String(hex).slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
  const f = v => Math.round(t >= 0 ? v + (255 - v) * t : v * (1 + t)).toString(16).padStart(2, "0");
  return "#" + f(r) + f(g) + f(b);
}
function rng(seed) {
  let h = 1779033703 ^ String(seed).length;
  for (let i = 0; i < String(seed).length; i++) { h = Math.imul(h ^ String(seed).charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  return function () { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
function shuffle(a, r) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function attrs(o) {
  let s = "";
  if (o.fill !== undefined) s += ` fill="${o.fill}"`;
  if (o.stroke) s += ` stroke="${o.stroke}" stroke-width="${n2(o.sw == null ? 1 : o.sw)}"`;
  if (o.stroke && o.cap) s += ` stroke-linecap="${o.cap}"`;
  if (o.stroke && o.join) s += ` stroke-linejoin="${o.join}"`;
  if (o.dash) s += ` stroke-dasharray="${String(o.dash).split(/[ ,]+/).map(v => Math.max(0.01, +v || 0.01)).join(" ")}"`;
  if (o.op != null && o.op < 1) s += ` opacity="${o.op}"`;
  if (o.fop != null) s += ` fill-opacity="${o.fop}"`;
  return s;
}

class Page {
  constructor(w, h) { this.w = w || 612; this.h = h || 792; this.els = []; this.defs = new Map(); }
  add(s) { this.els.push(s); return this; }
  rect(x, y, w, h, o = {}) {
    const r = o.r ? ` rx="${n2(o.r)}" ry="${n2(o.r)}"` : "";
    return this.add(`<rect x="${n2(x)}" y="${n2(y)}" width="${n2(Math.max(0, w))}" height="${n2(Math.max(0, h))}"${r}${attrs(Object.assign({ fill: "none" }, o))}/>`);
  }
  circle(cx, cy, r, o = {}) { return this.add(`<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r)}"${attrs(Object.assign({ fill: "none" }, o))}/>`); }
  ellipse(cx, cy, rx, ry, o = {}) { return this.add(`<ellipse cx="${n2(cx)}" cy="${n2(cy)}" rx="${n2(rx)}" ry="${n2(ry)}"${attrs(Object.assign({ fill: "none" }, o))}/>`); }
  line(x1, y1, x2, y2, o = {}) { return this.add(`<line x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}"${attrs(Object.assign({ stroke: "#000" }, o))}/>`); }
  path(d, o = {}) { return this.add(`<path d="${d}"${attrs(Object.assign({ fill: "none" }, o))}/>`); }
  poly(pts, o = {}) { return this.path("M" + pts.map(p => n2(p[0]) + " " + n2(p[1])).join(" L") + (o.open ? "" : " Z"), o); }
  open(transform) { return this.add(`<g transform="${transform}">`); }
  close() { return this.add("</g>"); }
  // Draws text as glyph shapes. Returns the width drawn.
  text(txt, x, y, o = {}) {
    const key = o.font || "poppins-400", size = o.size || 12, f = font(key), k = size / f.unitsPerEm, ls = o.ls || 0;
    const run = f.layout(clean(txt));
    const width = run.advanceWidth * k + ls * Math.max(0, run.glyphs.length - 1);
    let cx = x;
    if (o.anchor === "middle") cx = x - width / 2; else if (o.anchor === "end") cx = x - width;
    const fill = o.fill === undefined ? "#222" : o.fill;
    let st = "";
    if (o.stroke) st += ` stroke="${o.stroke}" stroke-width="${n2((o.sw || 1) / k)}" stroke-linejoin="round"`;
    if (o.dash) st += ` stroke-dasharray="${String(o.dash).split(/[ ,]+/).map(v => n2(v / k)).join(" ")}"`;
    if (o.op != null && o.op < 1) st += ` opacity="${o.op}"`;
    let pen = cx, out = "";
    run.glyphs.forEach((g, i) => {
      const pos = run.positions[i];
      const id = "g" + key.replace(/[^a-z0-9]/g, "") + "_" + g.id;
      if (!this.defs.has(id)) { const d = g.path.toSVG(); this.defs.set(id, d ? `<path id="${id}" d="${d}"/>` : ""); }
      if (this.defs.get(id)) out += `<use href="#${id}" xlink:href="#${id}" transform="translate(${n2(pen + pos.xOffset * k)} ${n2(y - pos.yOffset * k)}) scale(${n2(k * 1e4) / 1e4} ${-n2(k * 1e4) / 1e4})"/>`;
      pen += pos.xAdvance * k + ls;
    });
    if (out) this.add(`<g fill="${fill}"${st}>${out}</g>`);
    return width;
  }
  // Wrapped paragraph. Returns the y after the last line.
  para(txt, x, y, w, o = {}) {
    const size = o.size || 11, lh = o.lh || size * 1.4;
    const lines = wrapLines(txt, o.font || "poppins-400", size, w).slice(0, o.maxLines || 99);
    lines.forEach((ln, i) => this.text(ln, o.anchor === "middle" ? x + w / 2 : x, y + i * lh, Object.assign({}, o, { size })));
    return y + lines.length * lh;
  }
  svg(bg) {
    const defs = [...this.defs.values()].filter(Boolean).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${this.w} ${this.h}" width="${this.w}" height="${this.h}">`
      + (defs ? `<defs>${defs}</defs>` : "")
      + `<rect width="${this.w}" height="${this.h}" fill="${bg || "#FFFFFF"}"/>` + this.els.join("") + "</svg>";
  }
}

module.exports = { Page, font, measure, wrapLines, fitSize, clean, esc, tint, rng, shuffle, n2, FD };
