// Server-side rendering with the Moneyland design engine (lib/design): the print files and Etsy listing photos.
const B = require("../lib/design/book");
const WA = require("../lib/design/wallart");
const OUT = require("../lib/design/output");
const { clean } = require("../lib/design/core");

const isArt = spec => spec && spec.category === "wallart";
// Download files for Etsy: [{name, buf, type}] (max 5).
async function downloadFiles(spec) {
  if (isArt(spec)) return WA.files(spec);
  const name = String(spec.title || "printable").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) + ".pdf";
  return [{ name, buf: await B.pdf(spec), type: "application/pdf" }];
}
async function pdfBuffer(spec) { return isArt(spec) ? null : B.pdf(spec); }
// Listing photos as PNG buffers, 2400 x 1800 (max 10).
function listingImages(spec, width) {
  const svgs = isArt(spec) ? WA.listingPhotos(spec) : B.listingPhotos(spec);
  return svgs.slice(0, 10).map(s => Buffer.from(OUT.png(s, width || 2400)));
}
function listingPNG(spec) { return listingImages(spec)[0]; }
function listingDesc(spec) {
  if (!isArt(spec)) return B.listingDesc(spec);
  const L = spec.listing || {}, n = (spec.prints || []).length;
  return [clean(L.description || spec.subtitle || spec.title), "", "WHAT YOU GET", "- " + n + (n > 1 ? " prints" : " print") + " in 5 ratio files (ZIP folders of 300 DPI JPGs)",
    ...WA.RATIOS.map(r => "- " + r.label), "", "HOW IT WORKS", "1. Buy and download the files from your Etsy Purchases page.", "2. Print at home, at a local print shop or with an online printing service.", "3. Frame and enjoy.",
    "", "PLEASE NOTE", "- This is a digital download. No physical print or frame will be shipped.", "- Colors can vary slightly between screens and printers.", "- For personal use only. Please do not resell or share the files."].join("\n");
}
// Page previews for the website.
function previewList(spec) { return isArt(spec) ? (spec.prints || []).map((p, i) => ({ i, label: "Print " + (i + 1) })) : B.pageList(spec); }
function previewPNG(spec, i, width) {
  if (isArt(spec)) { const a = WA.artSVG((spec.prints || [])[i | 0] || {}, spec.palette, "3x4"); return Buffer.from(OUT.png(a.svg, width || 500)); }
  return Buffer.from(B.pagePNG(spec, i, width || 500));
}
function photoPNG(spec, i, width) { const svgs = isArt(spec) ? WA.listingPhotos(spec) : B.listingPhotos(spec); return Buffer.from(OUT.png(svgs[Math.min(svgs.length - 1, i | 0)], width || 900)); }
function photoCount(spec) { return (isArt(spec) ? WA.listingPhotos(spec) : B.listingPhotos(spec)).length; }
module.exports = { downloadFiles, pdfBuffer, listingImages, listingPNG, listingDesc, previewList, previewPNG, photoPNG, photoCount, clean, isArt };
