import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DocumentPreviewPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  const supabase = await createClient();
  const { data: document } = await supabase.from("documents")
    .select("id, display_name, mime_type, size_bytes, status, storage_path, page_count, width_px, height_px, width_mm, height_mm, source_dpi, preflight_rating, preflight_data, expires_at, created_at")
    .eq("id", documentId).maybeSingle();
  if (!document) notFound();
  const { data: signed } = await supabase.storage.from("documents").createSignedUrl(document.storage_path, 300);
  if (!signed?.signedUrl) throw new Error("Impossible de créer l’aperçu privé.");
  const preflight = document.preflight_data as { formatQualities?: Array<{ format: string; dpi: number; rating: string }>; orientation?: string; pageSizesConsistent?: boolean };

  return (
    <main className="preview-shell">
      <header className="preview-header">
        <div><Link href="/dashboard/documents">← Nouveaux fichiers</Link><h1>{document.display_name}</h1><p>{document.mime_type} · {(document.size_bytes / 1_000_000).toFixed(2)} Mo · {document.status}</p></div>
        <span className={`job-status ${String(document.status).toLowerCase()}`}>{document.status}</span>
      </header>
      <section className="preview-layout">
        <div className="preview-canvas">
          {document.mime_type === "application/pdf" ? (
            <iframe title={`Aperçu de ${document.display_name}`} src={signed.signedUrl} sandbox="allow-same-origin" referrerPolicy="no-referrer" />
          ) : (
            // Signed private URL; using a native image avoids allowing arbitrary hosts in Next config.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={signed.signedUrl} alt={`Aperçu de ${document.display_name}`} referrerPolicy="no-referrer" />
          )}
        </div>
        <aside className="preview-details">
          <h2>Informations</h2>
          <dl>
            <div><dt>Pages</dt><dd>{document.page_count ?? "Analyse en attente"}</dd></div>
            <div><dt>Dimensions</dt><dd>{document.width_px && document.height_px ? `${document.width_px} × ${document.height_px} px` : "Analyse en attente"}</dd></div>
            <div><dt>Résolution</dt><dd>{document.source_dpi ? `${Math.round(document.source_dpi)} DPI` : "Analyse en attente"}</dd></div>
            <div><dt>Expiration</dt><dd>{new Date(document.expires_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</dd></div>
          </dl>
          <p className="signed-url-note">Aperçu signé valable 5 minutes. Le fichier reste privé.</p>
          {document.preflight_rating ? (
            <div className="preflight-summary">
              <h2>Préflight</h2>
              <span className={`quality-badge ${String(document.preflight_rating).toLowerCase()}`}>{document.preflight_rating}</span>
              {document.width_mm && document.height_mm ? <p>{document.width_mm} × {document.height_mm} mm · {preflight.orientation}</p> : null}
              {preflight.formatQualities ? <div className="quality-list">{preflight.formatQualities.map((item) => <div key={item.format}><strong>{item.format}</strong><span>{item.dpi} DPI</span><em>{item.rating}</em></div>)}</div> : null}
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
