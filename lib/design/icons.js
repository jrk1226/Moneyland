// Hand-built vector illustrations on a 100 x 100 grid.
// Each part: [shape, fill, extra]. Fill is a hex color, or a palette role: A, B, C (theme accents), W (white), L (light A), N (none).
// shape is an SVG path (absolute M L C Q A Z only) or {c:[cx,cy,r]} / {e:[cx,cy,rx,ry]}.
// "line" parts are strokes only. outline: one closed path (M L C Q Z) used for dot-to-dot.
const I = {};
const def = (name, parts, opt) => { I[name] = Object.assign({ name, parts }, opt || {}); };

def("star", [["M50 6 L61.8 37.6 L95.1 39 L69 59.9 L77.9 92.1 L50 73.6 L22.1 92.1 L31 59.9 L4.9 39 L38.2 37.6 Z", "#FFC93C"]],
  { outline: "M50 6 L61.8 37.6 L95.1 39 L69 59.9 L77.9 92.1 L50 73.6 L22.1 92.1 L31 59.9 L4.9 39 L38.2 37.6 Z", word: "star" });
def("heart", [["M50 88 C20 66 6 48 6 32 C6 18 17 8 30 8 C39 8 46 13 50 21 C54 13 61 8 70 8 C83 8 94 18 94 32 C94 48 80 66 50 88 Z", "#F25F7A"]],
  { outline: "M50 88 C20 66 6 48 6 32 C6 18 17 8 30 8 C39 8 46 13 50 21 C54 13 61 8 70 8 C83 8 94 18 94 32 C94 48 80 66 50 88 Z", word: "heart" });
def("moon", [["M60 8 A42 42 0 1 0 92 72 A34 34 0 1 1 60 8 Z", "#FFD95A"]], { word: "moon" });
def("sun", [
  ["M50 2 L56 18 L44 18 Z", "#FFB627"], ["M50 98 L56 82 L44 82 Z", "#FFB627"], ["M2 50 L18 44 L18 56 Z", "#FFB627"], ["M98 50 L82 44 L82 56 Z", "#FFB627"],
  ["M16 16 L30 24 L24 30 Z", "#FFB627"], ["M84 16 L76 30 L70 24 Z", "#FFB627"], ["M16 84 L24 70 L30 76 Z", "#FFB627"], ["M84 84 L70 76 L76 70 Z", "#FFB627"],
  [{ c: [50, 50, 26] }, "#FFD23F"]], { word: "sun" });
def("cloud", [["M24 76 C8 76 4 60 15 53 C11 39 27 31 37 37 C41 22 63 19 70 34 C84 30 97 44 88 57 C98 63 92 77 80 76 Z", "#DDEFFF"]],
  { outline: "M24 76 C8 76 4 60 15 53 C11 39 27 31 37 37 C41 22 63 19 70 34 C84 30 97 44 88 57 C98 63 92 77 80 76 Z", word: "cloud" });
def("flower", [
  ["M50 96 L50 58", "line", "#4CAF50"], ["M50 80 C38 70 30 72 26 76 C34 84 44 84 50 80 Z", "#5DBB63"],
  [{ c: [50, 22, 13] }, "A"], [{ c: [68, 32, 13] }, "A"], [{ c: [68, 52, 13] }, "A"], [{ c: [50, 62, 13] }, "A"], [{ c: [32, 52, 13] }, "A"], [{ c: [32, 32, 13] }, "A"],
  [{ c: [50, 42, 12] }, "#FFC93C"]], { word: "flower" });
def("leaf", [["M50 94 C18 72 16 30 50 6 C84 30 82 72 50 94 Z", "#6BBF59"], ["M50 92 L50 16", "line"], ["M50 40 L36 30", "line"], ["M50 56 L66 44", "line"], ["M50 70 L36 60", "line"]],
  { outline: "M50 94 C18 72 16 30 50 6 C84 30 82 72 50 94 Z", word: "leaf" });
def("tree", [["M44 74 L56 74 L56 96 L44 96 Z", "#9C6B3F"], ["M50 4 L82 40 L18 40 Z", "#3FA34D"], ["M50 22 L88 60 L12 60 Z", "#3FA34D"], ["M50 40 L94 80 L6 80 Z", "#3FA34D"]],
  { outline: "M50 4 L64 20 L60 22 L76 38 L70 40 L88 60 L80 60 L94 80 L56 80 L56 96 L44 96 L44 80 L6 80 L20 60 L12 60 L30 40 L24 38 L40 22 L36 20 Z", word: "tree" });
