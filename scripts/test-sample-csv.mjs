import fs from "node:fs";
import { decodeCsvBytes, parseCsv, guessMapping, applyMapping } from "../lib/csv/parseAddresses.ts";

const bytes = new Uint8Array(fs.readFileSync("public/sample-data/Anschreiben_Muster_2DS.csv"));
const text = decodeCsvBytes(bytes);
console.log("--- decoded text ---");
console.log(text);

const { headers, rows } = parseCsv(text);
console.log("--- headers ---", headers);
console.log("--- rows ---", rows);

const mapping = guessMapping(headers);
console.log("--- guessed mapping ---", mapping);

try {
  const recipients = applyMapping(rows, mapping, { mode: "auto", template: "liebe-vorname" });
  console.log("--- recipients ---", recipients);
} catch (e) {
  console.log("--- applyMapping ERROR ---", e.message);
}
