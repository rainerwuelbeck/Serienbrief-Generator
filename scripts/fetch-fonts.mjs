// One-off script to download a curated set of Google Fonts (woff2) for local
// bundling under public/fonts, so PDF rendering never depends on live internet
// access at generation time. Run once during setup: `node scripts/fetch-fonts.mjs`
import fs from "node:fs";
import path from "node:path";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// key = folder name used in our app, value = Google Fonts family name
const FAMILIES = {
  arimo: "Arimo", // Arial-kompatibel
  carlito: "Carlito", // Calibri-kompatibel
  tinos: "Tinos", // Times New Roman-kompatibel
  roboto: "Roboto",
  "open-sans": "Open+Sans",
  lato: "Lato",
  montserrat: "Montserrat",
  merriweather: "Merriweather",
};

const STYLES = [
  { ital: 0, wght: 400, name: "regular" },
  { ital: 0, wght: 700, name: "bold" },
  { ital: 1, wght: 400, name: "italic" },
  { ital: 1, wght: 700, name: "bolditalic" },
];

const outRoot = path.join(process.cwd(), "public", "fonts");

async function fetchCss(family) {
  const url = `https://fonts.googleapis.com/css2?family=${family}:ital,wght@0,400;0,700;1,400;1,700&display=swap`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`CSS fetch failed for ${family}: ${res.status}`);
  return res.text();
}

// Parses the CSS2 response into an array of {ital, wght, url} blocks in order.
function parseBlocks(css) {
  const blocks = [];
  const re = /font-style:\s*(\w+);\s*font-weight:\s*(\d+);[\s\S]*?src:\s*url\(([^)]+)\)\s*format\('woff2'\);/g;
  let m;
  while ((m = re.exec(css))) {
    blocks.push({
      ital: m[1] === "italic" ? 1 : 0,
      wght: Number(m[2]),
      url: m[3],
    });
  }
  return blocks;
}

async function run() {
  for (const [dir, family] of Object.entries(FAMILIES)) {
    const outDir = path.join(outRoot, dir);
    fs.mkdirSync(outDir, { recursive: true });
    console.log(`\n== ${family} ==`);
    const css = await fetchCss(family);
    const blocks = parseBlocks(css);
    for (const style of STYLES) {
      const block = blocks.find((b) => b.ital === style.ital && b.wght === style.wght);
      if (!block) {
        console.warn(`  ! missing ${style.name} for ${family}`);
        continue;
      }
      const dest = path.join(outDir, `${style.name}.woff2`);
      const fileRes = await fetch(block.url, { headers: { "User-Agent": UA } });
      const buf = Buffer.from(await fileRes.arrayBuffer());
      fs.writeFileSync(dest, buf);
      console.log(`  + ${style.name}.woff2 (${(buf.length / 1024).toFixed(0)} KB)`);
    }
  }
  console.log("\nDone.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