def("apple", [["M50 28 C34 16 10 22 10 50 C10 76 30 96 42 92 C46 91 48 89 50 89 C52 89 54 91 58 92 C70 96 90 76 90 50 C90 22 66 16 50 28 Z", "#E84A4A"],
  ["M50 28 C50 18 52 10 58 6", "line", "#7A4B2A"], ["M54 18 C60 8 74 8 78 12 C72 20 62 22 54 18 Z", "#5DBB63"]],
  { outline: "M50 28 C34 16 10 22 10 50 C10 76 30 96 42 92 C46 91 48 89 50 89 C52 89 54 91 58 92 C70 96 90 76 90 50 C90 22 66 16 50 28 Z", word: "apple" });
def("balloon", [["M50 72 C26 70 16 50 16 36 C16 16 32 4 50 4 C68 4 84 16 84 36 C84 50 74 70 50 72 Z", "A"], ["M50 72 L44 80 L56 80 Z", "A"], ["M50 80 C44 86 56 90 50 98", "line"],
  ["M34 22 C38 16 44 13 50 12", "line", "#FFFFFF"]],
  { outline: "M50 72 C26 70 16 50 16 36 C16 16 32 4 50 4 C68 4 84 16 84 36 C84 50 74 70 50 72 Z", word: "balloon" });
def("gift", [["M12 40 L88 40 L88 92 L12 92 Z", "A"], ["M8 28 L92 28 L92 42 L8 42 Z", "A"], ["M44 28 L56 28 L56 92 L44 92 Z", "B"],
  ["M50 28 C40 8 20 12 28 24 C32 28 42 28 50 28 Z", "B"], ["M50 28 C60 8 80 12 72 24 C68 28 58 28 50 28 Z", "B"]],
  { outline: "M12 40 L8 40 L8 28 L28 28 C20 12 40 8 50 28 C60 8 80 12 72 28 L92 28 L92 40 L88 40 L88 92 L12 92 Z", word: "gift" });
def("snowflake", [["M50 6 L50 94", "line", "#4FA3D9"], ["M12 28 L88 72", "line", "#4FA3D9"], ["M12 72 L88 28", "line", "#4FA3D9"],
  ["M40 12 L50 22 L60 12", "line", "#4FA3D9"], ["M40 88 L50 78 L60 88", "line", "#4FA3D9"], ["M14 40 L26 34 L22 22", "line", "#4FA3D9"], ["M86 60 L74 66 L78 78", "line", "#4FA3D9"],
  ["M86 40 L74 34 L78 22", "line", "#4FA3D9"], ["M14 60 L26 66 L22 78", "line", "#4FA3D9"]], { word: "snowflake", lineW: 6 });
def("house", [["M18 46 L82 46 L82 92 L18 92 Z", "#FFD9A0"], ["M8 50 L50 12 L92 50 Z", "#E86A4A"], ["M42 64 L58 64 L58 92 L42 92 Z", "#8B5E3C"],
  ["M24 56 L36 56 L36 68 L24 68 Z", "#BDE4FF"], ["M64 56 L76 56 L76 68 L64 68 Z", "#BDE4FF"]],
  { outline: "M8 50 L50 12 L92 50 L82 50 L82 92 L18 92 L18 50 Z", word: "house" });
def("car", [["M8 66 L8 52 C8 46 12 44 18 44 L28 44 L38 28 C40 26 42 25 46 25 L64 25 C68 25 70 26 72 29 L82 44 C90 44 94 48 94 54 L94 66 Z", "A"],
  ["M42 31 L60 31 L60 44 L33 44 Z", "#CFEFFF"], ["M65 31 C67 31 68 32 69 34 L75 44 L65 44 Z", "#CFEFFF"], [{ c: [28, 68, 10] }, "#333333"], [{ c: [74, 68, 10] }, "#333333"],
  [{ c: [28, 68, 4] }, "#DDDDDD"], [{ c: [74, 68, 4] }, "#DDDDDD"]], { word: "car" });
