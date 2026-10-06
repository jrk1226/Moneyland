// Art packs: clipart bundles, sticker sheets, sublimation / shirt designs and product labels.
// The pictures are made by ChatGPT (see api/_artgoods.js) and kept in storage; before rendering,
// spec._img is filled with { [index]: { thumb: Buffer, full: Buffer? } } (see hydrate()).
const { Page, measure, fitSize, wrapLines, tint, rng, clean } = require("./core");
const OUT = require("./output");

const KINDS = {
  clipart: { name: "Clipart bundle", unit: "PNG clipart" },
  stickers: { name: "Printable sticker sheets", unit: "stickers" },
  sublimation: { name: "Sublimation designs", unit: "designs" },
  labels: { name: "Printable labels", unit: "label designs" },
};
// Sizes the buyer gets (pixels are honest: what the files really are)
const SUB = {
  tumbler: { label: "20 oz skinny tumbler wrap", inW: 9.3, inH: 8.2, gen: "2048x1808" },
  shirt: { label: "shirt / tote design", inW: 12, inH: 12, gen: "2048x2048" },
  mug: { label: "11 oz mug wrap", inW: 8.5, inH: 3.5, gen: "2048x848" },
};
const LABELS = {
  round: { label: "2.5 inch round labels, 12 per sheet", cols: 3, rows: 4, w: 180, h: 180, round: true, top: 54, left: 27, gx: 18, gy: 9 },
  rect: { label: "4 x 2 inch labels, 10 per sheet", cols: 2, rows: 5, w: 288, h: 144, round: false, top: 36, left: 11, gx: 14, gy: 0 },
};
const PAL = { bg: "#F6F3EE", ink: "#2B2622", soft: "#7A706A", accent: "#C8673F", card: "#FFFFFF" };
const HF = "playfair-display-700", BF = "poppins-600", RF = "poppins-400";

const items = spec => (spec.items || []).filter(it => it.ok);
const thumb = (spec, i) => spec._img && spec._img[i] && spec._img[i].thumb;
function okList(spec) { return (spec.items || []).map((it, i) => ({ it, i })).filter(x => x.it.ok && thumb(spec, x.i)); }
function countText(spec) {
  const n = okList(spec).length || items(spec).length, k = spec.kind;
  if (k === "clipart") return n + " PNG clipart images";
  if (k === "stickers") return n + " stickers";
  if (k === "sublimation") return n + (n > 1 ? " designs" : " design");
  return n + (n > 1 ? " label designs" : " label design");
}
// checkerboard so buyers see the background is transparent
function checker(p, x, y, w, h, s) {
  p.rect(x, y, w, h, { fill: "#FFFFFF" });
  for (let yy = 0; yy < h; yy += s) for (let xx = (Math.floor(yy / s) % 2) * s; xx < w; xx += 2 * s) p.rect(x + xx, y + yy, Math.min(s, w - xx), Math.min(s, h - yy), { fill: "#EEF0F3" });
}
function base(seed, bg) {
  const p = new Page(800, 600), r = rng(seed);
  p.rect(0, 0, 800, 600, { fill: bg || PAL.bg });
  p.circle(720, 70, 170, { fill: tint(PAL.accent, 0.82), op: 0.5 }); p.circle(40, 570, 130, { fill: tint("#8E9B78", 0.75), op: 0.45 });
  return p;
}
function titleCard(p, spec, x, y, w) {
  const title = clean(spec.title || "Art pack"), ls = wrapLines(title, HF, 34, w - 40).slice(0, 4);
  const h = 120 + ls.length * 40 + 4 * 34;
  p.rect(x, y, w, h, { fill: "#FFFFFF", op: 0.96, r: 22 });
  ls.forEach((l, i) => p.text(l, x + w / 2, y + 60 + i * 40, { font: HF, size: fitSize(l, HF, 34, w - 40, 18), fill: PAL.ink, anchor: "middle" }));
  let yy = y + 70 + ls.length * 40;
  p.rect(x + w / 2 - 40, yy - 8, 80, 3, { fill: PAL.accent, r: 2 });
  bullets(spec).forEach((t, i) => { p.circle(x + 34, yy + 30 + i * 34 - 6, 6, { fill: [PAL.accent, "#8E9B78", "#E3A86B", "#6E3B2A"][i % 4] }); p.text(t, x + 50, yy + 30 + i * 34, { font: BF, size: 16, fill: PAL.ink }); });
}
function bullets(spec) {
  const k = spec.kind;
  if (k === "clipart") return [countText(spec), "Transparent PNG, 300 DPI", "Commercial use OK", "Instant download"];
  if (k === "stickers") return [countText(spec), "Print and cut sheets + PNGs", "US Letter and A4", "Instant download"];
  if (k === "sublimation") { const S = SUB[spec.product] || SUB.shirt; return [countText(spec), S.label, "PNG, 300 DPI", "Commercial use OK"]; }
  const L = LABELS[spec.shape] || LABELS.round; return [countText(spec), L.label, "Type your text, then print", "Instant download"];
}

