import type { AgentPrintJob } from "@djelis-print/contracts";
import type { AgentApi } from "./agent-api.js";
import type { PrinterProvider } from "./ports/printer-provider.js";

export interface TemporaryFiles { download(job: AgentPrintJob): Promise<string>; remove(filePath: string): Promise<void>; }

export class JobRunner {
  private running = false;
  constructor(private api: AgentApi, private printers: PrinterProvider, private files: TemporaryFiles) {}
  async tick() {
    if (this.running) return false;
    this.running = true;
    let job: AgentPrintJob | null = null;
    let filePath: string | null = null;
    try {
      job = await this.api.claim();
      if (!job) return false;
      filePath = await this.files.download(job);
      await this.api.report(job.job_id, "PRINTING");
      await this.printers.print({ printerId: job.printer_system_name, filePath, copies: job.copies });
      await this.api.report(job.job_id, "PRINTED");
      return true;
    } catch (error) {
      if (job) await this.api.report(job.job_id, "FAILED", { code: "AGENT_PRINT_ERROR", message: safeMessage(error) }).catch(() => undefined);
      return false;
    } finally {
      if (filePath) await this.files.remove(filePath).catch(() => undefined);
      this.running = false;
    }
  }
}

function safeMessage(error: unknown) { return (error instanceof Error ? error.message : "Erreur d’impression inconnue").slice(0, 500); }
