export const STOCK_PHOTOS: { id: string; label: string; ext: "png" | "jpg" }[] = [
  { id: "1", label: "Frau mit Tablet am Fenster", ext: "png" },
  { id: "2", label: "Beratungsgespräch im Büro", ext: "png" },
  { id: "3", label: "Mann mit Tablet, lächelnd", ext: "png" },
  { id: "4", label: "Paar auf dem Sofa mit Tablet", ext: "jpg" },
  { id: "5", label: "Team im Besprechungsraum", ext: "jpg" },
  { id: "6", label: "Handschlag im Büro", ext: "jpg" },
];

export function stockPhotoPublicPath(id: string): string {
  const photo = STOCK_PHOTOS.find((p) => p.id === id);
  return `/stock-photos/${id}.${photo?.ext ?? "png"}`;
}