def("fish", [["M14 50 C28 26 62 22 80 50 C62 78 28 74 14 50 Z", "A"], ["M78 50 L96 32 L96 68 Z", "B"], [{ c: [32, 46, 5] }, "W"], [{ c: [33, 46, 2.4] }, "#222222"],
  ["M48 38 C52 46 52 54 48 62", "line"]],
  { outline: "M14 50 C28 26 62 22 80 50 L96 32 L96 68 L80 50 C62 78 28 74 14 50 Z", word: "fish" });
def("butterfly", [[{ e: [32, 34, 20, 22] }, "A"], [{ e: [68, 34, 20, 22] }, "A"], [{ e: [34, 70, 15, 16] }, "B"], [{ e: [66, 70, 15, 16] }, "B"],
  [{ e: [50, 52, 5, 30] }, "#4A3B5C"], ["M48 24 C44 14 40 10 36 8", "line"], ["M52 24 C56 14 60 10 64 8", "line"]], { word: "butterfly" });
def("cupcake", [["M20 54 L80 54 L72 94 L28 94 Z", "B"], ["M36 56 L40 92", "line"], ["M50 56 L50 92", "line"], ["M64 56 L60 92", "line"],
  ["M14 56 C10 44 20 38 28 40 C28 26 44 22 50 30 C56 22 72 26 72 40 C80 38 90 44 86 56 Z", "#FFD1E3"], [{ c: [50, 22, 8] }, "#E84A4A"]],
  { outline: "M14 56 C10 44 20 38 28 40 C28 26 44 22 50 30 C56 22 72 26 72 40 C80 38 90 44 86 56 L80 56 L72 94 L28 94 L20 56 Z", word: "cupcake" });
def("candycane", [["M38 96 L38 34 C38 14 72 14 72 34 L72 42", "line", "#2B2B35", 21], ["M38 96 L38 34 C38 14 72 14 72 34 L72 42", "line", "#FFFFFF", 16], ["M38 96 L38 34 C38 14 72 14 72 34 L72 42", "line", "#E84A4A", 16, "8 8"]], { word: "candy cane", noOutline: true });
def("pumpkin", [[{ e: [32, 58, 22, 32] }, "#F28C28"], [{ e: [68, 58, 22, 32] }, "#F28C28"], [{ e: [50, 58, 22, 34] }, "#F7A440"],
  ["M48 26 L46 12 L56 10 L54 26 Z", "#6B8E23"]], { word: "pumpkin" });
def("ghost", [["M18 92 L18 44 C18 22 32 8 50 8 C68 8 82 22 82 44 L82 92 L71 84 L61 92 L50 84 L39 92 L29 84 Z", "#FFFFFF"],
  [{ e: [38, 42, 6, 8] }, "#222222"], [{ e: [62, 42, 6, 8] }, "#222222"], [{ e: [50, 62, 6, 7] }, "#222222"]],
  { outline: "M18 92 L18 44 C18 22 32 8 50 8 C68 8 82 22 82 44 L82 92 L71 84 L61 92 L50 84 L39 92 L29 84 Z", word: "ghost" });
def("egg", [["M50 6 C26 6 14 46 14 62 C14 82 30 94 50 94 C70 94 86 82 86 62 C86 46 74 6 50 6 Z", "A"], ["M16 52 L28 44 L40 52 L50 44 L60 52 L72 44 L84 52", "line", "#FFFFFF", 4]],
  { outline: "M50 6 C26 6 14 46 14 62 C14 82 30 94 50 94 C70 94 86 82 86 62 C86 46 74 6 50 6 Z", word: "egg" });
def("rainbow", [["M8 80 A42 42 0 0 1 92 80", "line", "#E84A4A", 9], ["M17 80 A33 33 0 0 1 83 80", "line", "#FFB627", 9], ["M26 80 A24 24 0 0 1 74 80", "line", "#5DBB63", 9],
  ["M35 80 A15 15 0 0 1 65 80", "line", "#4FA3D9", 9]], { word: "rainbow", noOutline: true });
def("umbrella", [["M6 50 C8 24 28 8 50 8 C72 8 92 24 94 50 C88 44 78 44 72 50 C66 44 56 44 50 50 C44 44 34 44 28 50 C22 44 12 44 6 50 Z", "A"],
  ["M50 50 L50 86 C50 94 38 94 38 86", "line", "#444444", 5]], { word: "umbrella" });
