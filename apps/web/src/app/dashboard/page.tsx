import Link from "next/link";
import { getMemberships } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const demoDocuments = [
  { id: "demo-1", display_name: "flyers-rentree.pdf", mime_type: "application/pdf", size_bytes: 4_800_000, status: "READY", page_count: 2, created_at: new Date().toISOString(), format: "A5 · couleur", ttl: "Expire dans 22 h" },
  { id: "demo-2", display_name: "plan-chantier.pdf", mime_type: "application/pdf", size_bytes: 12_400_000, status: "RECEIVED", page_count: 1, created_at: new Date().toISOString(), format: "A1 · N&B", ttl: "Expire dans 19 h" },
  { id: "demo-3", display_name: "cartes-visite.pdf", mime_type: "application/pdf", size_bytes: 2_100_000, status: "READY", page_count: 4, created_at: new Date().toISOString(), format: "85×55 mm · couleur", ttl: "Expire dans 8 h" },
  { id: "demo-4", display_name: "menu-brasserie.pdf", mime_type: "application/pdf", size_bytes: 7_700_000, status: "RECEIVED", page_count: 6, created_at: new Date().toISOString(), format: "A3 · couleur", ttl: "Expire dans 4 h" },
];

function shortSize(bytes: number) {
  return bytes < 1_048_576 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${(bytes / 1_048_576).toFixed(1).replace(".", ",")} Mo`;
}

export default async function DashboardPage() {
  const membership = (await getMemberships())[0]!;
  const supabase = await createClient();
  const organizationId = membership.organization_id;
  const [documentsResult, workstationsResult, jobsResult] = await Promise.all([
    supabase.from("documents").select("id, display_name, mime_type, size_bytes, status, page_count, created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(4),
    supabase.from("workstations").select("id, name, status, agent_version").eq("organization_id", organizationId).order("created_at"),
    supabase.from("print_jobs").select("id, status, created_at", { count: "exact" }).eq("organization_id", organizationId),
  ]);
  const realDocuments = documentsResult.data ?? [];
  const isDemo = realDocuments.length === 0 && (jobsResult.data ?? []).length === 0;
  const documents = isDemo ? demoDocuments : realDocuments.map((document) => ({ ...document, format: document.mime_type === "application/pdf" ? "PDF prêt à imprimer" : "Image haute définition", ttl: "Expire dans 24 h" }));
  const workstations = workstationsResult.data ?? [];
  const jobs = jobsResult.data ?? [];
  const figures = isDemo
    ? { today: 38, waiting: 4, active: "3/4", completed: 29, revenue: "486 €", delay: "7 min" }
    : { today: jobs.length, waiting: documents.length, active: `${workstations.filter((item) => item.status !== "OFFLINE").length}/${workstations.length}`, completed: jobs.filter((item) => item.status === "PRINTED").length, revenue: "—", delay: "—" };

  return <main className="presspoint-dashboard">
    <section className="presspoint-metrics presspoint-metrics-six">
      <article><small>Impressions aujourd’hui</small><strong>{figures.today}</strong><span className="positive">+12 % vs hier</span></article>
      <article><small>Nouveaux travaux</small><strong>{figures.waiting}</strong><span>à préparer</span></article>
      <article><small>Machines actives</small><strong>{figures.active}</strong><span>atelier connecté</span></article>
      <article><small>Travaux terminés</small><strong>{figures.completed}</strong><span>aujourd’hui</span></article>
      <article><small>Chiffre du jour</small><strong>{figures.revenue}</strong><span className="positive">+8 % vs moyenne</span></article>
      <article><small>Délai moyen</small><strong>{figures.delay}</strong><span>prise en charge</span></article>
    </section>

    <div className="presspoint-grid">
      <section className="presspoint-panel presspoint-new-jobs">
        <header><h1>Nouveaux travaux <span>{documents.length}</span></h1><small><i /> Réception en direct</small></header>
        <div className="presspoint-documents">{documents.map((document) => <article key={document.id}>
          <div className="presspoint-doc-icon"><span /><span /><b>{document.mime_type === "application/pdf" ? "PDF" : "IMG"}</b></div>
          <div className="presspoint-doc-copy"><strong>{document.display_name}</strong><small>{document.format}<br />{document.page_count ?? "—"} page(s) · {shortSize(document.size_bytes)}</small><span>{document.ttl}</span></div>
          <b className={`presspoint-badge ${document.status.toLowerCase()}`}>{document.status === "READY" ? "PRÊT" : "REÇU"}</b>
          <Link href={isDemo ? "/dashboard/documents" : `/dashboard/documents/${document.id}/prepare`}>Préparer</Link>
        </article>)}</div>
      </section>

      <aside className="presspoint-side-stack">
        <section className="presspoint-panel presspoint-chart"><header><h2>Impressions par heure</h2><small>pages</small></header><div>{[34,58,76,48,25,62,90,70,52,31].map((height, index) => <span key={index} className={index === 5 ? "highlight" : ""} style={{ height: `${height}%` }}><i>{9 + index}h</i></span>)}</div></section>
        <section className="presspoint-panel presspoint-queue"><h2>File d’attente</h2><p><i className="gray" />En attente <span /><b>{isDemo ? 4 : documents.length}</b></p><p><i className="cyan" />Préparation <span /><b>{isDemo ? 3 : 0}</b></p><p><i className="orange" />Impression <span /><b>{isDemo ? 2 : 0}</b></p><p><i className="green" />Terminé <span /><b>{figures.completed}</b></p></section>
        <section className="presspoint-panel presspoint-machines"><h2>Machines</h2>{isDemo ? <><article><i /><div><strong>HP LaserJet Pro</strong><small>A4 · A3 · Couleur</small></div><b>PRÊTE</b></article><article><i /><div><strong>Canon imagePROGRAF</strong><small>Grand format · Rouleau</small></div><b>ACTIVE</b></article><article><i className="offline" /><div><strong>Roland TrueVIS</strong><small>Vinyle · Découpe</small></div><b>MAINTENANCE</b></article></> : workstations.map((machine) => <article key={machine.id}><i className={machine.status === "OFFLINE" ? "offline" : ""} /><div><strong>{machine.name}</strong><small>Agent {machine.agent_version ?? "à configurer"}</small></div><b>{machine.status}</b></article>)}</section>
      </aside>
    </div>
  </main>;
}
