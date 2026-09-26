import Link from "next/link";
import { getMemberships, requireUser } from "@/lib/auth";

const actions = [
  {
    href: "/dashboard/qr",
    icon: "▦",
    label: "Afficher un QR",
    description: "Recevez immédiatement les fichiers de vos clients.",
    tone: "gold",
  },
  {
    href: "/dashboard/documents",
    icon: "↥",
    label: "Nouveaux fichiers",
    description: "Contrôlez et préparez les documents reçus.",
    tone: "cyan",
  },
  {
    href: "/dashboard/jobs",
    icon: "▤",
    label: "File d’impression",
    description: "Suivez chaque travail jusqu’à son impression.",
    tone: "dark",
  },
  {
    href: "/dashboard/workstations",
    icon: "⌁",
    label: "Gérer les postes",
    description: "Connectez vos ordinateurs et vos imprimantes.",
    tone: "light",
  },
] as const;

export default async function DashboardPage() {
  const [user, memberships] = await Promise.all([requireUser(), getMemberships()]);
  const membership = memberships[0];
  const organizationRelation = membership?.organizations;
  const organization = Array.isArray(organizationRelation)
    ? organizationRelation[0]
    : organizationRelation;
  const firstName = user.user_metadata?.display_name?.split(" ")[0] ?? "Bienvenue";

  return (
    <main className="dashboard-home">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="dashboard-kicker">TABLEAU DE BORD · {membership?.role ?? "MEMBRE"}</p>
          <h1>Bonjour {firstName},<br /><span>prêt à imprimer ?</span></h1>
          <p>Gérez les documents, les postes et les impressions de <strong>{organization?.name ?? "votre imprimerie"}</strong> depuis un seul espace.</p>
          <Link className="hero-cta" href="/dashboard/qr"><span>▦</span> Afficher le QR client</Link>
        </div>
        <div className="dashboard-hero-art" aria-hidden="true">
          <span className="hero-orbit orbit-one" />
          <span className="hero-orbit orbit-two" />
          <img src="/brand/djelis-print-logo.png" alt="" />
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <div><p className="dashboard-kicker">ACCÈS RAPIDE</p><h2>Que souhaitez-vous faire ?</h2></div>
          <span className="org-chip">● {organization?.slug}</span>
        </div>
        <div className="action-grid">
          {actions.map((action) => (
            <Link className={`action-card ${action.tone}`} href={action.href} key={action.href}>
              <span className="action-icon">{action.icon}</span>
              <span className="action-copy"><strong>{action.label}</strong><small>{action.description}</small></span>
              <span className="action-arrow">→</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="getting-started">
        <div>
          <p className="dashboard-kicker">BIEN DÉMARRER</p>
          <h2>Configurez votre espace en quelques minutes</h2>
          <p>Votre compte est prêt. Connectez maintenant le premier poste pour commencer à recevoir et imprimer.</p>
        </div>
        <ol className="setup-steps">
          <li className="done"><span>✓</span><div><b>Espace créé</b><small>{user.email}</small></div></li>
          <li><span>2</span><div><b>Connecter un poste</b><small>Installez et associez le Print Agent</small></div></li>
          <li><span>3</span><div><b>Afficher votre QR</b><small>Vos clients peuvent envoyer leurs fichiers</small></div></li>
        </ol>
        <Link className="setup-link" href="/dashboard/workstations">Continuer la configuration <span>→</span></Link>
      </section>
    </main>
  );
}
