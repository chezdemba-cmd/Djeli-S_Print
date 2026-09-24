import type { AgentPrinterSnapshot, AgentPrintJob, DocumentStatus } from "@djelis-print/contracts";

export class AgentApi {
  constructor(private baseUrl: string, private token: string | null = null) {}
  setBaseUrl(baseUrl: string) { this.baseUrl = baseUrl.replace(/\/$/, ""); }
  setToken(token: string) { this.token = token; }
  async pair(pairingCode: string, agentIdentifier: string, agentVersion: string) {
    const response = await fetch(`${this.baseUrl}/api/agent/pair`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pairingCode, agentIdentifier, agentVersion }), signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(await errorMessage(response));
    return response.json() as Promise<{ token: string; workstation: { id: string; name: string } }>;
  }
  async heartbeat(printers: AgentPrinterSnapshot[], version: string) { await this.authorized("/api/agent/heartbeat", { printers, version }); }
  async claim(): Promise<AgentPrintJob | null> {
    const response = await this.authorized("/api/agent/jobs/claim", {});
    if (response.status === 204) return null;
    return ((await response.json()) as { job: AgentPrintJob }).job;
  }
  async report(jobId: string, status: Extract<DocumentStatus, "PRINTING" | "PRINTED" | "FAILED">, failure?: { code: string; message: string }) {
    await this.authorized(`/api/agent/jobs/${jobId}/status`, { status, failureCode: failure?.code, failureMessage: failure?.message });
  }
  private async authorized(path: string, body: unknown) {
    if (!this.token) throw new Error("Agent non appairé");
    const response = await fetch(`${this.baseUrl}${path}`, { method: "POST", headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(await errorMessage(response));
    return response;
  }
}

async function errorMessage(response: Response) {
  const result = await response.json().catch(() => null) as { error?: string } | null;
  return result?.error ?? `Erreur serveur (${response.status})`;
}
