import { signOut } from "@/app/auth/actions";
import Link from "next/link";
import { getMemberships, requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  const [user, memberships] = await Promise.all([requireUser(), getMemberships()]);
  const membership = memberships[0];
  const organizationRelation = membership?.organizations;
  const organization = Array.isArray(organizationRelation)
    ? organizationRelation[0]
    : organizationRelation;

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">DJELI&apos;S_PRINT · CONSOLE</p>
          <h1>{organization?.name ?? "Votre imprimerie"}</h1>
          <p className="auth-lead">Socle sécurisé connecté · {membership?.role}</p>
        </div>
        <form action={signOut}><button className="secondary-button" type="submit">Déconnexion</button></form>
      </header>
      <section className="grid">
        <article><h2>Compte</h2><p>{user.email}</p></article>
        <article><h2>Organisation</h2><p>{organization?.slug}</p></article>
        <article><h2>Étape suivante</h2><p>Enregistrement sécurisé du premier poste et génération du QR.</p></article>
      </section>
      <div className="hero-actions">
        <Link className="primary-link" href="/dashboard/documents">NOUVEAUX FICHIERS</Link>
        <Link className="primary-link" href="/dashboard/workstations">GÉRER LES POSTES</Link>
        <Link className="secondary-link" href="/dashboard/qr">AFFICHER UN QR</Link>
      </div>
    </main>
  );
}
