// Assembles a product spec into finished pages, the print PDF and the Etsy listing photos.
const { Page, measure, fitSize, wrapLines, tint, rng, clean } = require("./core");
const TH = require("./theme");
const IC = require("./icons");
const { K, keyPage } = require("./kids");
const { P } = require("./more");
const OUT = require("./output");
const M = TH.M;

const TEMPLATES = Object.assign({}, K, P);
// old names -> new
TEMPLATES.checklist = (ctx, pg) => P.planner(ctx, Object.assign({ sections: [{ head: pg.head || "Checklist", kind: "checks", count: 16, wide: true }] }, pg));
TEMPLATES.budget = (ctx, pg) => P.table(ctx, pg);
TEMPLATES.tracker = TEMPLATES.table;
TEMPLATES.chore = K.chart;
TEMPLATES.trivia = P.game;

function pagesOf(spec) {
  if (spec.template === "bundle" || Array.isArray(spec.pages)) return (spec.pages || []).filter(Boolean);
  return [spec];
}
function build(spec) {
  spec = spec || {};
  const th = TH.pick(spec);
  const ctx = { th, spec, seed: clean(spec.title || "p"), n: 0, out: [], keys: [] };
  for (const pg of pagesOf(spec)) {
    const fn = TEMPLATES[pg.template];
    if (!fn) continue;
    try { fn(ctx, pg); } catch (e) { ctx.errors = (ctx.errors || []).concat(pg.template + ": " + e.message); }
  }
  const content = ctx.out;
  // answer keys
  const keyPages = [];
  const groups = {};
  ctx.keys.forEach(k => { if (typeof k === "function") keyPages.push(k()); else (groups[k.group] = groups[k.group] || []).push(k); });
  const packed = [].concat(...Object.values(groups));
  [packed].filter(l => l.length).forEach(list => {
    for (let i = 0; i < list.length; i += 4) {
      const kp = keyPage(ctx, "Puzzle answers");
      const cw = (kp.p.w - 2 * M - 20) / 2, ch = (kp.p.h - kp.y - 50) / 2;
      list.slice(i, i + 4).forEach((k, j) => k.draw(kp.p, M + (j % 2) * (cw + 20), kp.y + Math.floor(j / 2) * ch, cw, ch - 16));
      keyPages.push(kp.p);
    }
  });
  keyPages.forEach(p => { TH.footer(p, th); content.push({ page: p, label: "Answer key", key: true }); });
  const multi = content.length > 1 || spec.template === "bundle" || (spec.pages && spec.pages.length > 1);
  const all = [];
  if (multi) all.push({ page: cover(spec, th, content), label: "Cover" });
  if (content.length >= 10) all.push({ page: contents(spec, th, content), label: "What's inside" });
  content.forEach(c => all.push(c));
  all.forEach(c => { c.page.bg = c.page.bg || th.bg; });
  return { th, pages: all, errors: ctx.errors || [] };
}

function baseLabel(c) {
  return c.key ? "Answer keys" : String(c.label).replace(/\s*\d+(\s*-\s*\d+)?$/, "").replace(/^Letter [A-Z]$/, "Letter tracing").replace(/^Coloring: .*/, "Coloring pages").replace(/^Banner .*/, "Banner letters").replace(/^Bingo card$/, "Bingo cards").replace(/^Dot to dot$/, "Dot to dot pictures");
}
function groupLabels(content) {
  const out = [];
  content.forEach(c => {
    const base = baseLabel(c);
    const last = out[out.length - 1];
    if (last && last.base === base) last.n++; else out.push({ base, n: 1 });
  });
  return out;
}
function embed(target, src, x, y, scale, o = {}) {
  if (o.shadow !== false) target.rect(x + 6 * (o.sh || 1), y + 8 * (o.sh || 1), src.w * scale, src.h * scale, { fill: "#000000", op: 0.14, r: 3 });
  target.open(`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(5)})` + (o.rot ? ` rotate(${o.rot} ${src.w / 2} ${src.h / 2})` : ""));
  target.add(`<rect width="${src.w}" height="${src.h}" fill="${src.bg || "#FFFFFF"}"/>`);
  src.els.forEach(e => target.add(e));
  src.defs.forEach((v, k) => { if (!target.defs.has(k)) target.defs.set(k, v); });
  if (o.border !== false) target.add(`<rect width="${src.w}" height="${src.h}" fill="none" stroke="#DADDE3" stroke-width="${(1 / scale).toFixed(2)}"/>`);
  target.close();
}
function pickShowcase(content, n) {
  const seen = new Set(), out = [];
  content.filter(c => !c.key).forEach(c => { const b = baseLabel(c); if (!seen.has(b)) { seen.add(b); out.push(c); } });
  content.filter(c => !c.key).forEach(c => { if (out.length < n && !out.includes(c)) out.push(c); });
  return out.slice(0, n);
}
function countPages(content) { return content.length; }

