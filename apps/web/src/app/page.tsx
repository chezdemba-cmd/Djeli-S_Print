import Image from "next/image";
import Link from "next/link";

const boundaries = [
  ["Web", "Portail mobile sans compte et console opérateur"],
  ["Supabase", "Auth, PostgreSQL/RLS, Realtime et Storage privé"],
  ["Print Agent", "Découverte des imprimantes et exécution locale isolée"],
  ["Contrats", "États et messages partagés, indépendants du transport"],
];

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="brand">
          <Image
            src="/brand/djelis-print-logo.png"
            alt="Logo Djeli'S_Print"
            width={160}
            height={160}
            priority
          />
          <p className="eyebrow">DJELI&apos;S_PRINT · MVP</p>
        </div>
        <h1>Le socle de la plateforme d’impression est prêt.</h1>
        <p className="lead">
          Monorepo Next.js, Electron et contrats métier partagés. Les écrans du prototype restent la
          référence visuelle pour les prochaines étapes.
        </p>
        <div className="hero-actions">
          <Link className="primary-link" href="/auth/login">ESPACE IMPRIMEUR</Link>
          <Link className="secondary-link" href="/auth/register">CRÉER UN COMPTE</Link>
        </div>
      </section>
      <section className="grid" aria-label="Architecture du produit">
        {boundaries.map(([title, detail]) => (
          <article key={title}>
            <h2>{title}</h2>
            <p>{detail}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
