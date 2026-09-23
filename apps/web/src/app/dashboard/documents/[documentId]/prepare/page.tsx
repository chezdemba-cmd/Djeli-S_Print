import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintSettingsForm } from "./print-settings-form";

export default async function PreparePage({ params, searchParams }: { params: Promise<{ documentId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { documentId } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const [{ data: document }, { data: printers }] = await Promise.all([
    supabase.from("documents").select("id, display_name, status, preflight_rating, page_count").eq("id", documentId).maybeSingle(),
    supabase.from("printers").select("id, display_name, printer_capabilities(formats, supports_color)").eq("is_enabled", true).order("display_name"),
  ]);
  if (!document || document.status !== "READY") notFound();
  const options = (printers ?? []).flatMap((printer) => {
    const relation = Array.isArray(printer.printer_capabilities) ? printer.printer_capabilities[0] : printer.printer_capabilities;
    return relation ? [{ id: printer.id, name: printer.display_name, formats: relation.formats as string[], supportsColor: Boolean(relation.supports_color) }] : [];
  });

  return (
    <main className="prepare-shell">
      <section className="prepare-preview"><Link href={`/dashboard/documents/${document.id}`}>← Aperçu</Link><div className="paper-placeholder"><span>{document.page_count ?? 1} page{document.page_count === 1 ? "" : "s"}</span><strong>{document.display_name}</strong></div><div className="preflight-chip">Préflight · {document.preflight_rating}</div></section>
      <aside className="settings-panel"><p className="eyebrow">CONFIGURATION</p><h1>Préparer l’impression</h1>{query.error ? <p className="notice error">{query.error}</p> : null}<PrintSettingsForm documentId={document.id} printers={options} /></aside>
    </main>
  );
}
