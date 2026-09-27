import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const columns = [
  ["WAITING_OPERATOR", "En attente", "#84939a"],
  ["PROCESSING", "Préparation", "#0e7490"],
  ["PRINTING", "Impression", "#f59e0b"],
  ["PRINTED", "Terminé", "#15803d"],
  ["FAILED", "À vérifier", "#b91c1c"],
] as const;

const demoJobs = [
  { id:"d1", status:"WAITING_OPERATOR", reference_number:252, name:"affiche-concert.pdf", format:"A2 · couleur · ×10", machine:"Non assignée", progress:0 },
  { id:"d2", status:"WAITING_OPERATOR", reference_number:251, name:"contrat-location.pdf", format:"A4 · N&B · ×3", machine:"Non assignée", progress:0 },
  { id:"d3", status:"PROCESSING", reference_number:250, name:"cartes-visite.pdf", format:"85×55 mm · ×250", machine:"HP LaserJet Pro", progress:35 },
  { id:"d4", status:"PROCESSING", reference_number:249, name:"brochure-automne.pdf", format:"A4 · couleur · ×30", machine:"HP LaserJet Pro", progress:62 },
  { id:"d5", status:"PRINTING", reference_number:248, name:"plan-chantier.pdf", format:"A1 · N&B · ×2", machine:"Canon imagePROGRAF", progress:74 },
  { id:"d6", status:"PRINTED", reference_number:247, name:"flyers-rentree.pdf", format:"A5 · couleur · ×500", machine:"HP LaserJet Pro", progress:100 },
  { id:"d7", status:"PRINTED", reference_number:246, name:"menu-brasserie.pdf", format:"A3 · couleur · ×40", machine:"HP LaserJet Pro", progress:100 },
  { id:"d8", status:"FAILED", reference_number:245, name:"vinyle-vitrine.pdf", format:"180×120 cm · ×1", machine:"Roland TrueVIS", progress:18 },
];

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("print_jobs").select("id, reference_number, status, created_at, documents(display_name), printers(display_name), print_settings(format, color_mode, copies)").order("created_at", { ascending: false }).limit(100);
  const jobs = data?.length ? data.map((job) => {
    const doc = Array.isArray(job.documents) ? job.documents[0] : job.documents;
    const printer = Array.isArray(job.printers) ? job.printers[0] : job.printers;
    const settings = Array.isArray(job.print_settings) ? job.print_settings[0] : job.print_settings;
    return { id:job.id, status:job.status, reference_number:job.reference_number, name:doc?.display_name ?? "Document", format:`${settings?.format ?? "A4"} · ${settings?.color_mode === "COLOR" ? "couleur" : "N&B"} · ×${settings?.copies ?? 1}`, machine:printer?.display_name ?? "Non assignée", progress:job.status === "PRINTED" ? 100 : job.status === "PRINTING" ? 68 : 0 };
  }) : demoJobs;

  return <main className="presspoint-queue-page">
    <div className="queue-page-heading"><div><p>PRODUCTION EN DIRECT</p><h1>Console d’impression</h1><span>Glissez les travaux entre les étapes ou ouvrez une fiche pour les préparer.</span></div><Link href="/dashboard/documents">+ Nouveau travail</Link></div>
    {params.message ? <p className="notice success">{params.message}</p> : null}
    <section className="jobs-board">{columns.map(([status, label, color]) => {
      const items = jobs.filter((job) => job.status === status);
      return <div className={`jobs-column jobs-${status.toLowerCase()}`} key={status}>
        <header><span><i style={{background:color}} />{label}</span><b>{items.length}</b></header>
        <div className="jobs-column-body">{items.map((job) => <article className="job-card" key={job.id}>
          <div className="job-card-top"><span className="job-ref">#{String(job.reference_number).padStart(4,"0")}</span><button aria-label="Options">•••</button></div>
          <h2>{job.name}</h2><p>{job.format}</p><small><i style={{background:color}} />{job.machine}</small>
          {job.progress > 0 ? <div className="job-progress"><span style={{width:`${job.progress}%`, background:color}} /></div> : null}
        </article>)}</div>
      </div>;
    })}</section>
  </main>;
}
