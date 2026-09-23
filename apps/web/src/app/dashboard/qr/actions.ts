"use server";

import { getMemberships, requireUser } from "@/lib/auth";
import { createSessionToken, hashSessionToken } from "@/lib/session-token";
import { createClient } from "@/lib/supabase/server";

export type QrSessionState = {
  error?: string;
  token?: string;
  sessionId?: string;
  expiresAt?: string;
  publicUrl?: string;
};

export async function createQrSession(
  _previousState: QrSessionState,
  formData: FormData,
): Promise<QrSessionState> {
  const user = await requireUser();
  const memberships = await getMemberships();
  const organizationId = memberships[0]?.organization_id;
  if (!organizationId) return { error: "Organisation introuvable." };

  const workstationId = String(formData.get("workstationId") ?? "");
  const durationMinutes = Number(formData.get("durationMinutes") ?? 15);
  if (!workstationId || !Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 60) {
    return { error: "Poste ou durée de session invalide." };
  }

  const supabase = await createClient();
  const { data: workstation } = await supabase
    .from("workstations")
    .select("id")
    .eq("id", workstationId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!workstation) return { error: "Ce poste n’est pas accessible." };

  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + durationMinutes * 60_000).toISOString();
  const { data, error } = await supabase
    .from("print_sessions")
    .insert({
      organization_id: organizationId,
      workstation_id: workstationId,
      token_hash: hashSessionToken(token),
      expires_at: expiresAt,
      max_documents: 1,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Impossible de créer la session QR." };
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  return {
    token,
    sessionId: data.id,
    expiresAt,
    publicUrl: `${appUrl}/s/${token}`,
  };
}
