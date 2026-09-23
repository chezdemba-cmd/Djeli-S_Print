"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMemberships, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAgentSecret, hashAgentSecret } from "@/lib/agent-crypto";

export type PairingState = { code?: string; error?: string; expiresAt?: string };

export async function createPairingCode(_state: PairingState, formData: FormData): Promise<PairingState> {
  await requireUser();
  const membership = (await getMemberships())[0];
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) return { error: "Droits administrateur requis." };
  const workstationId = String(formData.get("workstationId") ?? "");
  const code = createAgentSecret(24);
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  const supabase = await createClient();
  const { data, error } = await supabase.from("workstations").update({
    pairing_secret_hash: hashAgentSecret(code), pairing_expires_at: expiresAt,
  }).eq("id", workstationId).eq("organization_id", membership.organization_id).select("id").maybeSingle();
  if (error || !data) return { error: "Impossible de créer le code d’appairage." };
  return { code, expiresAt };
}

export async function registerWorkstation(formData: FormData) {
  await requireUser();
  const memberships = await getMemberships();
  const membership = memberships[0];
  if (!membership) redirect("/onboarding");

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 120) {
    redirect("/dashboard/workstations?error=Le+nom+du+poste+est+invalide.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("workstations").insert({
    organization_id: membership.organization_id,
    name,
  });

  if (error) {
    const message = error.code === "23505" ? "Un poste porte déjà ce nom." : "Création du poste impossible.";
    redirect(`/dashboard/workstations?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/dashboard/workstations");
  redirect("/dashboard/workstations?message=Poste+enregistré.");
}
