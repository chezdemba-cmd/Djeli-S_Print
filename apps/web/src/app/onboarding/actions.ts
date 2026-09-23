"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { validateOrganization } from "@/lib/validation";

export async function createOrganization(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();

  const validationError = validateOrganization({ name, slug });
  if (validationError) redirect(`/onboarding?error=${encodeURIComponent(validationError)}`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_organization", {
    organization_name: name,
    organization_slug: slug,
  });

  if (error) {
    const message = error.code === "23505"
      ? "Cet identifiant d’organisation est déjà utilisé."
      : "La création de l’organisation a échoué.";
    redirect(`/onboarding?error=${encodeURIComponent(message)}`);
  }

  redirect("/dashboard");
}