function cover(spec, th, content) {
  const p = new Page(), W = p.w, H = p.h, n = countPages(content);
  const title = clean(spec.title || "Printable Pack"), sub = clean(spec.subtitle || "");
  if (th.style === "kids") {
    p.path(`M0 0 L${W} 0 L${W} 380 Q ${W * 0.75} 420 ${W / 2} 386 Q ${W * 0.25} 352 0 392 Z`, { fill: th.c[0] });
    for (let i = 0; i < 16; i++) { const r = rng(title + i); p.circle(20 + r() * (W - 40), 20 + r() * 330, 3 + r() * 6, { fill: "#FFFFFF", op: 0.18 }); }
    const ls = wrapLines(title, th.head, 50, W - 120).slice(0, 3), size = ls.length > 2 ? 40 : 50;
    let y = 120 + (3 - ls.length) * 22;
    ls.forEach((l, i) => { const s = fitSize(l, th.head, size, W - 100, 22); p.text(l, W / 2 + 3, y + i * size * 1.08 + 4, { font: th.head, size: s, fill: tint(th.c[0], -0.35), anchor: "middle" }); p.text(l, W / 2, y + i * size * 1.08, { font: th.head, size: s, fill: "#FFFFFF", anchor: "middle" }); });
    y += ls.length * size * 1.08 + 4;
    if (sub) p.para(sub, 70, y, W - 140, { font: th.sub, size: 18, fill: "#FFFFFF", anchor: "middle", lh: 22, maxLines: 2 });
    const ic = IC.iconSet(th.icons, 4);
    IC.draw(p, ic[0], 30, 300, 70, { a: th.c[2], b: th.c[1] }); IC.draw(p, ic[1], W - 100, 290, 70, { a: th.c[2], b: th.c[3] });
  } else {
    p.rect(0, 0, W, H, { fill: th.bg });
    p.path(`M${W / 2 - 170} 380 L${W / 2 - 170} 210 A 170 170 0 0 1 ${W / 2 + 170} 210 L${W / 2 + 170} 380 Z`, { fill: tint(th.c[th.style === "boho" ? 0 : 1], th.style === "boho" ? 0.75 : 0.65) });
    p.path(`M${W / 2 - 150} 380 L${W / 2 - 150} 214 A 150 150 0 0 1 ${W / 2 + 150} 214 L${W / 2 + 150} 380 Z`, { stroke: "#FFFFFF", sw: 1.5 });
    if (sub) p.text(wrapLines(sub, th.sub, 26, W - 160)[0], W / 2, 108, { font: th.sub, size: fitSize(wrapLines(sub, th.sub, 26, W - 160)[0], th.sub, 26, W - 140, 12), fill: th.c[1], anchor: "middle" });
    const ls = wrapLines(title, th.head, 46, 300).slice(0, 4), size = ls.length > 3 ? 32 : 40;
    ls.forEach((l, i) => p.text(l, W / 2, 230 + i * size * 1.12 - (ls.length - 1) * size * 0.4, { font: th.head, size: fitSize(l, th.head, size, 290, 16), fill: th.ink, anchor: "middle" }));
  }
  // fan of sample pages
  const show = pickShowcase(content, 3), sc = 0.4;
  [0, 2, 1].forEach(i => { const c = show[i]; if (!c) return; const s2 = c.page.w > c.page.h ? 0.31 : sc; embed(p, c.page, [46, 0, 322][i] || 184, 432 + (i === 1 ? -18 : 0), s2, { sh: 0.6, rot: [-4, 0, 4][i] }); });
  // badge
  const bx = W - 70, by = th.style === "kids" ? 404 : 410;
  p.circle(bx, by, 46, { fill: th.c[2] }); p.circle(bx, by, 40, { stroke: "#FFFFFF", sw: 1.5, dash: "2 3" });
  p.text(String(n), bx, by + 4, { font: th.head, size: 32, fill: th.style === "kids" ? "#FFFFFF" : th.ink, anchor: "middle" });
  p.text("PAGES", bx, by + 22, { font: th.bold, size: 9.5, fill: th.style === "kids" ? "#FFFFFF" : th.ink, anchor: "middle", ls: 1.5 });
  p.text("Instant download  -  Print at home  -  US Letter and A4", W / 2, H - 22, { font: th.bold, size: 9.5, fill: th.soft, anchor: "middle" });
  return p;
}
function contents(spec, th, content) {
  const p = new Page(); TH.decorate(p, th, "contents", {});
  let y = TH.header(p, th, "What's Inside", clean(spec.title), {}) + 10;
  const groups = groupLabels(content);
  let pageNo = 2 + 1;
  const colW = (p.w - 2 * M - 20) / 2, perCol = Math.ceil(groups.length / 2), rh = Math.min(44, (p.h - 60 - y) / Math.max(perCol, 1));
  groups.forEach((g, i) => {
    const col = i < perCol ? 0 : 1, x = M + col * (colW + 20), yy = y + (i % perCol) * rh;
    p.rect(x, yy - rh * 0.62, colW, rh - 8, { fill: tint(th.c[i % th.c.length], 0.88), r: 10 });
    p.circle(x + 16, yy - 4, 6, { fill: th.c[i % th.c.length] });
    p.text(g.base, x + 30, yy, { font: th.bold, size: fitSize(g.base, th.bold, 14, colW - 100, 8), fill: th.ink });
    p.text(g.n > 1 ? g.n + " pages" : "page " + pageNo, x + colW - 12, yy, { font: th.body, size: 11, fill: th.soft, anchor: "end" });
    pageNo += g.n;
  });
  TH.footer(p, th);
  return p;
}

