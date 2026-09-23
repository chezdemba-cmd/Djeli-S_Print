import Link from "next/link";
import { getMemberships } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DocumentsLive, type DocumentListItem } from "./documents-live";

export default async function DocumentsPage() {
  const memberships = await getMemberships();
  const organizationId = memberships[0]!.organization_id;
  const supabase = await createClient();
  const { data, error } = await supabase.from("documents")
    .select("id, display_name, mime_type, size_bytes, status, page_count, width_px, height_px, source_dpi, expires_at, created_at")
    .eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error("Impossible de charger les documents.");

  return (
    <main className="dashboard-shell narrow-dashboard">
      <nav className="back-nav"><Link href="/dashboard">← Tableau de bord</Link></nav>
      <header className="dashboard-header"><div><p className="eyebrow">RÉCEPTION</p><h1>Nouveaux fichiers</h1><p className="auth-lead">Les 100 documents les plus récents de l’organisation.</p></div><Link className="primary-link" href="/dashboard/qr">AFFICHER LE QR</Link></header>
      <DocumentsLive organizationId={organizationId} initialDocuments={(data ?? []) as DocumentListItem[]} />
    </main>
  );
}
