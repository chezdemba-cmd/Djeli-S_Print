"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateRegistration } from "@/lib/validation";

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function authError(path: string, message: string): never {
  const params = new URLSearchParams({ error: message });
  redirect(`${path}?${params.toString()}`);
}

export async function signIn(formData: FormData) {
  const email = value(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) authError("/auth/login", "Email et mot de passe requis.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) authError("/auth/login", "Identifiants invalides ou compte non confirmé.");
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const displayName = value(formData, "displayName");
  const email = value(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  const validationError = validateRegistration({ displayName, email, password });
  if (validationError) authError("/auth/register", validationError);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback`,
      data: { display_name: displayName },
    },
  });

  if (error) authError("/auth/register", "Inscription impossible. Vérifiez les informations saisies.");
  if (data.session) redirect("/onboarding");

  const params = new URLSearchParams({ message: "Consultez votre email pour confirmer votre compte." });
  redirect(`/auth/login?${params.toString()}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
