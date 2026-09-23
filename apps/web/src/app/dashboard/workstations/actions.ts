"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMemberships, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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
