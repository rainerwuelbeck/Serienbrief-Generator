export const STOCK_PHOTOS: { id: string; label: string }[] = [
  { id: "1", label: "Sonnenuntergang / Ruhestand" },
  { id: "2", label: "Wachstum" },
  { id: "3", label: "Schutz / Vorsorge" },
  { id: "4", label: "Beratung / Team" },
  { id: "5", label: "Sparen" },
];

export function stockPhotoPublicPath(id: string): string {
  return `/stock-photos/${id}.svg`;
}
