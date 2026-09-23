import type { AgentPrinterSnapshot } from "@djelis-print/contracts";

export interface PrinterProvider {
  discover(): Promise<AgentPrinterSnapshot[]>;
  print(input: { printerId: string; filePath: string; copies: number }): Promise<void>;
}
