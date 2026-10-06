// Printable wall art: generative abstract, boho, mid-century, botanical, quote and nursery prints.
// Every print is drawn fresh for each ratio (not cropped), so all 5 sizes look composed.
const { Page, measure, fitSize, wrapLines, tint, rng, shuffle, clean } = require("./core");
const IC = require("./icons");
const OUT = require("./output");

const PAL = {
  boho: { bg: "#F4ECE1", c: ["#C8673F", "#E3A86B", "#8E9B78", "#6E3B2A", "#EBCFB2"], ink: "#3B2A22" },
  sage: { bg: "#F1F0E8", c: ["#7F9172", "#B5C0A0", "#DCC9A8", "#4F5E48", "#E9E1D2"], ink: "#33392F" },
  blush: { bg: "#F8EEEA", c: ["#D9A5A0", "#B97A72", "#E8CFC4", "#7D5A57", "#C9B29B"], ink: "#4A3533" },
  neutral: { bg: "#F3EFE9", c: ["#1F1F1F", "#BFAE98", "#8C7B67", "#D9CDBE", "#5E5A55"], ink: "#1F1F1F" },
  dopamine: { bg: "#FFF6EC", c: ["#FF5E8E", "#FF9F1C", "#FFD23F", "#3EC1D3", "#7B61FF"], ink: "#2B2340" },
  academia: { bg: "#EFE6D6", c: ["#2F4A3A", "#7A2E2E", "#B88A44", "#3C2F2F", "#D8C7A8"], ink: "#2A2420" },
  coastal: { bg: "#F2F1EC", c: ["#3E6C8A", "#9CC1D0", "#E5D3B3", "#1E3A4F", "#C9DEE5"], ink: "#1E2D38" },
  midcentury: { bg: "#F2E8D5", c: ["#E07A3F", "#2F6F6A", "#F2B544", "#2B2B2B", "#C44536"], ink: "#2B2B2B" },
};
const STYLES = ["arches", "sun", "cutouts", "mountains", "bauhaus", "botanical", "waves", "terrazzo", "quote", "nursery", "lineflower", "stripes"];
const RATIOS = [
  { key: "2x3", label: "2:3 ratio - prints 4x6, 8x12, 12x18, 16x24, 20x30 in", w: 2, h: 3, px: [4800, 7200] },
  { key: "3x4", label: "3:4 ratio - prints 6x8, 9x12, 12x16, 18x24 in", w: 3, h: 4, px: [5400, 7200] },
  { key: "4x5", label: "4:5 ratio - prints 4x5, 8x10, 16x20 in", w: 4, h: 5, px: [4800, 6000] },
  { key: "ISO", label: "ISO ratio - prints A5, A4, A3, A2", w: 1, h: Math.SQRT2, px: [4961, 7016] },
  { key: "11x14", label: "11x14 in", w: 11, h: 14, px: [3300, 4200] },
];

