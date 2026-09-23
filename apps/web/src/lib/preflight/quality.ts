export const standardFormatsMm = {
  A4: { width: 210, height: 297 }, A3: { width: 297, height: 420 },
  A2: { width: 420, height: 594 }, A1: { width: 594, height: 841 },
  A0: { width: 841, height: 1189 },
} as const;

export type QualityRating = "EXCELLENT" | "GOOD" | "ACCEPTABLE" | "LOW" | "NOT_RECOMMENDED";

export function ratingForDpi(dpi: number): QualityRating {
  if (dpi >= 300) return "EXCELLENT";
  if (dpi >= 200) return "GOOD";
  if (dpi >= 150) return "ACCEPTABLE";
  if (dpi >= 100) return "LOW";
  return "NOT_RECOMMENDED";
}

export function imageQualityByFormat(widthPx: number, heightPx: number) {
  const landscape = widthPx > heightPx;
  return Object.entries(standardFormatsMm).map(([format, dimensions]) => {
    const widthMm = landscape ? dimensions.height : dimensions.width;
    const heightMm = landscape ? dimensions.width : dimensions.height;
    const dpi = Math.min(widthPx / (widthMm / 25.4), heightPx / (heightMm / 25.4));
    const roundedDpi = Math.round(dpi);
    return { format, dpi: roundedDpi, rating: ratingForDpi(roundedDpi) };
  });
}
