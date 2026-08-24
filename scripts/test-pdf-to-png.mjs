import fs from "node:fs";
import { renderFirstPdfPageToPng } from "../lib/pdf/letterheadToImage.ts";

const buf = fs.readFileSync("test-data/briefbogen.pdf");
const png = await renderFirstPdfPageToPng(buf);
fs.writeFileSync("test-data/briefbogen-rendered.png", png);
console.log("OK, wrote", png.length, "bytes");