def("ball", [[{ c: [50, 50, 42] }, "A"], ["M8 50 C30 40 70 40 92 50", "line", "#FFFFFF", 6], ["M50 8 C38 30 38 70 50 92", "line", "#FFFFFF", 6]], { word: "ball" });
def("rocket", [["M50 4 C68 18 72 42 68 70 L32 70 C28 42 32 18 50 4 Z", "#EDEFF5"], [{ c: [50, 38, 10] }, "#4FA3D9"], ["M32 50 L16 74 L32 70 Z", "A"],
  ["M68 50 L84 74 L68 70 Z", "A"], ["M38 70 L62 70 L56 82 L44 82 Z", "B"], ["M44 82 L56 82 L50 98 Z", "#FFB627"]],
  { outline: "M50 4 C68 18 72 42 68 50 L84 74 L68 70 L62 70 L56 82 L50 98 L44 82 L38 70 L32 70 L16 74 L32 50 C28 42 32 18 50 4 Z", word: "rocket" });
def("crown", [["M10 80 L14 26 L32 50 L50 16 L68 50 L86 26 L90 80 Z", "#FFC93C"], ["M10 80 L90 80 L90 90 L10 90 Z", "#F2A900"],
  [{ c: [50, 62, 6] }, "A"], [{ c: [28, 66, 4] }, "B"], [{ c: [72, 66, 4] }, "B"]],
  { outline: "M10 90 L10 80 L14 26 L32 50 L50 16 L68 50 L86 26 L90 80 L90 90 Z", word: "crown" });
def("bell", [["M50 10 C30 10 22 28 22 48 C22 62 16 70 10 76 L90 76 C84 70 78 62 78 48 C78 28 70 10 50 10 Z", "#FFC93C"], [{ c: [50, 82, 8] }, "#F2A900"],
  [{ c: [50, 8, 5] }, "#F2A900"]],
  { outline: "M50 10 C30 10 22 28 22 48 C22 62 16 70 10 76 L90 76 C84 70 78 62 78 48 C78 28 70 10 50 10 Z", word: "bell" });
def("ornament", [[{ c: [50, 60, 34] }, "A"], ["M42 18 L58 18 L58 28 L42 28 Z", "#C9A227"], ["M18 54 C36 46 64 46 82 54", "line", "#FFFFFF", 5],
  ["M20 70 C38 78 62 78 80 70", "line", "#FFFFFF", 5], ["M46 18 C46 8 54 8 54 18", "line", "#C9A227", 3]], { word: "ornament" });
def("mitten", [["M30 70 L26 36 C24 18 36 8 50 10 C62 12 68 22 68 34 L70 44 L78 36 C84 30 92 36 88 44 L72 66 L72 70 Z", "A"], ["M26 70 L76 70 L76 92 L26 92 Z", "W"]],
  { outline: "M26 92 L26 70 L30 70 L26 36 C24 18 36 8 50 10 C62 12 68 22 68 34 L70 44 L78 36 C84 30 92 36 88 44 L72 66 L72 70 L76 70 L76 92 Z", word: "mitten" });
def("cat", [["M14 10 L36 30 L64 30 L86 10 L86 60 C86 80 70 92 50 92 C30 92 14 80 14 60 Z", "#F6A04D"], [{ e: [36, 54, 5, 7] }, "#222222"], [{ e: [64, 54, 5, 7] }, "#222222"],
  ["M44 66 L56 66 L50 72 Z", "#E86A8A"], ["M50 72 C46 78 40 78 38 74", "line"], ["M50 72 C54 78 60 78 62 74", "line"], ["M30 66 L10 62", "line"], ["M30 70 L10 74", "line"],
  ["M70 66 L90 62", "line"], ["M70 70 L90 74", "line"]],
  { outline: "M14 10 L36 30 L64 30 L86 10 L86 60 C86 80 70 92 50 92 C30 92 14 80 14 60 Z", word: "cat" });
def("bear", [[{ c: [22, 24, 13] }, "#A0693E"], [{ c: [78, 24, 13] }, "#A0693E"], [{ c: [50, 56, 38] }, "#B97A48"], [{ e: [50, 68, 15, 12] }, "#E8C9A0"],
  [{ c: [36, 48, 5] }, "#222222"], [{ c: [64, 48, 5] }, "#222222"], [{ e: [50, 62, 6, 4.5] }, "#222222"], ["M50 66 L50 72", "line"]], { word: "bear" });
