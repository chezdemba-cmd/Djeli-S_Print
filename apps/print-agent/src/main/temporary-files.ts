import { app } from "electron";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AgentPrintJob } from "@djelis-print/contracts";
import type { TemporaryFiles } from "../core/job-runner.js";

export class AgentTemporaryFiles implements TemporaryFiles {
  private root() { return path.join(app.getPath("temp"), "djelis-print-agent"); }
  async download(job: AgentPrintJob) {
    const response = await fetch(job.downloadUrl, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`Téléchargement refusé (${response.status})`);
    const data = Buffer.from(await response.arrayBuffer());
    if (data.length === 0 || data.length > 1024 * 1024 * 1024) throw new Error("Taille de fichier invalide");
    if (!matchesMime(data, job.mime_type)) throw new Error("Signature du fichier téléchargé invalide");
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

function matchesMime(data: Buffer, mime: string) {
  if (mime === "application/pdf") return data.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mime === "image/png") return data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  if (mime === "image/jpeg") return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (mime === "image/webp") return data.length >= 12 && data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}
