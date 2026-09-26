import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(documentId)) return new Response("Document invalide.", { status: 400 });

  const supabase = await createClient();
  const { data: document } = await supabase
    .from("documents")
    .select("storage_path, mime_type")
    .eq("id", documentId)
    .maybeSingle();
  if (!document) return new Response("Document introuvable.", { status: 404 });

  const { data: signed } = await supabase.storage.from("documents").createSignedUrl(document.storage_path, 60);
  if (!signed?.signedUrl) return new Response("Aperçu indisponible.", { status: 503 });

  const range = request.headers.get("range");
  const upstream = await fetch(signed.signedUrl, {
    headers: range ? { range } : undefined,
    cache: "no-store",
  });
  if (!upstream.ok && upstream.status !== 206) return new Response("Aperçu indisponible.", { status: 502 });

  const headers = new Headers({
    "Content-Type": document.mime_type,
    "Content-Disposition": "inline",
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
  });
  for (const name of ["accept-ranges", "content-length", "content-range"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
