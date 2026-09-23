import { createAgentSecret, hashAgentSecret } from "@/lib/agent-crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const pairingCode = typeof body?.pairingCode === "string" ? body.pairingCode.trim() : "";
  const agentIdentifier = typeof body?.agentIdentifier === "string" ? body.agentIdentifier.trim() : "";
  const agentVersion = typeof body?.agentVersion === "string" ? body.agentVersion.trim().slice(0, 40) : null;
  if (pairingCode.length < 32 || agentIdentifier.length < 8 || agentIdentifier.length > 160) {
    return Response.json({ error: "Données d’appairage invalides." }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: workstation } = await admin.from("workstations")
    .select("id, organization_id, name")
    .eq("pairing_secret_hash", hashAgentSecret(pairingCode))
    .gt("pairing_expires_at", now)
    .maybeSingle();
  if (!workstation) return Response.json({ error: "Code invalide ou expiré." }, { status: 401 });

  const token = createAgentSecret();
  const { data: paired, error } = await admin.from("workstations").update({
    agent_identifier: agentIdentifier,
    agent_version: agentVersion,
    agent_token_hash: hashAgentSecret(token),
    pairing_secret_hash: null,
    pairing_expires_at: null,
    paired_at: now,
    last_seen_at: now,
    status: "ONLINE",
  }).eq("id", workstation.id).eq("pairing_secret_hash", hashAgentSecret(pairingCode)).select("id").maybeSingle();
  if (error || !paired) return Response.json({ error: "Appairage impossible." }, { status: 409 });

  return Response.json({ token, workstation: { id: workstation.id, name: workstation.name } });
}
