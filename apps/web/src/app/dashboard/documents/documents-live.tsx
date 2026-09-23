"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type DocumentListItem = {
  id: string;
  display_name: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  page_count: number | null;
  width_px: number | null;
  height_px: number | null;
  source_dpi: number | null;
  expires_at: string;
  created_at: string;
};

const activeStatuses = new Set(["RECEIVED", "ANALYZING", "READY", "WAITING_OPERATOR", "PROCESSING", "PRINTING"]);

function formatSize(bytes: number) {
  return new Intl.NumberFormat("fr-FR", { style: "unit", unit: "megabyte", maximumFractionDigits: 2 }).format(bytes / 1_000_000);
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(id); }, []);
  const minutes = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 60_000));
  return <span className={minutes < 10 ? "expiry urgent" : "expiry"}>Suppression dans {minutes} min</span>;
}

export function DocumentsLive({ organizationId, initialDocuments }: { organizationId: string; initialDocuments: DocumentListItem[] }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [connected, setConnected] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const channel = supabase.channel(`documents:${organizationId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "documents", filter: `organization_id=eq.${organizationId}` }, (payload: { eventType: string; old: Record<string, unknown>; new: Record<string, unknown> }) => {
        if (payload.eventType === "DELETE") {
          setDocuments((current) => current.filter((item) => item.id !== (payload.old as { id?: string }).id));
          return;
        }
        const incoming = payload.new as DocumentListItem;
        setDocuments((current) => [incoming, ...current.filter((item) => item.id !== incoming.id)]
          .sort((a, b) => b.created_at.localeCompare(a.created_at)));
      })
      .subscribe((status: string) => setConnected(status === "SUBSCRIBED"));
    return () => { void supabase.removeChannel(channel); };
  }, [organizationId, supabase]);

  return (
    <>
      <div className="live-indicator"><span className={connected ? "online-dot" : "offline-dot"} />{connected ? "Temps réel connecté" : "Connexion temps réel…"}</div>
      <section className="document-grid">
        {documents.filter((document) => activeStatuses.has(document.status)).map((document) => (
          <article className="document-card" key={document.id}>
            <div className={`document-thumb ${document.mime_type === "application/pdf" ? "pdf" : "image"}`}>
              {document.mime_type === "application/pdf" ? "PDF" : "IMG"}
            </div>
            <div className="document-body">
              <div className="document-title-row"><h2 title={document.display_name}>{document.display_name}</h2><span className={`job-status ${document.status.toLowerCase()}`}>{document.status}</span></div>
              <div className="document-meta">
                <span>{formatSize(document.size_bytes)}</span>
                {document.page_count ? <span>{document.page_count} page{document.page_count > 1 ? "s" : ""}</span> : null}
                {document.width_px && document.height_px ? <span>{document.width_px}×{document.height_px}px</span> : null}
                {document.source_dpi ? <span>{Math.round(document.source_dpi)} DPI</span> : null}
              </div>
              <Countdown expiresAt={document.expires_at} />
              <Link className="primary-link document-action" href={`/dashboard/documents/${document.id}`}>APERÇU</Link>
            </div>
          </article>
        ))}
        {documents.filter((document) => activeStatuses.has(document.status)).length === 0 ? (
          <article className="empty-state"><div className="empty-icon">↓</div><h2>Aucun fichier reçu</h2><p>Les documents envoyés depuis un QR apparaîtront ici instantanément.</p></article>
        ) : null}
      </section>
    </>
  );
}