// ---------- listing photos (800 x 600 design units, rendered 2400 x 1800) ----------
function heroPhoto(spec) {
  const p = base("hero" + spec.title), L = okList(spec).slice(0, 7);
  const spots = [[60, 50, 210], [250, 30, 190], [70, 300, 230], [270, 250, 200], [140, 170, 170], [30, 430, 150], [300, 440, 140]];
  L.forEach((x, k) => { const [sx, sy, s] = spots[k]; drawItem(p, spec, x.i, sx, sy, s); });
  titleCard(p, spec, 480, 60, 290);
  return p;
}
function drawItem(p, spec, i, x, y, s) {
  const t = thumb(spec, i); if (!t) return;
  if (spec.kind === "stickers") { p.rect(x + 4, y + 6, s, s, { fill: "#000", op: 0.06, r: s * 0.18 }); }
  if (spec.kind === "sublimation" && spec.product !== "shirt") { p.rect(x, y, s, s, { fill: "#FFFFFF", r: 8 }); p.image(t, x + 4, y + 4, s - 8, s - 8, { fit: "cover" }); return; }
  if (spec.kind === "labels") { const L = LABELS[spec.shape] || LABELS.round; const id = "lc" + Math.round(x) + "_" + Math.round(y);
    p.add(L.round ? `<clipPath id="${id}"><circle cx="${x + s / 2}" cy="${y + s / 2}" r="${s / 2}"/></clipPath>` : `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${s}" height="${s / 2}" rx="10"/></clipPath>`);
    p.add(`<g clip-path="url(#${id})">`); p.image(t, x, y, s, L.round ? s : s / 2, { fit: "cover" }); p.add("</g>");
    if (L.round) p.circle(x + s / 2, y + s / 2, s / 2, { stroke: "#E3DED8", sw: 1 }); else p.rect(x, y, s, s / 2, { r: 10, stroke: "#E3DED8", sw: 1 });
    return; }
  p.image(t, x, y, s, s);
}
function gridPhoto(spec, list, title, seed) {
  const p = base("grid" + seed, "#FFFFFF");
  p.text(title, 400, 58, { font: HF, size: 34, fill: PAL.ink, anchor: "middle" });
  const n = list.length, cols = n > 20 ? 6 : n > 12 ? 5 : n > 6 ? 4 : 3, rows = Math.ceil(n / cols);
  const cell = Math.min((740 - (cols - 1) * 12) / cols, (500 - (rows - 1) * 12) / rows), gw = cols * cell + (cols - 1) * 12, x0 = 400 - gw / 2, y0 = 90 + (500 - (rows * cell + (rows - 1) * 12)) / 2;
  list.forEach((x, k) => { const cx = x0 + (k % cols) * (cell + 12), cy = y0 + Math.floor(k / cols) * (cell + 12);
    if (spec.kind === "clipart") checker(p, cx, cy, cell, cell, Math.max(6, cell / 10)); else p.rect(cx, cy, cell, cell, { fill: "#F7F5F2", r: 10 });
    drawItem(p, spec, x.i, cx + cell * 0.06, cy + cell * 0.06, cell * 0.88); });
  return p;
}
function mockupPhoto(spec) {
  const p = base("mock" + spec.title), first = okList(spec)[0];
  if (!first) return p;
  const t = thumb(spec, first.i);
  if (spec.kind === "sublimation" && spec.product === "tumbler") {
    // simple skinny tumbler drawing with the wrap on it
    const x = 280, y = 70, w = 240, h = 460;
    p.rect(x - 6, y - 26, w + 12, 34, { fill: "#D9D6D2", r: 10 }); p.rect(x + 70, y - 40, 22, 30, { fill: "#C9C5C0", r: 6 });
    p.add(`<clipPath id="tb"><path d="M${x} ${y} L${x + w} ${y} L${x + w - 22} ${y + h} L${x + 22} ${y + h} Z"/></clipPath>`);
    p.add(`<g clip-path="url(#tb)">`); p.image(t, x - 60, y, w + 120, h, { fit: "cover" }); p.add("</g>");
    p.path(`M${x} ${y} L${x + w} ${y} L${x + w - 22} ${y + h} L${x + 22} ${y + h} Z`, { stroke: "#BDB8B2", sw: 2 });
    p.rect(x + 30, y + 10, 18, h - 30, { fill: "#FFFFFF", op: 0.25, r: 9 });
  } else if (spec.kind === "sublimation" && spec.product === "mug") {
    p.rect(200, 180, 360, 280, { fill: "#FFFFFF", r: 24, stroke: "#DAD5CF", sw: 2 }); p.path("M560 230 C 660 230 660 410 560 410", { stroke: "#DAD5CF", sw: 26, cap: "round" });
    p.image(t, 214, 230, 332, 180, { fit: "cover" });
  } else if (spec.kind === "sublimation") {
    const shirt = "M300 110 L360 90 Q400 130 440 90 L500 110 L590 170 L555 240 L515 220 L515 520 L285 520 L285 220 L245 240 L210 170 Z";
    p.path(shirt, { fill: "#FFFFFF", stroke: "#D8D3CD", sw: 2 }); p.image(t, 320, 180, 160, 160);
  } else if (spec.kind === "stickers") {
    p.rect(190, 40, 420, 540, { fill: "#FFFFFF", r: 8 }); p.rect(196, 48, 420, 540, { fill: "#000", op: 0.05, r: 8 });
    const L = okList(spec).slice(0, 12); L.forEach((x, k) => drawItem(p, spec, x.i, 215 + (k % 3) * 130, 70 + Math.floor(k / 3) * 125, 110));
  } else if (spec.kind === "labels") {
    const L = LABELS[spec.shape] || LABELS.round;
    p.rect(200, 30, 400, 540, { fill: "#FFFFFF", r: 6 });
    for (let r = 0; r < L.rows; r++) for (let c = 0; c < L.cols; c++) { const s = L.round ? 112 : 180, x = 215 + c * (L.round ? 126 : 190), y = 50 + r * (L.round ? 128 : 104); drawItem(p, spec, okList(spec)[(r * L.cols + c) % okList(spec).length].i, x, y, s); }
  } else {
    checker(p, 220, 60, 360, 360, 24); p.image(t, 240, 80, 320, 320);
    p.rect(220, 440, 360, 90, { fill: "#FFFFFF", r: 14 }); p.text("Transparent background", 400, 480, { font: BF, size: 22, fill: PAL.ink, anchor: "middle" }); p.text("Use it on any color or photo", 400, 510, { font: RF, size: 15, fill: PAL.soft, anchor: "middle" });
  }
  return p;
}
function detailsPhoto(spec) {
  const p = base("details" + spec.title, "#FFFFFF");
  p.rect(30, 30, 740, 540, { fill: PAL.bg, r: 30 });
  p.text("What you get", 400, 100, { font: HF, size: 40, fill: PAL.ink, anchor: "middle" });
  const lines = whatYouGet(spec);
  lines.forEach((t, i) => { p.circle(130, 170 + i * 44 - 6, 6, { fill: PAL.accent }); p.text(t, 150, 170 + i * 44, { font: RF, size: 18, fill: PAL.ink }); });
  p.text("Digital download. Nothing is shipped.", 400, 540, { font: BF, size: 15, fill: PAL.soft, anchor: "middle" });
  return p;
}
function whatYouGet(spec) {
  const n = okList(spec).length || items(spec).length;
  if (spec.kind === "clipart") return [n + " separate PNG files, transparent background", "2048 x 2048 px, 300 DPI (about 6.8 inches)", "One ZIP folder plus a preview sheet", "Personal and small business commercial use", "Use for cards, stickers, invitations, crafts and more"];
  if (spec.kind === "stickers") return ["Sticker sheets ready to print (US Letter PDF)", n + " separate PNG stickers with a white border", "Works with print-then-cut machines", "Print on sticker paper at home", "Personal and small business commercial use"];
  if (spec.kind === "sublimation") { const S = SUB[spec.product] || SUB.shirt; return [n + " PNG design" + (n > 1 ? "s" : "") + " for a " + S.label, Math.round(S.inW * 300) + " x " + Math.round(S.inH * 300) + " px at 300 DPI (" + S.inW + " x " + S.inH + " in)", spec.product === "shirt" ? "Transparent background" : "Full wrap, edge to edge", "For sublimation, DTF and print shops", "Personal and small business commercial use"]; }
  const L = LABELS[spec.shape] || LABELS.round;
  return ["Editable PDF: click and type your text", L.label + " (US Letter sheet)", n + " label design" + (n > 1 ? "s" : "") + " included", "For candles, jars, soap, gifts and homemade goods", "Print on label sheets or sticker paper"];
}
function listingPhotos(spec) {
  const L = okList(spec), photos = [heroPhoto(spec)];
  photos.push(gridPhoto(spec, L, spec.kind === "labels" ? "Label designs" : spec.kind === "sublimation" ? "The designs" : "Everything in this pack", "all"));
  photos.push(mockupPhoto(spec));
  if (L.length > 8) { photos.push(gridPhoto(spec, L.slice(0, 4), "Close up", "c1")); photos.push(gridPhoto(spec, L.slice(4, 8), "Close up", "c2")); }
  photos.push(detailsPhoto(spec));
  return photos.map(p => p.svg(PAL.bg));
}
// Page previews for the website and the AI check: the photos double as previews.
function pageList(spec) { return listingPhotos(spec).map((s, i) => ({ i, label: ["Cover", "All items", "Mockup", "Close up", "Close up", "Details"][i] || "Page " + (i + 1) })); }
function pageSVGs(spec) { return listingPhotos(spec); }

