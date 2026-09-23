import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { hashSessionToken } from "@/lib/session-token";
import { createClient } from "@/lib/supabase/server";
import { MobileUpload } from "./mobile-upload";

export const metadata: Metadata = {
  title: "Envoyer un document · Djeli'S_Print",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function PublicSessionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("resolve_print_session", { submitted_token_hash: hashSessionToken(token) })
    .maybeSingle();
  if (error || !data) notFound();
  const session = data as {
    organization_name: string;
    workstation_name: string;
    max_upload_bytes: number;
  };

  return (
    <main className="mobile-session-shell">
      <section className="mobile-session-card">
        <Image src="/brand/djelis-print-logo.png" alt="Djeli'S_Print" width={112} height={112} priority />
        <p className="eyebrow">{session.organization_name}</p>
        <h1>Envoyez votre document</h1>
        <p className="auth-lead">Session sécurisée ouverte pour le poste {session.workstation_name}.</p>
        <MobileUpload token={token} maxUploadBytes={session.max_upload_bytes} />
        <p className="privacy-note">Votre fichier sera privé et supprimé automatiquement après impression.</p>
      </section>
    </main>
  );
}