function art(print, palName, W, H) {
  const pal = PAL[palName] || PAL.boho, r = rng((print.seed || "s") + palName), c = pal.c, p = new Page(W, H), m = W * 0.1;
  p.bg = print.bg || pal.bg;
  const style = STYLES.includes(print.style) ? print.style : "arches";
  const grain = () => { for (let i = 0; i < 260; i++) p.circle(r() * W, r() * H, 0.6 + r() * 1.4, { fill: pal.ink, op: 0.05 }); };
  if (style === "arches") {
    const cx = W / 2, base = H * 0.5 + W * 0.22, n = 5, R = W * 0.4;
    for (let i = 0; i < n; i++) { const rr = R * (1 - i / n), w = R / n * 0.86; p.path(`M${cx - rr + w / 2} ${base} A ${rr - w / 2} ${rr - w / 2} 0 0 1 ${cx + rr - w / 2} ${base}`, { stroke: c[i % c.length], sw: w, cap: "butt" }); }
    p.circle(cx + R * 0.72, base - R * 1.22, W * 0.075, { fill: c[1] });
    p.rect(m, base + 4, W - 2 * m, 2, { fill: pal.ink, op: 0.5 });
    grain();
  } else if (style === "sun") {
    const cx = W * (0.35 + r() * 0.3), cy = H * 0.42, R = W * 0.22;
    p.circle(cx, cy, R, { fill: c[0] });
    for (let i = 0; i < 4; i++) { const y = H * (0.55 + i * 0.1), amp = H * 0.03; p.path(`M0 ${y} C ${W * 0.3} ${y - amp * (1 + r())} ${W * 0.6} ${y + amp * (1 + r())} ${W} ${y - amp * 0.5} L ${W} ${H} L 0 ${H} Z`, { fill: c[(i + 1) % c.length] }); }
    grain();
  } else if (style === "cutouts") {
    const blob = (x, y, s, col) => { const k = 7, pts = []; for (let i = 0; i < k; i++) { const a = i / k * Math.PI * 2, rr = s * (0.7 + r() * 0.5); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
      let d = `M${((pts[0][0] + pts[k - 1][0]) / 2).toFixed(1)} ${((pts[0][1] + pts[k - 1][1]) / 2).toFixed(1)}`; for (let i = 0; i < k; i++) { const a = pts[i], b = pts[(i + 1) % k]; d += ` Q ${a[0].toFixed(1)} ${a[1].toFixed(1)} ${((a[0] + b[0]) / 2).toFixed(1)} ${((a[1] + b[1]) / 2).toFixed(1)}`; } p.path(d + " Z", { fill: col }); };
    blob(W * 0.38, H * 0.38, W * 0.22, c[0]); blob(W * 0.64, H * 0.6, W * 0.2, c[2]); blob(W * 0.36, H * 0.7, W * 0.11, c[1]);
    p.path(`M${W * 0.2} ${H * 0.2} q ${W * 0.08} ${-H * 0.05} ${W * 0.16} 0 t ${W * 0.16} 0 t ${W * 0.16} 0`, { stroke: pal.ink, sw: W * 0.008, cap: "round" });
    for (let i = 0; i < 9; i++) p.circle(W * 0.62 + (i % 3) * W * 0.05, H * 0.24 + Math.floor(i / 3) * W * 0.05, W * 0.012, { fill: c[3] });
    grain();
  } else if (style === "mountains") {
    p.circle(W * (0.3 + r() * 0.4), H * 0.3, W * 0.12, { fill: c[1] });
    for (let i = 0; i < 4; i++) { const y0 = H * (0.48 + i * 0.1); let d = `M0 ${H} L0 ${y0}`; const k = 4 + Math.floor(r() * 3); for (let j = 1; j <= k; j++) { const x = W * j / k, y = y0 - H * (0.06 + r() * 0.14) * (j % 2 ? 1 : 0.3); d += ` L${x.toFixed(1)} ${y.toFixed(1)}`; } p.path(d + ` L${W} ${H} Z`, { fill: tint(c[(i + 2) % c.length], -0.08 * i) }); }
    grain();
  } else if (style === "bauhaus") {
    const cols = 3, rows = Math.round(cols * H / W), s = (W - 2 * m) / cols, oy = (H - rows * s) / 2;
    for (let i = 0; i < cols * rows; i++) { const x = m + (i % cols) * s, y = oy + Math.floor(i / cols) * s, k = Math.floor(r() * 5), col = c[Math.floor(r() * 4)], col2 = c[(Math.floor(r() * 4) + 1) % 5];
      p.rect(x, y, s, s, { fill: col2 });
      if (k === 0) p.circle(x + s / 2, y + s / 2, s * 0.42, { fill: col });
      else if (k === 1) p.path(`M${x} ${y + s} A ${s} ${s} 0 0 1 ${x + s} ${y} L ${x + s} ${y + s} Z`, { fill: col });
      else if (k === 2) p.path(`M${x} ${y + s} A ${s / 2} ${s / 2} 0 0 1 ${x + s} ${y + s} Z`, { fill: col });
      else if (k === 3) p.poly([[x, y], [x + s, y + s], [x, y + s]], { fill: col });
      else { p.rect(x + s * 0.2, y + s * 0.2, s * 0.6, s * 0.6, { fill: col }); } }
  } else if (style === "botanical") {
    const stems = 1 + Math.floor(r() * 2);
    for (let sIdx = 0; sIdx < stems; sIdx++) {
      const x0 = stems === 1 ? W * 0.5 : W * (0.36 + sIdx * 0.26), y0 = H * 0.85, h = H * (0.5 + r() * 0.15), bend = W * (r() - 0.5) * 0.3, col = sIdx === 1 ? c[1] : c[0];
      p.path(`M${x0} ${y0} Q ${x0 + bend} ${y0 - h * 0.5} ${x0 + bend * 0.4} ${y0 - h}`, { stroke: col, sw: W * 0.006, cap: "round" });
      for (let i = 1; i < 9; i++) { const t = i / 9, x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * (x0 + bend) + t * t * (x0 + bend * 0.4), y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * (y0 - h * 0.5) + t * t * (y0 - h), s = (i % 2 ? 1 : -1), L = W * 0.16 * (1 - t * 0.45);
        p.path(`M${x} ${y} q ${L * 0.5 * s} ${-L * 0.6} ${L * s} ${-L * 0.2} q ${-L * 0.4 * s} ${L * 0.5} ${-L * s} ${L * 0.2} Z`, { fill: col }); }
    }
    p.rect(m, H * 0.88, W - 2 * m, 1.5, { fill: pal.ink, op: 0.3 });
  } else if (style === "waves") {
    const n = 9; for (let i = 0; i < n; i++) { const y = H * (0.12 + i * 0.09), amp = H * 0.025; let d = `M${-10} ${y}`; for (let x = 0; x <= W + 60; x += W / 4) d += ` q ${W / 8} ${-amp} ${W / 4} 0`; p.path(d, { stroke: c[i % 4], sw: H * 0.035, cap: "round" }); }
  } else if (style === "terrazzo") {
    for (let i = 0; i < 140; i++) { const x = r() * W, y = r() * H, s = W * (0.008 + r() * 0.03), col = c[i % 5], k = 3 + Math.floor(r() * 3), pts = []; for (let j = 0; j < k; j++) { const a = j / k * Math.PI * 2 + r(); pts.push([x + Math.cos(a) * s * (0.6 + r() * 0.6), y + Math.sin(a) * s * (0.6 + r() * 0.6)]); } p.poly(pts, { fill: col }); }
  } else if (style === "stripes") {
    const n = 6, w = (W - 2 * m) / n; for (let i = 0; i < n; i++) p.path(`M${m + i * w} ${H - m} L${m + i * w} ${H * 0.35} A ${w / 2} ${w / 2} 0 0 1 ${m + (i + 1) * w} ${H * 0.35} L ${m + (i + 1) * w} ${H - m} Z`, { fill: c[i % c.length] });
  } else if (style === "lineflower") {
    const cx = W / 2, cy = H * 0.42, R = W * 0.16;
    for (let i = 0; i < 8; i++) { const a = i * 45; p.open(`rotate(${a} ${cx} ${cy})`); p.ellipse(cx, cy - R * 0.85, R * 0.32, R * 0.62, { fill: i % 2 ? tint(c[0], 0.5) : tint(c[1], 0.5), stroke: pal.ink, sw: W * 0.004 }); p.close(); }
    p.circle(cx, cy, R * 0.45, { fill: c[0] });
    p.path(`M${cx} ${cy + R * 1.5} C ${cx - W * 0.05} ${H * 0.65} ${cx + W * 0.05} ${H * 0.75} ${cx} ${H * 0.86}`, { stroke: pal.ink, sw: W * 0.004 });
    p.path(`M${cx} ${H * 0.72} q ${-W * 0.12} ${-H * 0.04} ${-W * 0.15} ${-H * 0.1} q ${W * 0.1} 0 ${W * 0.15} ${H * 0.1}`, { stroke: pal.ink, sw: W * 0.004, fill: c[2] });
  } else if (style === "nursery") {
    const ic = IC.I[print.icon] ? print.icon : "bear", s = W * 0.5;
    p.circle(W / 2, H * 0.42, W * 0.32, { fill: tint(c[2], 0.3) });
    IC.draw(p, ic, (W - s) / 2, H * 0.42 - s / 2, s, { style: "flat", a: c[0], b: c[1] });
  }
  if (style === "quote" || print.text) {
    const txt = clean(print.text || "Good things take time"), quoteOnly = style === "quote";
    const font = print.font === "script" ? "dancing-script-600" : print.font === "sans" ? "poppins-600" : "playfair-display-500";
    const maxW = W - 2 * m * (quoteOnly ? 1.1 : 1.4);
    let size = quoteOnly ? W * 0.1 : W * 0.06, ls = wrapLines(txt, font, size, maxW);
    while (ls.length > (quoteOnly ? 4 : 2) && size > W * 0.03) { size *= 0.9; ls = wrapLines(txt, font, size, maxW); }
    const y0 = quoteOnly ? H / 2 - (ls.length - 1) * size * 0.6 : H * 0.84 - (ls.length - 1) * size * 0.6;
    if (quoteOnly) { p.circle(W / 2, y0 - size * 1.6, W * 0.05, { fill: c[0] }); p.rect(W / 2 - W * 0.06, y0 + ls.length * size * 1.2 - size * 0.4, W * 0.12, W * 0.006, { fill: c[1] }); }
    ls.forEach((l, i) => p.text(l, W / 2, y0 + i * size * 1.2, { font, size, fill: pal.ink, anchor: "middle" }));
  }
  return p;
}
function artSVG(print, pal, ratio) { const R = RATIOS.find(x => x.key === ratio) || RATIOS[0], W = 1000, H = Math.round(1000 * R.h / R.w); const p = art(print, pal, W, H); return { svg: p.svg(p.bg), page: p, W, H }; }

// ---------- listing photos ----------
function room(spec, prints, pal) {
  const P0 = PAL[pal] || PAL.boho, p = new Page(800, 600), r = rng(spec.title || "room");
  p.rect(0, 0, 800, 600, { fill: tint(P0.c[4] || "#EDE6DC", 0.45) });
  p.rect(0, 470, 800, 130, { fill: tint(P0.c[3], 0.55) });
  p.rect(0, 466, 800, 6, { fill: tint(P0.c[3], 0.3) });
  const n = Math.min(prints.length, 3), fw = n === 1 ? 210 : n === 2 ? 175 : 150, fh = fw * 1.5, gap = 30, total = n * fw + (n - 1) * gap, x0 = 400 - total / 2;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * (fw + gap), y = 52 + (n === 3 && i === 1 ? -14 : 0);
    p.rect(x + 5, y + 7, fw, fh, { fill: "#000", op: 0.15 });
    p.rect(x, y, fw, fh, { fill: "#2B2622" }); p.rect(x + 6, y + 6, fw - 12, fh - 12, { fill: "#FFFFFF" });
    const a = artSVG(prints[i], pal, "2x3"), s = (fw - 34) / a.W;
    embedArt(p, a.page, x + 17, y + 17, s);
  }
  // sofa
  p.rect(150, 370, 500, 96, { fill: tint(P0.c[2], -0.05), r: 26 }); p.rect(130, 400, 60, 80, { fill: tint(P0.c[2], -0.15), r: 22 }); p.rect(610, 400, 60, 80, { fill: tint(P0.c[2], -0.15), r: 22 });
  p.rect(180, 420, 440, 46, { fill: tint(P0.c[2], 0.1), r: 14 }); p.rect(190, 466, 10, 26, { fill: "#3B2F28" }); p.rect(600, 466, 10, 26, { fill: "#3B2F28" });
  p.rect(205, 384, 70, 50, { fill: tint(P0.c[0], 0.25), r: 14 }); p.rect(530, 384, 70, 50, { fill: tint(P0.c[1], 0.2), r: 14 });
  // plant
  p.path("M710 470 L700 420 L760 420 L750 470 Z", { fill: tint(P0.c[0], -0.1) });
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.33, L = 70 + r() * 40; p.path(`M730 420 Q ${730 + Math.cos(a) * L * 0.5 - 14} ${420 + Math.sin(a) * L * 0.5} ${730 + Math.cos(a) * L} ${420 + Math.sin(a) * L}`, { stroke: "#4F6B47", sw: 3, cap: "round" });
    p.ellipse(730 + Math.cos(a) * L, 420 + Math.sin(a) * L, 12, 6, { fill: "#5E7D52" }); }
  const title = clean(spec.title || "Printable wall art"), tw = Math.min(330, Math.max(measure(title, "playfair-display-700", 17), 220) + 36);
  p.rect(26, 500, tw, 76, { fill: "#FFFFFF", r: 14, op: 0.96 });
  p.text(title, 44, 530, { font: "playfair-display-700", size: fitSize(title, "playfair-display-700", 17, tw - 36, 10), fill: P0.ink });
  p.text("Instant download - 5 print sizes - 300 DPI", 44, 556, { font: "poppins-400", size: 11, fill: "#777777" });
  return p;
}
function embedArt(target, src, x, y, s) {
  target.open(`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(5)})`);
  target.add(`<rect width="${src.w}" height="${src.h}" fill="${src.bg}"/>`); src.els.forEach(e => target.add(e)); src.defs.forEach((v, k) => { if (!target.defs.has(k)) target.defs.set(k, v); });
  target.close();
}
function listingPhotos(spec) {
  const pal = spec.palette || "boho", prints = (spec.prints || []).slice(0, 6), P0 = PAL[pal] || PAL.boho, title = clean(spec.title || "Wall Art Print"), photos = [];
  photos.push(room(spec, prints, pal));
  // set overview
  { const p = new Page(800, 600); p.rect(0, 0, 800, 600, { fill: "#FFFFFF" }); p.rect(0, 0, 800, 600, { fill: P0.bg, op: 0.6 });
    const n = prints.length, cols = n <= 3 ? n : Math.ceil(n / 2), rows = n <= 3 ? 1 : 2, fw = Math.min(200, 700 / cols - 24), fh = fw * 1.5, tw = cols * fw + (cols - 1) * 24;
    const sc = Math.min(1.6, 470 / (rows * fh + (rows - 1) * 20), 740 / (cols * fw + (cols - 1) * 24)), FW = fw * sc, FH = fh * sc, TW = cols * FW + (cols - 1) * 24;
    const TH0 = rows * FH + (rows - 1) * 20, top0 = 90 + (490 - TH0) / 2;
    prints.forEach((pr, i) => { const x = 400 - TW / 2 + (i % cols) * (FW + 24), y = top0 + Math.floor(i / cols) * (FH + 20); p.rect(x + 4, y + 6, FW, FH, { fill: "#000", op: 0.12 }); const a = artSVG(pr, pal, "2x3"); embedArt(p, a.page, x, y, FW / a.W); });
    p.text(n > 1 ? "Set of " + n + " prints" : "Printable wall art", 400, 56, { font: "playfair-display-700", size: 32, fill: P0.ink, anchor: "middle" });
    photos.push(p); }
  // close-ups
  prints.slice(0, 3).forEach((pr, i) => { const p = new Page(800, 600); p.rect(0, 0, 800, 600, { fill: tint(P0.c[4] || P0.bg, 0.5) }); const a = artSVG(pr, pal, "3x4"), s = 520 / a.H;
    p.rect(400 - a.W * s / 2 + 8, 40 + 10, a.W * s, 520, { fill: "#000", op: 0.15 }); embedArt(p, a.page, 400 - a.W * s / 2, 40, s); photos.push(p); });
  // sizes
  { const p = new Page(800, 600); p.rect(0, 0, 800, 600, { fill: "#FFFFFF" });
    p.text("5 files - print almost any size", 400, 70, { font: "playfair-display-700", size: 30, fill: P0.ink, anchor: "middle" });
    RATIOS.forEach((R, i) => { const h = 150, w = h * R.w / R.h, x = 90 + i * 132, y = 130; p.rect(x, y + (170 - h) / 2, w, h, { fill: tint(P0.c[i % 4], 0.5), stroke: P0.ink, sw: 1 });
      p.text(R.key === "ISO" ? "A sizes" : R.key, x + w / 2, y + 205, { font: "poppins-600", size: 16, fill: P0.ink, anchor: "middle" }); });
    ["2:3 - 4x6, 8x12, 12x18, 16x24, 20x30 in", "3:4 - 6x8, 9x12, 12x16, 18x24 in", "4:5 - 4x5, 8x10, 16x20 in", "ISO - A5, A4, A3, A2", "11x14 in"].forEach((t, i) => p.text(t, 400, 400 + i * 30, { font: "poppins-400", size: 16, fill: P0.ink, anchor: "middle" }));
    p.text("High resolution 300 DPI JPG files. Frame not included.", 400, 565, { font: "poppins-600", size: 13, fill: "#8A8A8A", anchor: "middle" });
    photos.push(p); }
  return photos.map(p => p.svg("#FFFFFF"));
}
// Build the 5 download files: one zip per ratio with every print in it, 300 DPI JPGs.
async function files(spec) {
  const JSZip = require("jszip"), pal = spec.palette || "boho", prints = (spec.prints || []).slice(0, 6), base = clean(spec.title || "wall-art").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const out = [];
  for (const R of RATIOS) {
    const zip = new JSZip();
    for (let i = 0; i < prints.length; i++) {
      const a = artSVG(prints[i], pal, R.key);
      const jpg = await OUT.jpg(a.svg, R.px[0], 88);
      zip.file(`${base}_${i + 1}_${R.key}_300dpi.jpg`, jpg);
    }
    zip.file("PRINTING-GUIDE.txt", "Thank you!\n\nThis folder has the " + R.label + " files.\nPrint at home or upload to any print shop. Choose 'fit' or 'actual size'.\nFor personal use only.\n");
    const buf = await zip.generateAsync({ type: "nodebuffer", compression: "STORE" });
    out.push({ name: `${base}_${R.key}.zip`, buf, type: "application/zip" });
  }
  return out;
}
module.exports = { PAL, STYLES, RATIOS, art, artSVG, listingPhotos, files };
