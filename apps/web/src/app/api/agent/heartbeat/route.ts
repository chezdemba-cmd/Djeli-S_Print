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

  await admin.from("workstations").update({ status: "ONLINE", last_seen_at: now, agent_version: body.version?.slice(0, 40) }).eq("id", workstation.id);
  for (const item of discovered) {
    const systemName = typeof item.systemName === "string" ? item.systemName.trim().slice(0, 255) : "";
    if (!systemName) continue;
    const { data: printer } = await admin.from("printers").upsert({
      organization_id: workstation.organization_id,
      workstation_id: workstation.id,
      system_name: systemName,
      display_name: typeof item.displayName === "string" ? item.displayName.trim().slice(0, 160) || systemName : systemName,
      is_default: item.isDefault === true,
      last_seen_at: now,
    }, { onConflict: "workstation_id,system_name" }).select("id").single();
    if (!printer) continue;
    await admin.from("printer_capabilities").upsert({
      printer_id: printer.id,
      organization_id: workstation.organization_id,
      formats: Array.isArray(item.formats) ? item.formats.filter((value): value is string => typeof value === "string" && formats.has(value)) : ["A4"],
      supports_color: item.supportsColor === true,
      supports_duplex: item.supportsDuplex === true,
      captured_at: now,
    });
  }
  return Response.json({ ok: true, receivedAt: now });
}
