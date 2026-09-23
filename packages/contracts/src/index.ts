export const documentStatuses = [
  "CREATED",
  "UPLOADING",
  "RECEIVED",
  "ANALYZING",
  "READY",
  "WAITING_OPERATOR",
  "PROCESSING",
  "PRINTING",
  "PRINTED",
  "FAILED",
  "EXPIRED",
  "DELETED",
] as const;

export type DocumentStatus = (typeof documentStatuses)[number];
export type WorkstationStatus = "ONLINE" | "OFFLINE" | "BUSY";
export type OrganizationRole = "OWNER" | "ADMIN" | "OPERATOR" | "VIEWER";
export type SessionStatus = "ACTIVE" | "CONSUMED" | "EXPIRED" | "REVOKED";
export type ColorMode = "COLOR" | "BLACK_AND_WHITE" | "GRAYSCALE";
export type Orientation = "PORTRAIT" | "LANDSCAPE";
export type PaperFormat = "A4" | "A3" | "A2" | "A1" | "A0" | "CUSTOM";
export type DuplexMode = "SIMPLEX" | "DUPLEX_LONG_EDGE" | "DUPLEX_SHORT_EDGE";
export type ScaleMode = "ACTUAL_SIZE" | "FIT" | "CROP" | "CUSTOM";
export type PreflightRating = "EXCELLENT" | "GOOD" | "ACCEPTABLE" | "LOW" | "NOT_RECOMMENDED";

export interface PrinterCapabilitySnapshot {
  printerId: string;
  name: string;
  formats: PaperFormat[];
  color: boolean;
  duplex: boolean;
  maxDpi: number | null;
  maxWidthMm: number | null;
  maxHeightMm: number | null;
  capturedAt: string;
}
