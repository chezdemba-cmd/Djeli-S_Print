import { after, NextResponse } from "next/server";
import { detectMime, type AllowedMime } from "@/lib/file-signature";
import { hashSessionToken } from "@/lib/session-token";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeDocument } from "@/lib/preflight/analyze-document";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request, context: { params: Promise<{ token: string; documentId: string }> }) {
  if (!await consumeRateLimit(request, "public-upload-finalize", 30, 600)) {
    return NextResponse.json({ error: "Trop de tentatives. Réessayez plus tard." }, { status: 429 });
  }
  const { token, documentId } = await context.params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token) || !/^[a-f0-9-]{36}$/i.test(documentId)) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const admin = createAdminClient();
  const tokenHash = hashSessionToken(token);
  const { data: session } = await admin.from("print_sessions").select("id").eq("token_hash", tokenHash).maybeSingle();
  if (!session) return NextResponse.json({ error: "Session invalide." }, { status: 404 });
  const { data: document } = await admin.from("documents")
    .select("id, print_session_id, storage_path, mime_type, size_bytes, status")
    .eq("id", documentId).eq("print_session_id", session.id).maybeSingle();
  if (!document || document.status !== "UPLOADING") return NextResponse.json({ error: "Document invalide." }, { status: 409 });

  const { data: signed } = await admin.storage.from("documents").createSignedUrl(document.storage_path, 60);
  if (!signed?.signedUrl) return NextResponse.json({ error: "Fichier absent." }, { status: 409 });
  const head = await fetch(signed.signedUrl, { method: "HEAD", cache: "no-store" });
  const storedSize = Number(head.headers.get("content-length"));
  if (!head.ok || !Number.isSafeInteger(storedSize) || storedSize !== document.size_bytes) {
    await admin.storage.from("documents").remove([document.storage_path]);
    await admin.from("documents").update({ status: "FAILED", error_code: "SIZE_MISMATCH", error_message: "Taille du fichier invalide." }).eq("id", document.id);
    return NextResponse.json({ error: "La taille reçue ne correspond pas au fichier annoncé." }, { status: 422 });
  }
  const response = await fetch(signed.signedUrl, { headers: { Range: "bytes=0-31" }, cache: "no-store" });
  if (response.status !== 206) return NextResponse.json({ error: "Fichier illisible." }, { status: 422 });
  const bytes = new Uint8Array(await response.arrayBuffer());
  const detectedMime = detectMime(bytes);

  if (!detectedMime || detectedMime !== document.mime_type as AllowedMime) {
    await admin.storage.from("documents").remove([document.storage_path]);
    await admin.from("documents").update({ status: "FAILED", error_code: "MIME_MISMATCH", error_message: "Signature de fichier invalide." }).eq("id", document.id);
    return NextResponse.json({ error: "Le contenu ne correspond pas au type de fichier annoncé." }, { status: 422 });
  }

  const { error } = await admin.from("documents").update({ status: "RECEIVED", received_at: new Date().toISOString() }).eq("id", document.id);
  if (error) return NextResponse.json({ error: "Finalisation impossible." }, { status: 500 });
  after(() => analyzeDocument(document.id));
  return NextResponse.json({ documentId: document.id, status: "RECEIVED" });
}

export const maxDuration = 60;
