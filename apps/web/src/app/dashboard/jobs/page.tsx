import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const columns = ["WAITING_OPERATOR", "PROCESSING", "PRINTING", "PRINTED", "FAILED"] as const;

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("print_jobs")
    .select("id, reference_number, status, created_at, documents(display_name), printers(display_name), print_settings(format, orientation, color_mode, copies)")
    .order("created_at", { ascending: false }).limit(100);
  const jobs = data ?? [];

  return (
    <main className="dashboard-shell jobs-shell">
      <nav className="back-nav"><Link href="/dashboard">← Tableau de bord</Link></nav>
      <header className="dashboard-header"><div><p className="eyebrow">PRODUCTION</p><h1>File d’impression</h1></div><Link className="secondary-link" href="/dashboard/documents">Nouveaux fichiers</Link></header>
      {params.message ? <p className="notice success">{params.message}</p> : null}
      <section className="jobs-board">{columns.map((status) => <div className="jobs-column" key={status}><header><span>{status.replaceAll("_", " ")}</span><b>{jobs.filter((job) => job.status === status).length}</b></header>{jobs.filter((job) => job.status === status).map((job) => {
        const doc = Array.isArray(job.documents) ? job.documents[0] : job.documents;
        const printer = Array.isArray(job.printers) ? job.printers[0] : job.printers;
        const settings = Array.isArray(job.print_settings) ? job.print_settings[0] : job.print_settings;
        return <article className="job-card" key={job.id}><span className="job-ref">#{String(job.reference_number).padStart(4,"0")}</span><h2>{doc?.display_name ?? "Document"}</h2><p>{settings?.format} · {settings?.copies} copie{settings?.copies === 1 ? "" : "s"} · {settings?.color_mode === "COLOR" ? "Couleur" : "N&B"}</p><small>{printer?.display_name ?? "Imprimante"}</small></article>;
      })}</div>)}</section>
    </main>
  );
}
