import fs from "node:fs";
import { decodeCsvBytes, parseCsv } from "../lib/csv/parseAddresses.ts";

const bytes = new Uint8Array(fs.readFileSync("test-data/beispiel-adressen-cp1252.csv"));
const text = decodeCsvBytes(bytes);
const { rows } = parseCsv(text);
console.log(rows);
