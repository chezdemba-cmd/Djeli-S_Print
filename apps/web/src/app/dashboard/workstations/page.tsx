import Link from "next/link";
import { registerWorkstation } from "@/app/dashboard/workstations/actions";
import { PairAgentForm } from "@/app/dashboard/workstations/pair-agent-form";
import { getMemberships } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type WorkstationsPageProps = { searchParams: Promise<{ error?: string; message?: string }> };

export default async function WorkstationsPage({ searchParams }: WorkstationsPageProps) {
  const memberships = await getMemberships();
  const organizationId = memberships[0]?.organization_id;
  const params = await searchParams;
  const supabase = await createClient();
  const { data: workstations } = organizationId
    ? await supabase.from("workstations")
        .select("id, name, status, last_seen_at, paired_at, agent_version, created_at")
        .eq("organization_id", organizationId).order("created_at", { ascending: true })
    : { data: [] };

  return (
    <main className="dashboard-shell narrow-dashboard">
      <nav className="back-nav"><Link href="/dashboard">← Tableau de bord</Link></nav>
      <header className="dashboard-header">
        <div><p className="eyebrow">ATELIER</p><h1>Postes informatiques</h1></div>
        {workstations?.length ? <Link className="primary-link" href="/dashboard/qr">CRÉER UN QR</Link> : null}
      </header>
      {params.error ? <p className="notice error" role="alert">{params.error}</p> : null}
      {params.message ? <p className="notice success">{params.message}</p> : null}
      <section className="workstation-layout">
        <div className="workstation-list">
          {workstations?.length ? workstations.map((workstation) => (
            <article key={workstation.id} className="workstation-card">
              <div>
                <h2>{workstation.name}</h2>
                <p>{workstation.paired_at
                  ? `Agent ${workstation.agent_version ?? "lié"} · Dernier contact ${workstation.last_seen_at ? new Date(workstation.last_seen_at).toLocaleString("fr-FR") : "inconnu"}`
                  : "Agent non lié · En attente d’installation"}</p>
                <PairAgentForm workstationId={workstation.id} />
              </div>
              <span className={`status-pill ${String(workstation.status).toLowerCase()}`}>{workstation.status}</span>
            </article>
          )) : <article><h2>Aucun poste</h2><p>Enregistrez le poste du comptoir pour générer son premier QR.</p></article>}
        </div>
        <aside className="side-card">
          <h2>Ajouter un poste</h2>
          <form action={registerWorkstation} className="auth-form">
            <label>Nom du poste<input name="name" placeholder="Comptoir principal" minLength={2} maxLength={120} required /></label>
            <button className="primary-button" type="submit">ENREGISTRER</button>
          </form>
        </aside>
      </section>
    </main>
  );
}
