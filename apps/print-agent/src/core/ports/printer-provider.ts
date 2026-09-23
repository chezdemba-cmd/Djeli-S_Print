import type { PrinterCapabilitySnapshot } from "@djelis-print/contracts";

export interface PrinterProvider {
  discover(): Promise<PrinterCapabilitySnapshot[]>;
  print(input: { printerId: string; filePath: string; copies: number }): Promise<void>;
}
