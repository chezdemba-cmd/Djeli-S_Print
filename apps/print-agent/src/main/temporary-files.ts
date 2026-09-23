import { app } from "electron";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AgentPrintJob } from "@djelis-print/contracts";
import type { TemporaryFiles } from "../core/job-runner.js";

export class AgentTemporaryFiles implements TemporaryFiles {
  private root() { return path.join(app.getPath("temp"), "djelis-print-agent"); }
  async download(job: AgentPrintJob) {
    const response = await fetch(job.downloadUrl);
    if (!response.ok) throw new Error(`Téléchargement refusé (${response.status})`);
    const data = Buffer.from(await response.arrayBuffer());
    if (data.length === 0 || data.length > 1024 * 1024 * 1024) throw new Error("Taille de fichier invalide");
    const extension = job.mime_type === "application/pdf" ? ".pdf" : job.mime_type === "image/png" ? ".png" : job.mime_type === "image/webp" ? ".webp" : ".jpg";
    await mkdir(this.root(), { recursive: true });
    const target = path.join(this.root(), `${job.job_id}${extension}`);
    await writeFile(target, data, { mode: 0o600 });
    return target;
  }
  async remove(filePath: string) {
    const relative = path.relative(this.root(), path.resolve(filePath));
    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Chemin temporaire refusé");
    await rm(filePath, { force: true });
  }
}