function listingDesc(spec) {
  const L = spec.listing || {};
  return [clean(L.description || spec.subtitle || spec.title), "", "WHAT YOU GET", ...whatYouGet(spec).map(t => "- " + t), "",
    "HOW IT WORKS", "1. Buy and download the files from your Etsy Purchases page.", "2. Unzip the folder on a computer.", spec.kind === "labels" ? "3. Open the PDF, click a label and type your text, then print." : "3. Use the files in your favorite design app or cutting machine software.", "",
    "LICENSE", "- You may use the designs in things you make and sell (finished products, physical or digital), up to 500 sales per design.", "- You may not resell, share or give away the files themselves, or use them in print-on-demand listings.", "",
    "HOW IT IS MADE", "Designed by Bright Page Prints with the help of AI tools: ChatGPT creates the artwork and Claude checks every image before it is listed.", "",
    "PLEASE NOTE", "- This is a digital download. No physical item will be shipped.", "- Colors may look slightly different on screen and when printed."].join("\n");
}

// ---------- download files (needs spec._img[i].full) ----------
const sharpLib = () => require("sharp");
async function at300(buf, w, h) { return sharpLib()(buf).resize(w, h, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: "lanczos3" }).withMetadata({ density: 300 }).png({ compressionLevel: 8 }).toBuffer(); }
async function stickerize(buf, size) {
  // white border around the shape (die-cut look)
  const sharp = sharpLib(), img = await sharp(buf).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().png().toBuffer();
  const pad = Math.round(size * 0.05), W = size + pad * 2;
  const alpha = await sharp(img).extractChannel(3).extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0 } }).blur(pad * 0.6).threshold(8).toColourspace("b-w").raw().toBuffer();
  const white = await sharp({ create: { width: W, height: W, channels: 3, background: "#FFFFFF" } }).joinChannel(alpha, { raw: { width: W, height: W, channels: 1 } }).png().toBuffer();
  return sharp(white).composite([{ input: img, left: pad, top: pad }]).withMetadata({ density: 300 }).png().toBuffer();
}
function zip(files) { const JSZip = require("jszip"), z = new JSZip(); files.forEach(f => z.file(f.name, f.buf)); return z.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }); }
const safe = (s, n) => clean(s || "file").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, n || 40) || "file";
function pdfDoc() { const PDFDocument = require("pdfkit"); return new PDFDocument({ size: "LETTER", margin: 0, autoFirstPage: false, info: { Title: "Printable", Producer: "Moneyland" } }); }
function finish(doc) { return new Promise((res, rej) => { const ch = []; doc.on("data", c => ch.push(c)); doc.on("end", () => res(Buffer.concat(ch))); doc.on("error", rej); }); }
async function previewSheetPDF(spec) {
  const doc = pdfDoc(), done = finish(doc), L = okList(spec);
  for (let pg = 0; pg < Math.ceil(L.length / 20); pg++) {
    doc.addPage(); doc.fontSize(14).fillColor("#2B2622").text(clean(spec.title) + " - preview sheet", 36, 30);
    L.slice(pg * 20, pg * 20 + 20).forEach((x, k) => { const c = k % 4, r = Math.floor(k / 4), X = 36 + c * 138, Y = 64 + r * 140; doc.image(spec._img[x.i].thumb, X, Y, { fit: [128, 118], align: "center", valign: "center" }); doc.fontSize(7).fillColor("#7A706A").text(clean(x.it.name || x.it.subject).slice(0, 34), X, Y + 120, { width: 128, align: "center" }); });
  }
  doc.end(); return done;
}
async function downloadFiles(spec) {
  const L = okList(spec).filter(x => spec._img[x.i].full), base = safe(spec.title);
  if (spec.kind === "clipart") {
    const pngs = []; for (const x of L) pngs.push({ name: safe(x.it.name || x.it.subject, 30) + "-" + (x.i + 1) + ".png", buf: await at300(spec._img[x.i].full, 2048, 2048) });
    return [{ name: base + "-clipart.zip", buf: await zip(pngs), type: "application/zip" }, { name: base + "-preview.pdf", buf: await previewSheetPDF(spec), type: "application/pdf" }];
  }
  if (spec.kind === "stickers") {
    const pngs = []; for (const x of L) pngs.push({ name: safe(x.it.name || x.it.subject, 30) + "-" + (x.i + 1) + ".png", buf: await stickerize(spec._img[x.i].full, 900) });
    const doc = pdfDoc(), done = finish(doc);
    for (let pg = 0; pg < Math.ceil(pngs.length / 12); pg++) {
      doc.addPage();
      pngs.slice(pg * 12, pg * 12 + 12).forEach((f, k) => { const c = k % 3, r = Math.floor(k / 3); doc.image(f.buf, 54 + c * 174, 54 + r * 172, { fit: [156, 156], align: "center", valign: "center" }); });
      doc.fontSize(7).fillColor("#9A9089").text("Print at 100% (actual size) on sticker paper.", 54, 750);
    }
    doc.end();
    return [{ name: base + "-sticker-sheets.pdf", buf: await done, type: "application/pdf" }, { name: base + "-sticker-pngs.zip", buf: await zip(pngs), type: "application/zip" }];
  }
  if (spec.kind === "sublimation") {
    const S = SUB[spec.product] || SUB.shirt, W = Math.round(S.inW * 300), H = Math.round(S.inH * 300), pngs = [];
    for (const x of L) { const buf = spec.product === "shirt" ? await at300(spec._img[x.i].full, W, H) : await sharpLib()(spec._img[x.i].full).resize(W, H, { fit: "cover", kernel: "lanczos3" }).withMetadata({ density: 300 }).png().toBuffer();
      pngs.push({ name: safe(x.it.name || x.it.subject, 30) + "-" + W + "x" + H + ".png", buf }); }
    return pngs.length > 2 ? [{ name: base + "-designs.zip", buf: await zip(pngs), type: "application/zip" }] : pngs.map(f => Object.assign(f, { type: "image/png" }));
  }
  // labels: editable PDF, one sheet per design, a text box on every label
  const Lb = LABELS[spec.shape] || LABELS.round, doc = pdfDoc(), done = finish(doc);
  doc.initForm();
  let fieldN = 0;
  for (const x of L) {
    doc.addPage();
    for (let r = 0; r < Lb.rows; r++) for (let c = 0; c < Lb.cols; c++) {
      const X = Lb.left + c * (Lb.w + Lb.gx), Y = Lb.top + r * (Lb.h + Lb.gy);
      doc.save();
      if (Lb.round) doc.circle(X + Lb.w / 2, Y + Lb.h / 2, Lb.w / 2).clip(); else doc.roundedRect(X, Y, Lb.w, Lb.h, 8).clip();
      doc.image(spec._img[x.i].full, X, Y, { width: Lb.w, height: Lb.h });
      doc.restore();
      if (Lb.round) doc.circle(X + Lb.w / 2, Y + Lb.h / 2, Lb.w / 2).lineWidth(0.3).strokeColor("#D0CAC4").stroke(); else doc.roundedRect(X, Y, Lb.w, Lb.h, 8).lineWidth(0.3).strokeColor("#D0CAC4").stroke();
      const fw = Lb.w * (Lb.round ? 0.62 : 0.6), fx = X + (Lb.w - fw) / 2, fy = Y + Lb.h * 0.36;
      fieldN++;
      doc.formText("name" + fieldN, fx, fy, fw, Lb.h * 0.16, { align: "center", fontSize: 0, value: (spec.labelText && spec.labelText[0]) || "Your Product", backgroundColor: "transparent", borderColor: "transparent" });
      doc.formText("line" + fieldN, fx, fy + Lb.h * 0.17, fw, Lb.h * 0.12, { align: "center", fontSize: 0, value: (spec.labelText && spec.labelText[1]) || "details here", backgroundColor: "transparent", borderColor: "transparent" });
    }
  }
  doc.end();
  return [{ name: base + "-editable-labels.pdf", buf: await done, type: "application/pdf" }];
}

module.exports = { KINDS, SUB, LABELS, listingPhotos, pageList, pageSVGs, listingDesc, downloadFiles, whatYouGet, okList, stickerize };
