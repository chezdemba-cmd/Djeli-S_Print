"use server";

import { requireUser } from "@/lib/auth";
import { createSessionToken, hashSessionToken } from "@/lib/session-token";
import { createClient } from "@/lib/supabase/server";

const DAY_PASS_DURATION_SECONDS = 86_400;

export type QrSessionState = {
  error?: string;
  token?: string;
  sessionId?: string;
  expiresAt?: string;
  publicUrl?: string;
};

function publicSessionUrl(token: string) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100").replace(/\/$/, "");
  return `${appUrl}/s/${token}`;
}

// Always creates a fresh day-pass session for the workstation, atomically
// revoking any session still active there — see create_qr_session() in
// supabase/migrations/202609270012_day_pass_qr_sessions.sql. There is
// intentionally no "reuse the existing one" branch here: reuse happens
// client-side, from the token cached in the operator's browser (the raw
// token is never persisted server-side, only its hash, so the server has
// nothing to hand back to reuse). This action is the explicit
// "Générer/Régénérer" path.
export async function createQrSession(
  _previousState: QrSessionState,
  formData: FormData,
): Promise<QrSessionState> {
  await requireUser();
  const workstationId = String(formData.get("workstationId") ?? "");
  if (!workstationId) return { error: "Poste invalide." };

  const token = createSessionToken();
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("create_qr_session", {
      target_workstation_id: workstationId,
      submitted_token_hash: hashSessionToken(token),
      duration_seconds: DAY_PASS_DURATION_SECONDS,
    })
    .single();

  if (error || !data) return { error: "Impossible de créer la session QR." };
  const row = data as { session_id: string; expires_at: string };

  return {
    token,
    sessionId: row.session_id,
    expiresAt: row.expires_at,
    publicUrl: publicSessionUrl(token),
  };
}

export type ActiveQrSessionStatus = { active: boolean; expiresAt?: string };

// Read-only: lets the QR page tell the operator "a session is already active
// for this workstation, generated from another screen" instead of silently
// creating a second one. Never returns a token (none is stored server-side).
export async function getActiveQrSessionStatus(workstationId: string): Promise<ActiveQrSessionStatus> {
  await requireUser();
  if (!workstationId) return { active: false };

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("resolve_active_qr_session", { target_workstation_id: workstationId })
    .maybeSingle();

  if (error || !data) return { active: false };
  return { active: true, expiresAt: (data as { expires_at: string }).expires_at };
}