def("bunny", [[{ e: [36, 26, 9, 24] }, "#FFFFFF"], [{ e: [64, 26, 9, 24] }, "#FFFFFF"], [{ e: [36, 28, 4, 16] }, "#FFC0D0"], [{ e: [64, 28, 4, 16] }, "#FFC0D0"],
  [{ c: [50, 66, 30] }, "#FFFFFF"], [{ c: [40, 62, 4] }, "#222222"], [{ c: [60, 62, 4] }, "#222222"], [{ e: [50, 72, 4, 3] }, "#F27FA0"]], { word: "bunny" });
def("bee", [["M30 32 C20 10 46 6 46 30 Z", "#DDF3FF"], ["M70 32 C80 10 54 6 54 30 Z", "#DDF3FF"], [{ e: [50, 58, 34, 26] }, "#FFC93C"],
  ["M40 34 L40 82", "line", "#222222", 7], ["M58 34 L58 82", "line", "#222222", 7], [{ c: [24, 52, 4] }, "#222222"]], { word: "bee" });
def("pencil", [["M14 70 L66 18 L82 34 L30 86 Z", "#FFC93C"], ["M66 18 L74 10 C78 6 86 14 90 18 C94 22 90 26 82 34 Z", "#F29BB0"], ["M14 70 L30 86 L8 92 Z", "#F3D7B5"],
  ["M8 92 L12 82 L18 88 Z", "#333333"]], { word: "pencil" });
def("book", [["M8 22 C24 16 40 18 50 26 L50 90 C40 82 24 80 8 86 Z", "A"], ["M92 22 C76 16 60 18 50 26 L50 90 C60 82 76 80 92 86 Z", "B"],
  ["M16 34 C26 31 34 32 42 36", "line", "#FFFFFF", 3], ["M16 46 C26 43 34 44 42 48", "line", "#FFFFFF", 3], ["M58 36 C66 32 74 31 84 34", "line", "#FFFFFF", 3]], { word: "book" });
def("cookie", [[{ c: [50, 50, 42] }, "#D9A066"], [{ c: [36, 34, 5] }, "#5A3A22"], [{ c: [62, 30, 4] }, "#5A3A22"], [{ c: [66, 56, 5] }, "#5A3A22"],
  [{ c: [40, 64, 4] }, "#5A3A22"], [{ c: [52, 46, 3] }, "#5A3A22"], [{ c: [30, 52, 3] }, "#5A3A22"]], { word: "cookie" });
def("gingerbread", [["M50 6 C62 6 68 14 68 24 C68 30 66 33 64 35 L84 40 C92 42 92 54 84 54 L66 52 L68 70 L80 88 C84 96 74 100 70 94 L50 74 L30 94 C26 100 16 96 20 88 L32 70 L34 52 L16 54 C8 54 8 42 16 40 L36 35 C34 33 32 30 32 24 C32 14 38 6 50 6 Z", "#C8783E"],
  [{ c: [44, 22, 3] }, "#222222"], [{ c: [56, 22, 3] }, "#222222"], ["M44 30 C47 33 53 33 56 30", "line"], [{ c: [50, 46, 3] }, "W"], [{ c: [50, 58, 3] }, "W"]],
  { outline: "M50 6 C62 6 68 14 68 24 C68 30 66 33 64 35 L84 40 C92 42 92 54 84 54 L66 52 L68 70 L80 88 C84 96 74 100 70 94 L50 74 L30 94 C26 100 16 96 20 88 L32 70 L34 52 L16 54 C8 54 8 42 16 40 L36 35 C34 33 32 30 32 24 C32 14 38 6 50 6 Z", word: "gingerbread man" });
def("strawberry", [["M50 94 C26 80 12 56 14 40 C16 26 36 24 50 30 C64 24 84 26 86 40 C88 56 74 80 50 94 Z", "#E8434F"],
  ["M30 28 L40 18 L50 26 L60 18 L70 28 C62 34 38 34 30 28 Z", "#4CAF50"], [{ e: [36, 48, 1.6, 3] }, "#FFE08A"], [{ e: [56, 46, 1.6, 3] }, "#FFE08A"], [{ e: [46, 62, 1.6, 3] }, "#FFE08A"],
  [{ e: [66, 60, 1.6, 3] }, "#FFE08A"], [{ e: [52, 78, 1.6, 3] }, "#FFE08A"], [{ e: [30, 62, 1.6, 3] }, "#FFE08A"]], { word: "strawberry" });
