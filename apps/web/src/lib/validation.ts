const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const organizationSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateRegistration(input: {
  displayName: string;
  email: string;
  password: string;
}): string | null {
  if (input.displayName.trim().length < 2) return "Le nom doit contenir au moins 2 caractères.";
  if (!emailPattern.test(input.email.trim())) return "L’adresse email est invalide.";
  if (input.password.length < 10) return "Le mot de passe doit contenir au moins 10 caractères.";
  return null;
}

export function validateOrganization(input: { name: string; slug: string }): string | null {
  if (input.name.trim().length < 2 || input.name.trim().length > 120) {
    return "Le nom de l’organisation doit contenir entre 2 et 120 caractères.";
  }
  if (!organizationSlugPattern.test(input.slug)) {
    return "L’identifiant URL doit contenir uniquement des minuscules, chiffres et tirets.";
  }
  return null;
}
