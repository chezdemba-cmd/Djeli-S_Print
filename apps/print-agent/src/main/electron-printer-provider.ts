import { BrowserWindow } from "electron";
import type { AgentPrinterSnapshot } from "@djelis-print/contracts";
import type { PrinterProvider } from "../core/ports/printer-provider.js";

export class ElectronPrinterProvider implements PrinterProvider {
  constructor(private readonly hostWindow: () => BrowserWindow) {}
  async discover(): Promise<AgentPrinterSnapshot[]> {
    const printers = await this.hostWindow().webContents.getPrintersAsync();
    return printers.map((printer) => {
      const options = Object.entries(printer.options ?? {});
      const supportsColor = options.some(([key, value]) => /color/i.test(key) && /^(true|color|yes)$/i.test(String(value)));
      const supportsDuplex = options.some(([key, value]) => /duplex|sides/i.test(key) && !/^(false|none|one-sided)$/i.test(String(value)));
      return { systemName: printer.name, displayName: printer.displayName || printer.name, isDefault: false, formats: ["A4"], supportsColor, supportsDuplex };
    });
  }
  async print(input: { printerId: string; filePath: string; copies: number }) {
    const printWindow = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
    try {
      await printWindow.loadFile(input.filePath);
      await new Promise<void>((resolve, reject) => {
        printWindow.webContents.print({ silent: true, printBackground: true, deviceName: input.printerId, copies: input.copies }, (success, reason) => success ? resolve() : reject(new Error(reason || "Impression refusée")));
      });
    } finally { printWindow.destroy(); }
  }
}