def("carrot", [["M50 96 L30 34 C36 26 64 26 70 34 Z", "#F28C28"], ["M50 30 C40 10 36 8 34 10 C40 18 44 24 48 30 Z", "#5DBB63"], ["M50 30 C52 12 56 4 60 6 C58 16 54 24 52 30 Z", "#5DBB63"],
  ["M40 48 L48 46", "line"], ["M46 64 L54 62", "line"]], { outline: "M50 96 L30 34 C36 26 64 26 70 34 Z", word: "carrot" });
def("snowman", [[{ c: [50, 74, 22] }, "#FFFFFF"], [{ c: [50, 40, 16] }, "#FFFFFF"], ["M36 26 L64 26 L64 22 L58 22 L58 4 L42 4 L42 22 L36 22 Z", "#333333"],
  [{ c: [44, 38, 2.5] }, "#222222"], [{ c: [56, 38, 2.5] }, "#222222"], ["M50 43 L62 46 L50 47 Z", "#F28C28"], [{ c: [50, 66, 2.5] }, "#222222"], [{ c: [50, 76, 2.5] }, "#222222"]], { word: "snowman" });
def("stocking", [["M34 8 L66 8 L66 56 C66 70 62 78 52 84 L36 92 C26 96 16 90 18 80 C20 72 28 68 34 64 Z", "A"], ["M30 4 L70 4 L70 22 L30 22 Z", "W"]],
  { outline: "M30 4 L70 4 L70 22 L66 22 L66 56 C66 70 62 78 52 84 L36 92 C26 96 16 90 18 80 C20 72 28 68 34 64 L34 22 L30 22 Z", word: "stocking" });
def("dog", [[{ c: [50, 54, 34] }, "#E9C08F"], [{ e: [18, 50, 12, 26] }, "#8A5A3B"], [{ e: [82, 50, 12, 26] }, "#8A5A3B"], [{ e: [50, 70, 16, 12] }, "#FFFFFF"],
  [{ c: [38, 48, 5] }, "#222222"], [{ c: [62, 48, 5] }, "#222222"], [{ e: [50, 64, 7, 5] }, "#222222"], ["M50 69 C50 76 42 78 40 74", "line"], ["M50 69 C50 76 58 78 60 74", "line"]], { word: "dog" });
def("owl", [["M20 30 L28 10 L38 22 L62 22 L72 10 L80 30 L80 70 C80 86 66 94 50 94 C34 94 20 86 20 70 Z", "#8D6E63"], [{ c: [38, 42, 12] }, "#FFFFFF"], [{ c: [62, 42, 12] }, "#FFFFFF"],
  [{ c: [38, 42, 5] }, "#222222"], [{ c: [62, 42, 5] }, "#222222"], ["M46 54 L54 54 L50 62 Z", "#F2A900"], [{ e: [50, 76, 18, 12] }, "#D7B899"]],
  { outline: "M20 30 L28 10 L38 22 L62 22 L72 10 L80 30 L80 70 C80 86 66 94 50 94 C34 94 20 86 20 70 Z", word: "owl" });
def("sailboat", [["M10 70 L90 70 L78 88 L22 88 Z", "#8B5E3C"], ["M50 8 L50 68", "line", "#444444", 4], ["M54 12 L86 64 L54 64 Z", "A"], ["M46 22 L46 64 L20 64 Z", "B"]],
  { outline: "M50 8 L54 12 L86 64 L54 64 L54 70 L90 70 L78 88 L22 88 L10 70 L46 70 L46 64 L20 64 L46 22 L46 12 Z", word: "boat" });
def("diamond", [["M28 14 L72 14 L92 38 L50 92 L8 38 Z", "#7FD3F5"], ["M8 38 L92 38", "line"], ["M28 14 L38 38 L50 92 L62 38 L72 14", "line"]],
  { outline: "M28 14 L72 14 L92 38 L50 92 L8 38 Z", word: "gem" });
