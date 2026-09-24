import { authenticateAgent } from "@/lib/agent-auth";
import { createAdminClient } from "@/lib/supabase/admin";

type PrinterInput = {
  systemName?: unknown; displayName?: unknown; isDefault?: unknown;
  formats?: unknown; supportsColor?: unknown; supportsDuplex?: unknown;
};
const formats = new Set(["A4", "A3", "A2", "A1", "A0", "CUSTOM"]);

export async function POST(request: Request) {
  const workstation = await authenticateAgent(request);
  if (!workstation) return Response.json({ error: "Agent non autorisé." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { printers?: PrinterInput[]; version?: string };
  const discovered = Array.isArray(body.printers) ? body.printers.slice(0, 100) : [];
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error: heartbeatError } = await admin.from("workstations").update({ status: "ONLINE", last_seen_at: now, agent_version: body.version?.slice(0, 40) }).eq("id", workstation.id);
  if (heartbeatError) return Response.json({ error: "Heartbeat indisponible." }, { status: 503 });

  const sanitized = new Map<string, {
    systemName: string; displayName: string; isDefault: boolean;
    formats: string[]; supportsColor: boolean; supportsDuplex: boolean;
  }>();
  for (const item of discovered) {
    const systemName = typeof item.systemName === "string" ? item.systemName.trim().slice(0, 255) : "";
    if (!systemName) continue;
    const supportedFormats = Array.isArray(item.formats)
      ? item.formats.filter((value): value is string => typeof value === "string" && formats.has(value))
      : [];
    sanitized.set(systemName, {
      systemName,
      displayName: typeof item.displayName === "string" ? item.displayName.trim().slice(0, 160) || systemName : systemName,
      isDefault: item.isDefault === true,
      formats: supportedFormats.length ? supportedFormats : ["A4"],
      supportsColor: item.supportsColor === true,
      supportsDuplex: item.supportsDuplex === true,
    });
  }

  if (sanitized.size > 0) {
    const printerRows = [...sanitized.values()].map((item) => ({
      organization_id: workstation.organization_id,
      workstation_id: workstation.id,
      system_name: item.systemName,
      display_name: item.displayName,
      is_default: item.isDefault,
      last_seen_at: now,
    }));
    const { data: printers, error: printerError } = await admin.from("printers")
      .upsert(printerRows, { onConflict: "workstation_id,system_name" }).select("id, system_name");
    if (printerError || !printers) return Response.json({ error: "Synchronisation des imprimantes impossible." }, { status: 503 });

    const capabilityRows = printers.map((printer) => {
      const item = sanitized.get(printer.system_name)!;
      return {
      printer_id: printer.id,
      organization_id: workstation.organization_id,
      formats: item.formats,
      supports_color: item.supportsColor,
      supports_duplex: item.supportsDuplex,
      captured_at: now,
      };
    });
    const { error: capabilityError } = await admin.from("printer_capabilities").upsert(capabilityRows);
    if (capabilityError) return Response.json({ error: "Synchronisation des capacités impossible." }, { status: 503 });
  }
  return Response.json({ ok: true, receivedAt: now });
}
