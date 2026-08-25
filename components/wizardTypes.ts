import type { AnredezeileConfig, ColumnMapping } from "@/lib/csv/parseAddresses";
import { DEFAULT_FONT_ID } from "@/lib/fonts";
import { DEFAULT_PAGE2_TEXT, getStandardText } from "@/lib/templates/standardTexts";

export type LogoPosition = "left" | "center" | "right";

export type WizardState = {
  // Schritt 1: Briefbogen / Logo
  letterheadMode: "image" | "logo";
  letterheadFile: File | null;
  logoFile: File | null;
  logoPosition: LogoPosition;

  // Schritt 2: Anschreibentext — entweder unverändert aus einer Vorlage (b)
  // oder frei bearbeitet/individuell (c); technisch dasselbe Feld, die
  // Vorlagen-Buttons in StepText befüllen es nur initial.
  bodyHtml: string;
  page2Html: string;
  fontId: string;
  fontSizePt: number;

  // Schritt 3: Headerfoto Seite 2
  photoMode: "upload" | "stock";
  photoFile: File | null;
  stockPhotoId: string;

  // Schritt 4: Adressliste
  csvFile: File | null;
  csvHeaders: string[];
  csvRows: Record<string, string>[];
  mapping: ColumnMapping;
  anredezeileConfig: AnredezeileConfig;
};

export const initialWizardState: WizardState = {
  letterheadMode: "logo",
  letterheadFile: null,
  logoFile: null,
  logoPosition: "left",

  bodyHtml: getStandardText("j-sie").bodyHtml,
  page2Html: DEFAULT_PAGE2_TEXT,
  fontId: DEFAULT_FONT_ID,
  fontSizePt: 11,

  photoMode: "stock",
  photoFile: null,
  stockPhotoId: "1",

  csvFile: null,
  csvHeaders: [],
  csvRows: [],
  mapping: {},
  anredezeileConfig: { mode: "column", column: "" },
};

export type StepProps = {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
};