def("truck", [["M6 30 L60 30 L60 72 L6 72 Z", "A"], ["M60 42 L80 42 L94 58 L94 72 L60 72 Z", "B"], ["M66 48 L78 48 L86 58 L66 58 Z", "#CFEFFF"],
  [{ c: [24, 74, 10] }, "#333333"], [{ c: [76, 74, 10] }, "#333333"], [{ c: [24, 74, 4] }, "#DDDDDD"], [{ c: [76, 74, 4] }, "#DDDDDD"]], { word: "truck" });
def("turtle", [[{ e: [50, 54, 32, 24] }, "#5DBB63"], ["M30 46 L50 36 L70 46 L64 62 L36 62 Z", "#3E8E41"], [{ c: [88, 52, 9] }, "#9CCC65"], [{ c: [91, 50, 2] }, "#222222"],
  [{ e: [28, 76, 8, 6] }, "#9CCC65"], [{ e: [72, 76, 8, 6] }, "#9CCC65"], ["M18 56 L8 62 L18 62 Z", "#9CCC65"]], { word: "turtle" });
def("bow", [["M50 50 C34 30 10 28 12 50 C10 72 34 70 50 50 Z", "A"], ["M50 50 C66 30 90 28 88 50 C90 72 66 70 50 50 Z", "A"], [{ c: [50, 50, 9] }, "B"],
  ["M44 56 L32 90 L42 86 L48 58 Z", "A"], ["M56 56 L68 90 L58 86 L52 58 Z", "A"]], { word: "bow" });

const NAMES = Object.keys(I);
const THEMES = {
  christmas: ["tree", "star", "gift", "snowman", "candycane", "bell", "ornament", "stocking", "gingerbread", "mitten", "snowflake", "cookie"],
  winter: ["snowflake", "snowman", "mitten", "cookie", "star", "tree"],
  halloween: ["pumpkin", "ghost", "moon", "star", "owl", "cat", "candycane"],
  easter: ["egg", "bunny", "flower", "carrot", "butterfly", "bee"],
  spring: ["flower", "butterfly", "bee", "umbrella", "rainbow", "leaf", "sun"],
  summer: ["sun", "sailboat", "fish", "turtle", "strawberry", "ball"],
  fall: ["leaf", "apple", "pumpkin", "owl", "tree"],
  valentine: ["heart", "bow", "gift", "cupcake", "star", "flower"],
  birthday: ["balloon", "cupcake", "gift", "star", "crown", "bow", "heart"],
  baby: ["moon", "star", "cloud", "bunny", "bear", "heart", "rainbow"],
  school: ["pencil", "book", "apple", "star", "ball", "rocket"],
  animals: ["cat", "dog", "bear", "bunny", "owl", "fish", "turtle", "bee", "butterfly"],
  food: ["apple", "strawberry", "carrot", "cookie", "cupcake"],
  vehicles: ["car", "truck", "rocket", "sailboat"],
  space: ["rocket", "moon", "star", "sun"],
  general: null,
};
const SEASONAL = ["ghost", "pumpkin", "snowman", "candycane", "stocking", "gingerbread", "ornament", "snowflake", "mitten", "egg", "bell"];
const NEUTRAL = NAMES.filter(k => !SEASONAL.includes(k));
function iconSet(theme, n) {
  const list = (THEMES[theme] || (theme === "general" ? NEUTRAL : NEUTRAL)).filter(x => I[x]);
  const out = list.slice();
  for (const k of NEUTRAL) { if (out.length >= (n || list.length)) break; if (!out.includes(k)) out.push(k); }
  return out.slice(0, Math.max(n || list.length, 1));
}

