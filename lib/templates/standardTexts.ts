// Die 4 Standardtexte aus "Mitarbeiteranschreiben-Muster-4-Versionen.pdf"
// (Stand 13.11.2025), als editierbares Rich-Text-HTML mit Seriendruck-Platzhaltern.
//
// Verfügbare Platzhalter (werden pro CSV-Zeile ersetzt, siehe lib/pdf/buildHtml.ts):
//   {{Anredezeile}}  - die komplette Anrede-Zeile, z.B. "Lieber Max," oder
//                       "Sehr geehrter Herr Mustermann," (kommt fertig aus der CSV)
//   {{Vorname}}      - Vorname
//   {{Nachname}}     - Nachname
//   {{Freischaltcode}} - persönlicher Freischaltcode (auf Seite 2 verwendet)

export type StandardTextVariant = "j-du" | "j-sie" | "f-du" | "f-sie";

export type StandardText = {
  id: StandardTextVariant;
  label: string;
  duSie: "du" | "sie";
  /** Vorbelegung für die optionale Überschrift über der Anredezeile (Schritt 2). */
  defaultHeadline: string;
  bodyHtml: string;
};

export const STANDARD_TEXTS: StandardText[] = [
  {
    id: "j-du",
    label: "Variante „J“ – Du-Anrede",
    duSie: "du",
    defaultHeadline: "Warum Geld verschenken?\nSpare Steuern und Sozialabgaben mit unserer Hilfe!",
    bodyHtml: `
<p>{{Anredezeile}}</p>
<p>hast du dir schon Gedanken über deine finanzielle Situation im Rentenalter gemacht? Vielleicht ist dir die betriebliche Altersversorgung (bAV) oder Betriebsrente ein Begriff. Aber wusstest du, dass du durch die bAV Geld, das sonst in Form von Steuer- und Sozialabgaben abfließen würde, für deine zukünftige Rente verwenden könntest? Und das Monat für Monat?</p>
<p>Nutze die Chance, deine Zukunft zu sichern und gleichzeitig Steuern und Sozialabgaben zu sparen!</p>
<p>Uns liegt es am Herzen, dass jede:r Mitarbeiter:in die Möglichkeit bekommt, sich mit einer bAV ein zweites oder sogar drittes Standbein für den Ruhestand aufzubauen. Um einen weiteren Anreiz zu schaffen, unterstützen wir dies mit einem zusätzlichen attraktiven Arbeitgeberzuschuss.</p>
<p><strong>Möchtest du mehr erfahren oder dir unverbindlich deine Betriebsrente berechnen lassen?</strong></p>
<p>Logge dich mit deinen persönlichen Zugangsdaten ein und lasse dich von unserem virtuellen Berater zur Betriebsrente informieren. Deinen persönlichen Freischaltcode findest du auf der nächsten Seite.</p>
<p>Egal wie du dich entscheidest, <strong>bestätige uns bitte die Kenntnisnahme dieser Informationen.</strong> Dies geschieht ganz einfach während der virtuellen Information und dauert nur fünf Minuten.</p>
<p>Solltest du Fragen zur betrieblichen Altersvorsorge haben, die nicht im Rahmen der Beratung geklärt werden können, steht dir Frau Eva Mustermakler gerne zur Verfügung. Du erreichst sie unter der Telefonnummer 01234 – 567890 oder per E-Mail an eva.mustermakler@makler.net.</p>
<p>Wir wünschen dir viel Spaß mit dieser neuartigen bAV-Beratung.</p>
<p>Deine Geschäftsführung</p>`.trim(),
  },
  {
    id: "j-sie",
    label: "Variante „J“ – Sie-Anrede",
    duSie: "sie",
    defaultHeadline: "Warum Geld verschenken?\nSparen Sie Steuern und Sozialabgaben mit unserer Hilfe!",
    bodyHtml: `
<p>{{Anredezeile}}</p>
<p>haben Sie sich schon Gedanken über Ihre finanzielle Situation im Rentenalter gemacht? Vielleicht ist Ihnen die betriebliche Altersversorgung (bAV) oder Betriebsrente ein Begriff. Aber wussten Sie, dass Sie durch die bAV Geld, das sonst in Form von Steuer- und Sozialabgaben abfließen würde, für Ihre zukünftige Rente verwenden könnten? Und das Monat für Monat?</p>
<p>Nutzen Sie die Chance, Ihre Zukunft zu sichern und gleichzeitig Steuern und Sozialabgaben zu sparen!</p>
<p>Uns liegt es am Herzen, dass jede:r Mitarbeiter:in die Möglichkeit bekommt, sich mit einer bAV ein zweites oder sogar drittes Standbein für den Ruhestand aufzubauen. Um einen weiteren Anreiz zu schaffen, unterstützen wir dies mit einem zusätzlichen attraktiven Arbeitgeberzuschuss.</p>
<p><strong>Sie möchten mehr erfahren oder sich unverbindlich Ihre Betriebsrente berechnen lassen?</strong></p>
<p>Loggen Sie sich mit Ihren persönlichen Zugangsdaten ein und lassen Sie sich von unserem virtuellen Berater zur Betriebsrente informieren. Ihren persönlichen Freischaltcode finden Sie auf der nächsten Seite.</p>
<p>Egal wie Sie sich entscheiden, <strong>bestätigen Sie uns bitte die Kenntnisnahme dieser Informationen.</strong> Dies geschieht ganz einfach während der virtuellen Information und dauert nur fünf Minuten.</p>
<p>Sollten Sie Fragen zur betrieblichen Altersvorsorge haben, die nicht im Rahmen der Beratung geklärt werden können, steht Ihnen Frau Eva Mustermakler gerne zur Verfügung. Sie erreichen sie unter der Telefonnummer 01234 – 567890 oder per E-Mail an eva.mustermakler@makler.net.</p>
<p>Wir wünschen Ihnen viel Spaß mit dieser neuartigen bAV-Beratung.</p>
<p>Ihre Geschäftsführung</p>`.trim(),
  },
  {
    id: "f-du",
    label: "Variante „F“ – Du-Anrede",
    duSie: "du",
    defaultHeadline: "",
    bodyHtml: `
<p>{{Anredezeile}}</p>
<p>wie du sicher weißt, sinkt das Niveau der gesetzlichen Rente stetig. Deshalb ist es unumstritten, dass zusätzliche private Vorsorgemaßnahmen für deine finanzielle Sicherheit im Ruhestand von großer Bedeutung sind.</p>
<p>Daher liegt es uns am Herzen, dass alle unsere Mitarbeitende die Chance haben, durch eine betriebliche Altersvorsorge für die Zukunft vorzusorgen.</p>
<p>Im Jahr 2025 kannst du monatlich bis zu 322 Euro (das entspricht 4 % der Beitragsbemessungsgrenze der Rentenversicherung West) steuer- und sozialversicherungsfrei in deine betriebliche Altersvorsorge einbringen. Wir als dein Arbeitgeber unterstützen deinen monatlichen Beitrag mit einem Zuschuss von bis zu X Euro.</p>
<p>Um die Beratung so angenehm und verständlich wie möglich zu machen, nutzen wir einen innovativen Videoplayer. So kannst du dich bequem von zu Hause aus über die Vorteile dieser von uns geförderten Vorsorgeoption informieren. Deinen persönlichen Freischaltcode findest du auf der nächsten Seite.</p>
<p>Bitte nimm dir die Zeit, das Informationsvideo anzuschauen und zu entscheiden, ob du die betriebliche Altersvorsorge in Anspruch nehmen möchtest. Deine Entscheidung hat keinen Einfluss auf bereits bestehende Verträge; eine bereits abgeschlossene betriebliche Altersvorsorge bleibt davon unberührt und wird fortgeführt.</p>
<p>Solltest du Fragen zur betrieblichen Altersvorsorge haben, die nicht im Rahmen der Beratung geklärt werden können, steht dir Frau Eva Mustermakler gerne zur Verfügung. Du erreichst sie unter der Telefonnummer 01234 – 567890 oder per E-Mail an eva.mustermakler@makler.net.</p>
<p>Wir würden uns freuen, wenn du das Angebot zur betrieblichen Altersvorsorge positiv aufnimmst.</p>
<p>Mit freundlichen Grüßen, deine Geschäftsleitung</p>`.trim(),
  },
  {
    id: "f-sie",
    label: "Variante „F“ – Sie-Anrede",
    duSie: "sie",
    defaultHeadline: "",
    bodyHtml: `
<p>{{Anredezeile}}</p>
<p>wie Sie sicher wissen, sinkt das Niveau der gesetzlichen Rente stetig. Deshalb ist es unumstritten, dass zusätzliche private Vorsorgemaßnahmen für Ihre finanzielle Sicherheit im Ruhestand von großer Bedeutung sind.</p>
<p>Daher liegt es uns am Herzen, dass alle unsere Mitarbeiterinnen und Mitarbeiter die Chance haben, durch eine betriebliche Altersvorsorge für die Zukunft vorzusorgen.</p>
<p>Im Jahr 2025 können Sie monatlich bis zu 322 Euro (das entspricht 4 % der Beitragsbemessungsgrenze der Rentenversicherung West) steuer- und sozialversicherungsfrei in Ihre betriebliche Altersvorsorge einbringen. Wir als Ihr Arbeitgeber unterstützen Ihren monatlichen Beitrag mit einem Zuschuss von bis zu X Euro.</p>
<p>Um die Beratung so angenehm und verständlich wie möglich zu gestalten, nutzen wir einen innovativen Videoplayer. So können Sie sich bequem von zu Hause aus über die Vorteile dieser von uns geförderten Vorsorgeoption informieren. Ihren persönlichen Freischaltcode finden Sie auf der nächsten Seite.</p>
<p>Bitte nehmen Sie sich die Zeit, das Informationsvideo anzuschauen und zu entscheiden, ob Sie die betriebliche Altersvorsorge in Anspruch nehmen möchten. Ihre Entscheidung hat keinen Einfluss auf bereits bestehende Verträge; eine bereits abgeschlossene betriebliche Altersvorsorge bleibt davon unberührt und wird fortgeführt.</p>
<p>Sollten Sie Fragen zur betrieblichen Altersvorsorge haben, die nicht im Rahmen der Beratung geklärt werden können, steht Ihnen Frau Eva Mustermakler gerne zur Verfügung. Sie erreichen sie unter der Telefonnummer 01234 – 567890 oder per E-Mail an eva.mustermakler@makler.net.</p>
<p>Wir würden uns freuen, wenn Sie das Angebot zur betrieblichen Altersvorsorge positiv aufnehmen würden.</p>
<p>Mit freundlichen Grüßen, Ihre Geschäftsleitung</p>`.trim(),
  },
];

export function getStandardText(id: StandardTextVariant): StandardText {
  return STANDARD_TEXTS.find((t) => t.id === id) ?? STANDARD_TEXTS[0];
}
