// Server-side product rendering: the same PDF the website makes, plus the Etsy listing photo.
const path = require("path");
const fs = require("fs");
const { jsPDF } = require("jspdf");
const { Resvg } = require("@resvg/resvg-js");
const P = require("./_printables");

const meter = new jsPDF({ unit: "pt", format: "letter" });
P.setMeasure((t, size, bold) => { meter.setFont("helvetica", bold ? "bold" : "normal"); return meter.getStringUnitWidth(String(t)) * size; });
P.setJsPDF(jsPDF);
const FONT_DIR = __dirname;
const FONTS = ["LiberationSans-Regular.ttf", "LiberationSans-Bold.ttf"].map(f => path.join(FONT_DIR, f));

function pdfBuffer(spec) { return P.toPDF(P.layout(spec)); }
function innerOf(svg) { return svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>")); }
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
function wrap(text, size, maxW) {
  const words = P.clean(text).split(/\s+/).filter(Boolean), out = []; let cur = "";
  const w = t => { meter.setFont("helvetica", "bold"); return meter.getStringUnitWidth(t) * size; };
  words.forEach(word => { const t = cur ? cur + " " + word : word; if (w(t) > maxW && cur) { out.push(cur); cur = word; } else cur = t; });
  if (cur) out.push(cur); return { lines: out, widest: Math.max(0, ...out.map(w)) };
}
function listingSVG(spec) {
  const ops = P.layout(spec), n = P.pagesOf(ops).length, acc = P.ACC[spec.accent] || P.ACC.purple;
  const ph = 1320, pw = ph * P.PW / P.PH;
  const page = i => '<svg x="0" y="0" width="' + pw + '" height="' + ph + '" viewBox="0 0 ' + P.PW + " " + P.PH + '">' + innerOf(P.toSVG(ops, i, true)) + "</svg>";
  let s = '<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1800" viewBox="0 0 2400 1800"><rect width="2400" height="1800" fill="' + P.tint(acc, .86) + '"/>';
  if (n > 1) s += '<g transform="translate(' + (140 + pw * 0.3) + ',190) rotate(2.9)"><rect x="14" y="18" width="' + pw + '" height="' + ph + '" fill="rgba(0,0,0,0.12)"/>' + page(1) + "</g>";
  s += '<g transform="translate(120,250) rotate(-1.1)"><rect x="16" y="20" width="' + pw + '" height="' + ph + '" fill="rgba(0,0,0,0.16)"/><rect width="' + pw + '" height="' + ph + '" fill="#fff"/>' + page(0) + "</g>";
  const x0 = 1580, wmax = 740; let fs = 110, t = wrap(spec.title, fs, wmax);
  while ((t.lines.length > 4 || t.widest > wmax) && fs > 56) { fs -= 6; t = wrap(spec.title, fs, wmax); }
  let y = 430; t.lines.forEach(l => { s += '<text x="' + x0 + '" y="' + y + '" font-family="Liberation Sans, sans-serif" font-weight="bold" font-size="' + fs + '" fill="#1F2533">' + esc(l) + "</text>"; y += fs * 1.12; });
  s += '<rect x="' + x0 + '" y="' + (y - 20) + '" width="180" height="14" fill="' + acc + '"/>'; y += 70;
  [n + (n > 1 ? " printable pages" : " printable page"), "Instant download", "Print at home"].forEach(line => {
    s += '<circle cx="' + (x0 + 18) + '" cy="' + (y - 18) + '" r="14" fill="' + acc + '"/><text x="' + (x0 + 56) + '" y="' + y + '" font-family="Liberation Sans, sans-serif" font-weight="bold" font-size="52" fill="#1F2533">' + esc(line) + "</text>"; y += 92; });
  return s + "</svg>";
}
function listingPNG(spec) {
  const r = new Resvg(listingSVG(spec), { font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: "Liberation Sans", sansSerifFamily: "Liberation Sans" } });
  return Buffer.from(r.render().asPng());
}
module.exports = { pdfBuffer, listingPNG, listingDesc: P.listingDesc, clean: P.clean };
