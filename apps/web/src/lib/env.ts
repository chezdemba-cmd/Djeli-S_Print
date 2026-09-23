const requiredPublicVariables = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

export function getPublicEnv() {
  const values = Object.fromEntries(
    requiredPublicVariables.map((name) => [name, process.env[name]]),
  ) as Record<(typeof requiredPublicVariables)[number], string | undefined>;

  const missing = requiredPublicVariables.filter((name) => !values[name]);
  if (missing.length > 0) {
    throw new Error(`Variables d'environnement manquantes : ${missing.join(", ")}`);
  }

  return values as Record<(typeof requiredPublicVariables)[number], string>;
}