async function pdf(spec) {
  const b = build(spec);
  const sized = b.pages.map(c => ({ svg: c.page.svg(c.page.bg), w: c.page.w, h: c.page.h }));
  return OUT.pdfFromSvgs(sized);
}
function pageSVG(spec, i) { const b = build(spec); const c = b.pages[Math.max(0, Math.min(b.pages.length - 1, i | 0))]; return c ? c.page.svg(c.page.bg) : null; }
function pagePNG(spec, i, width) { return OUT.png(pageSVG(spec, i), width || 600); }
function pageList(spec) { return build(spec).pages.map((c, i) => ({ i, label: c.label, landscape: c.page.w > c.page.h })); }

// ---------- Etsy listing photos (4:3, rendered 2400 x 1800) ----------
function photoBase(th, o = {}) {
  const p = new Page(800, 600);
  p.rect(0, 0, 800, 600, { fill: o.bg || (th.style === "kids" ? tint(th.c[1], 0.86) : tint(th.c[0], 0.86)) });
  const r = rng(th.id + (o.seed || ""));
  if (th.style === "kids") for (let i = 0; i < 22; i++) p.circle(r() * 800, r() * 600, 3 + r() * 5, { fill: th.c[i % th.c.length], op: 0.35 });
  else { p.circle(700, 80, 160, { fill: tint(th.c[1], 0.8), op: 0.6 }); p.circle(60, 560, 120, { fill: tint(th.c[2], 0.6), op: 0.5 }); }
  return p;
}
function listingPhotos(spec) {
  const b = build(spec), th = b.th, title = clean(spec.title || "Printable"), content = b.pages.filter(c => c.label !== "Cover" && c.label !== "What's inside");
  const coverPage = b.pages[0].page, n = content.length, photos = [];
  const hf = th.head, bf = th.bold;
  // 1. hero
  {
    const p = photoBase(th, { seed: "hero" });
    const show = pickShowcase(content, 2);
    if (show[1]) embed(p, show[1].page, 196, 74, 0.56, { rot: 7 });
    if (show[0]) embed(p, show[0].page, 130, 64, 0.58, { rot: 3 });
    embed(p, coverPage, 30, 54, 0.62, { rot: -3 });
    const x = 480, ls = wrapLines(title, hf, 40, 290).slice(0, 4), size = ls.length > 3 ? 32 : 40;
    p.rect(466, 64, 318, 472, { fill: "#FFFFFF", op: 0.95, r: 24 });
    ls.forEach((l, i) => p.text(l, x + 145, 140 + i * size * 1.1, { font: hf, size: fitSize(l, hf, size, 290, 18), fill: th.style === "kids" ? th.c[0] : th.ink, anchor: "middle" }));
    let y = 150 + ls.length * size * 1.1;
    p.rect(x + 95, y - 6, 100, 4, { fill: th.c[1], r: 2 });
    [n + " printable pages", "Instant download", "Print at home", "US Letter and A4"].forEach((t, i) => { const yy = y + 40 + i * 40; p.circle(x + 20, yy - 6, 7, { fill: th.c[i % th.c.length] }); p.text(t, x + 38, yy, { font: bf, size: 20, fill: th.ink }); });
    photos.push(p);
  }
  // 2. what's inside grid
  {
    const p = photoBase(th, { seed: "grid", bg: th.bg === "#FFFFFF" ? tint(th.c[2], 0.9) : th.bg });
    p.text("What's inside", 400, 62, { font: hf, size: 38, fill: th.style === "kids" ? th.c[0] : th.ink, anchor: "middle" });
    p.text(n + " pages in one instant download", 400, 92, { font: bf, size: 16, fill: th.soft, anchor: "middle" });
    const show = pickShowcase(content, 10), cols = show.length > 6 ? 5 : Math.max(3, Math.ceil(show.length / 2)), sc = Math.min(0.24, 700 / cols / 612 * 0.92);
    const gw = 612 * sc, gh = 792 * sc, gapx = (760 - cols * gw) / (cols + 1);
    show.forEach((c, i) => { const rows = Math.ceil(show.length / cols), x = 20 + gapx + (i % cols) * (gw + gapx), y = 118 + Math.floor(i / cols) * (gh + 24) + (rows === 1 ? 80 : 0);
      const s = c.page.w > c.page.h ? gw / c.page.w : sc; embed(p, c.page, x, y + (c.page.w > c.page.h ? (gh - c.page.h * s) / 2 : 0), s, { sh: 0.4 });
      p.text(clean(c.label).slice(0, 26), x + gw / 2, y + gh + 15, { font: bf, size: 9.5, fill: th.ink, anchor: "middle" }); });
    photos.push(p);
  }
  // 3-5. close-ups, two pages each
  const show = pickShowcase(content, 6);
  for (let k = 0; k < 3 && show.length > k * 2; k++) {
    const p = photoBase(th, { seed: "close" + k });
    const pair = show.slice(k * 2, k * 2 + 2);
    pair.forEach((c, i) => { const land = c.page.w > c.page.h, s = land ? 350 / c.page.w : 0.6, pw = c.page.w * s, x = pair.length === 1 ? 400 - pw / 2 : (i === 0 ? 392 - pw : 408), y = 40 + (land ? 130 : 0);
      embed(p, c.page, x, y, s);
      p.rect(x + 10, 566 - 28, Math.min(320, measure(clean(c.label), bf, 14) + 28), 28, { fill: "#FFFFFF", r: 14, op: 0.95 });
      p.text(clean(c.label), x + 24, 566 - 9, { font: bf, size: 14, fill: th.ink }); });
    photos.push(p);
  }
  // 6. details
  {
    const p = photoBase(th, { seed: "details", bg: "#FFFFFF" });
    p.rect(30, 30, 740, 540, { fill: th.bg === "#FFFFFF" ? tint(th.c[0], 0.92) : th.bg, r: 30 });
    p.text("How it works", 400, 100, { font: hf, size: 40, fill: th.style === "kids" ? th.c[0] : th.ink, anchor: "middle" });
    [["1", "Buy", "Checkout on Etsy"], ["2", "Download", "Your PDF is ready right away"], ["3", "Print", "At home or at any print shop"]].forEach(([nn, a, b2], i) => {
      const cx = 160 + i * 240; p.circle(cx, 200, 46, { fill: th.c[i % th.c.length] }); p.text(nn, cx, 216, { font: hf, size: 44, fill: "#FFFFFF", anchor: "middle" });
      p.text(a, cx, 284, { font: bf, size: 24, fill: th.ink, anchor: "middle" }); p.text(b2, cx, 312, { font: th.body, size: 14, fill: th.soft, anchor: "middle" });
    });
    p.line(120, 360, 680, 360, { stroke: tint(th.ink, 0.8), sw: 1 });
    ["PDF file - " + n + " pages", "Fits US Letter (8.5 x 11 in) and A4", "Print as many copies as you need for your family or class", "This is a digital file. Nothing will be shipped."].forEach((t, i) => {
      p.circle(140, 400 + i * 38 - 6, 5, { fill: th.c[1] }); p.text(t, 158, 400 + i * 38, { font: th.body, size: 17, fill: th.ink });
    });
    photos.push(p);
  }
  return photos.map(p => p.svg(p.bg));
}
function listingPNGs(spec, width) { return listingPhotos(spec).map(s => OUT.png(s, width || 2400)); }

function listingDesc(spec) {
  const b = build(spec), content = b.pages.filter(c => c.label !== "Cover" && c.label !== "What's inside"), groups = groupLabels(content);
  const L = spec.listing || {};
  const intro = clean(L.description || spec.subtitle || spec.title);
  return [intro, "", "WHAT'S INCLUDED", ...groups.map(g => "- " + g.base + (g.n > 1 ? " (" + g.n + " pages)" : "")), "", "Total: " + content.length + " printable pages in one PDF.",
    "", "HOW IT WORKS", "1. Buy and download the PDF from your Etsy Purchases page.", "2. Print at home or at a print shop on US Letter or A4 paper.", "3. Print as many copies as you need for your own family or classroom.",
    "", "PLEASE NOTE", "- This is a digital download. No physical item will be shipped.", "- Colors may look slightly different depending on your screen and printer.", "- For personal and classroom use only. Please do not resell or share the files."].join("\n");
}
module.exports = { build, pdf, pageSVG, pagePNG, pageList, listingPhotos, listingPNGs, listingDesc, TEMPLATES, embed };