// Draws an icon on page p at x,y (top-left), size s. style: color (default) | line (black outline, white, for coloring) | flat (no outline) | mono
function draw(p, name, x, y, s, o = {}) {
  const ic = I[name] || I.star, k = s / 100, style = o.style || "color";
  const pal = { A: o.a || "#F25F7A", B: o.b || "#4FA3D9", C: o.c || "#FFC93C", W: "#FFFFFF", L: o.l || "#FDE7EC", N: "none" };
  const ink = o.ink || "#2B2B35", ow = (o.ow || 3.2);
  p.open(`translate(${x} ${y}) scale(${k})`);
  ic.parts.forEach(([shape, fill, col, w, dash]) => {
    if (fill === "line") {
      const sc = style === "line" || style === "mono" ? ink : (col || ink);
      const lw = w || ic.lineW || 3;
      if (style === "line" && col === "#FFFFFF") return;
      p.path(shape, { stroke: style === "mono" ? (o.monoColor || ink) : sc, sw: style === "line" ? Math.max(ow, Math.min(lw, 7)) : lw, cap: "round", join: "round", dash: style === "line" ? null : dash });
      return;
    }
    let f = pal[fill] || fill;
    let st = { stroke: ink, sw: ow, join: "round", cap: "round" };
    if (style === "line") f = "#FFFFFF";
    if (style === "flat") st = {};
    if (style === "mono") { f = o.monoColor || ink; st = {}; }
    const opt = Object.assign({ fill: f }, st, o.op ? { op: o.op } : {});
    if (typeof shape === "string") p.path(shape, opt);
    else if (shape.c) p.circle(shape.c[0], shape.c[1], shape.c[2], opt);
    else if (shape.e) p.ellipse(shape.e[0], shape.e[1], shape.e[2], shape.e[3], opt);
  });
  if (ic.noOutline && style === "line") { /* strokes already drawn */ }
  p.close();
}

// Flattens an outline path (M L C Q Z absolute) to points in 0..100 space.
function flatten(d) {
  const t = d.match(/[MLCQZ]|-?\d*\.?\d+/g), pts = []; let i = 0, cx = 0, cy = 0, cmd = "M";
  const num = () => parseFloat(t[i++]);
  while (i < t.length) {
    if (/[MLCQZ]/.test(t[i])) cmd = t[i++];
    if (cmd === "Z") break;
    if (cmd === "M" || cmd === "L") { cx = num(); cy = num(); pts.push([cx, cy]); }
    else if (cmd === "C") { const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x = num(), y = num();
      for (let s = 1; s <= 12; s++) { const u = s / 12, a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, e = u ** 3; pts.push([a * cx + b * x1 + c * x2 + e * x, a * cy + b * y1 + c * y2 + e * y]); }
      cx = x; cy = y; }
    else if (cmd === "Q") { const x1 = num(), y1 = num(), x = num(), y = num();
      for (let s = 1; s <= 10; s++) { const u = s / 10; pts.push([(1 - u) ** 2 * cx + 2 * (1 - u) * u * x1 + u * u * x, (1 - u) ** 2 * cy + 2 * (1 - u) * u * y1 + u * u * y]); }
      cx = x; cy = y; }
  }
  return pts;
}
// About n points along the outline, keeping the corners that define the shape (Douglas-Peucker), then filling long gaps.
function samplePoints(name, n) {
  const ic = I[name]; if (!ic || !ic.outline) return null;
  let pts = flatten(ic.outline);
  const dist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy; if (!L) return Math.hypot(p[0] - a[0], p[1] - a[1]); const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
  function dp(list, eps) { if (list.length < 3) return list; let idx = 0, mx = 0; for (let i = 1; i < list.length - 1; i++) { const d = dist(list[i], list[0], list[list.length - 1]); if (d > mx) { mx = d; idx = i; } }
    if (mx > eps) { const a = dp(list.slice(0, idx + 1), eps), b = dp(list.slice(idx), eps); return a.slice(0, -1).concat(b); } return [list[0], list[list.length - 1]]; }
  let eps = 6, out = dp(pts.concat([pts[0]]), eps).slice(0, -1);
  while (out.length > n && eps < 30) { eps *= 1.25; out = dp(pts.concat([pts[0]]), eps).slice(0, -1); }
  while (out.length < n) { let bi = 0, bl = -1; for (let i = 0; i < out.length; i++) { const a = out[i], b = out[(i + 1) % out.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l > bl) { bl = l; bi = i; } }
    const a = out[bi], b = out[(bi + 1) % out.length]; out.splice(bi + 1, 0, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]); }
  // start at the top-most point
  let top = 0; out.forEach((q, i) => { if (q[1] < out[top][1]) top = i; });
  return out.slice(top).concat(out.slice(0, top));
}
const DOT_ICONS = NAMES.filter(k => I[k].outline);
module.exports = { I, NAMES, NEUTRAL, THEMES, iconSet, draw, samplePoints, DOT_ICONS, word: n => (I[n] && I[n].word) || n };
