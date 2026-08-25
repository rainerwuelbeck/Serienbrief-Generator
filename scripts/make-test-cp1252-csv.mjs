// Erzeugt eine Windows-1252-kodierte Test-CSV (wie von Excel unter Windows
// exportiert), um den Umlaut-Fix in decodeCsvBytes() zu testen.
import fs from "node:fs";

const text = `Vorname,Nachname,Strasse,PLZ,Ort,Freischaltcode
Heike,Häfra,Röckersdorfer Str. 1b,03253,Doberlug-Kirchhain,ZZ11AA22
André,Müller,Grüner Weg 3,80331,München,BB33CC44
`;

// Alle Zeichen aus `text` liegen im Latin-1/Windows-1252-Bereich, daher reicht
// ein einfaches "latin1"-Buffer, um die Windows-1252-Bytes zu erzeugen.
fs.writeFileSync("test-data/beispiel-adressen-cp1252.csv", Buffer.from(text, "latin1"));
console.log("geschrieben: test-data/beispiel-adressen-cp1252.csv");
