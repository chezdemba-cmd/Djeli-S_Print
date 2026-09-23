import { NextResponse } from "next/server";
import { allowedMimes, type AllowedMime } from "@/lib/file-signature";
import { hashSessionToken } from "@/lib/session-token";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return NextResponse.json({ error: "Session invalide." }, { status: 404 });

  let body: { filename?: string; mimeType?: string; sizeBytes?: number };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Requête invalide." }, { status: 400 }); }
  const filename = String(body.filename ?? "").trim();
  const mimeType = String(body.mimeType ?? "") as AllowedMime;
  const sizeBytes = Number(body.sizeBytes);
  if (!filename || filename.length > 255 || !allowedMimes.has(mimeType) || !Number.isSafeInteger(sizeBytes) || sizeBytes < 1) {
    return NextResponse.json({ error: "Fichier invalide." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: reservation, error: reservationError } = await admin.rpc("reserve_document_upload", {
    submitted_token_hash: hashSessionToken(token), submitted_filename: filename,
    submitted_mime_type: mimeType, submitted_size_bytes: sizeBytes,
  }).single();
  if (reservationError || !reservation) return NextResponse.json({ error: "Session expirée ou déjà utilisée." }, { status: 409 });

  const row = reservation as { document_id: string; storage_path: string; expires_at: string };
  const { data: signed, error: signedError } = await admin.storage.from("documents").createSignedUploadUrl(row.storage_path);
  if (signedError || !signed) return NextResponse.json({ error: "Initialisation de l’upload impossible." }, { status: 500 });

  return NextResponse.json({ documentId: row.document_id, path: row.storage_path, uploadToken: signed.token, expiresAt: row.expires_at });
}
