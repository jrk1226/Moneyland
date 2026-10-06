// Turns page SVGs into a print PDF (vector) or PNG/JPG images.
const PDFDocument = require("pdfkit");
const SVGtoPDF = require("svg-to-pdfkit");
const { Resvg } = require("@resvg/resvg-js");

function pdfFromSvgs(svgs, w, h) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [w || 612, h || 792], margin: 0, autoFirstPage: false, compress: true,
      info: { Title: "Printable", Producer: "Moneyland" } });
    const chunks = [];
    doc.on("data", c => chunks.push(c)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject);
    try {
      svgs.forEach(s => {
        const sw = s.w || w || 612, sh = s.h || h || 792;
        doc.addPage({ size: [sw, sh], margin: 0 });
        SVGtoPDF(doc, s.svg || s, 0, 0, { width: sw, height: sh, assumePt: true });
      });
      doc.end();
    } catch (e) { reject(e); }
  });
}
function png(svg, width) {
  return new Resvg(svg, { fitTo: { mode: "width", value: Math.round(width) }, font: { loadSystemFonts: false }, shapeRendering: 2, imageRendering: 0 }).render().asPng();
}
async function jpg(svg, width, quality) {
  const sharp = require("sharp");
  return sharp(png(svg, width)).flatten({ background: "#ffffff" }).jpeg({ quality: quality || 90, mozjpeg: true }).withMetadata({ density: 300 }).toBuffer();
}
module.exports = { pdfFromSvgs, png, jpg };
