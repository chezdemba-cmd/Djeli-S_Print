import { redirect } from "next/navigation";
import { createOrganization } from "@/app/onboarding/actions";
import { getMemberships, requireUser } from "@/lib/auth";

type OnboardingPageProps = { searchParams: Promise<{ error?: string }> };

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  await requireUser();
  const memberships = await getMemberships();
  if (memberships.length > 0) redirect("/dashboard");
  const params = await searchParams;

  return (
    <main className="auth-shell">
      <section className="auth-card onboarding-card">
        <p className="eyebrow">CONFIGURATION INITIALE</p>
        <h1>Créez votre imprimerie</h1>
        <p className="auth-lead">Cette organisation isolera vos utilisateurs, postes, imprimantes et documents.</p>
        {params.error ? <p className="notice error" role="alert">{params.error}</p> : null}
        <form action={createOrganization} className="auth-form">
          <label>Nom de l’imprimerie<input name="name" minLength={2} maxLength={120} required /></label>
          <label>
            Identifiant URL
            <input name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="imprimerie-vallee" required />
          </label>
          <button className="primary-button" type="submit">CRÉER L’ORGANISATION</button>
        </form>
      </section>
    </main>
  );
}
