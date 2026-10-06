# Moneyland

A 2085-style AI district that runs a real Etsy shop of printable digital downloads.

- **Research Room** searches the web every hour for printables people are buying (kids activity books, planners, party packs, wall art) and ranks the ideas. Good ideas outside what Moneyland can make are flagged for the owner.
- **Product Building** turns the best ideas into finished products with the design engine in `lib/design` (real fonts, illustrations, themes, mazes, word searches, tracing, calendars, generative wall art). Coloring pages are drawn by AI and checked by a second AI that looks at the pictures.
- **Etsy Publishing** checks every product (text and rendered pages) before it goes live, then uploads 6 listing photos and the download files.
- **Sales Counter** reads real Etsy orders every 15 minutes. The money counter only goes up on real sales.

Each room has an on/off switch on the website.

Code: `index.html` (the site), `api/` (Vercel functions and hourly jobs), `lib/design/` (the print and photo engine), `lib/seeds.js` (the starter catalog). Fonts in `lib/design/fonts` are under the SIL Open Font License.
