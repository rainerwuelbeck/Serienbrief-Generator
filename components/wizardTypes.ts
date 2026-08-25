import type { AnredezeileConfig, ColumnMapping } from "@/lib/csv/parseAddresses";
import { DEFAULT_FONT_ID } from "@/lib/fonts";
import { getStandardText } from "@/lib/templates/standardTexts";
import type { DuSieMode } from "@/lib/pdf/buildHtml";

export type LogoPosition = "left" | "center" | "right";

export const DEFAULT_DESIGN_COLOR = "#1E6FA6";

export type WizardState = {
  // Schritt 1: Briefbogen / Logo / Design-Farbe
  letterheadMode: "image" | "logo";
  letterheadFile: File | null;
  logoFile: File | null;
  logoPosition: LogoPosition;
  designColor: string;
  absenderzeile: string;

  // Schritt 2: Anschreibentext — entweder unverändert aus einer Vorlage (b)
  // oder frei bearbeitet/individuell (c); technisch dasselbe Feld, die
  // Vorlagen-Buttons in StepText befüllen es nur initial.
  bodyHtml: string;
  showHeadline: boolean;
  headlineText: string;
  showDate: boolean;
  dateMonthOffset: 0 | 1 | 2;
  duSieMode: DuSieMode;
  fontId: string;
  fontSizePt: number;

  // Schritt 3: Seite 2 (Headerfoto + Beratungslink)
  photoMode: "upload" | "stock";
  photoFile: File | null;
  stockPhotoId: string;
  beratungslinkUrl: string;

  // Schritt 4: Adressliste
  csvFile: File | null;
  csvHeaders: string[];
  csvRows: Record<string, string>[];
  mapping: ColumnMapping;
  anredezeileConfig: AnredezeileConfig;
};

const initialStandardText = getStandardText("j-sie");

export const initialWizardState: WizardState = {
  letterheadMode: "logo",
  letterheadFile: null,
  logoFile: null,
  logoPosition: "left",
  designColor: DEFAULT_DESIGN_COLOR,
  absenderzeile: "",

  bodyHtml: initialStandardText.bodyHtml,
  showHeadline: initialStandardText.defaultHeadline !== "",
  headlineText: initialStandardText.defaultHeadline,
  showDate: false,
  dateMonthOffset: 0,
  duSieMode: initialStandardText.duSie,
  fontId: DEFAULT_FONT_ID,
  fontSizePt: 11,

  photoMode: "stock",
  photoFile: null,
  stockPhotoId: "1",
  beratungslinkUrl: "https://",

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
