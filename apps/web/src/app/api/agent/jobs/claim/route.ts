import { authenticateAgent } from "@/lib/agent-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const workstation = await authenticateAgent(request);
  if (!workstation) return Response.json({ error: "Agent non autorisé." }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_next_print_job", { target_workstation_id: workstation.id });
  if (error) return Response.json({ error: "Réclamation du travail impossible." }, { status: 409 });
  const job = data?.[0];
  if (!job) return new Response(null, { status: 204 });
  const { data: signed } = await admin.storage.from(job.storage_bucket).createSignedUrl(job.storage_path, 60);
  if (!signed?.signedUrl) return Response.json({ error: "Téléchargement indisponible." }, { status: 503 });
  return Response.json({ job: { ...job, downloadUrl: signed.signedUrl } });
}
