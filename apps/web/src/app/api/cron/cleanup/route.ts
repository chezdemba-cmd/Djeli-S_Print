import { isValidCronAuthorization } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

type DeletionRequest = { request_id: string; document_id: string; storage_bucket: string; storage_path: string };

export async function GET(request: Request) {
  if (!isValidCronAuthorization(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error: healthError } = await admin.rpc("maintain_print_agent_health");
  if (healthError) return Response.json({ error: "Maintenance des agents indisponible." }, { status: 503 });
  const { data, error } = await admin.rpc("claim_document_deletions", { batch_size: 50 });
  if (error) return Response.json({ error: "File de suppression indisponible." }, { status: 503 });

  const requests = (data ?? []) as DeletionRequest[];
  let deleted = 0;
  let failed = 0;
  for (const item of requests) {
    const { error: storageError } = await admin.storage.from(item.storage_bucket).remove([item.storage_path]);
    const { error: completionError } = await admin.rpc("complete_document_deletion", {
      target_request_id: item.request_id,
      succeeded: !storageError,
      failure_message: storageError?.message ?? null,
    });
    if (storageError || completionError) failed += 1;
    else deleted += 1;
  }

  return Response.json({ claimed: requests.length, deleted, failed });
}
