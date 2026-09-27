import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { captureError } from "@/lib/observability";

type DeletionRequest = { request_id: string; document_id: string; storage_bucket: string; storage_path: string };

export async function runDeletionSweep(batchSize: number) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_document_deletions", { batch_size: batchSize });
  if (error) {
    captureError("deletion_sweep.claim", error);
    return { claimed: 0, deleted: 0, failed: 0, error };
  }

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
    if (storageError || completionError) {
      failed += 1;
      captureError("deletion_sweep.item", storageError ?? completionError, { requestId: item.request_id, documentId: item.document_id });
    } else {
      deleted += 1;
    }
  }

  return { claimed: requests.length, deleted, failed, error: null };
}

/**
 * claim_document_deletions() stops retrying a request once attempts >= 10
 * (private schema, exclusion by design — see 202609230007_automatic_deletion.sql).
 * Past that point the document is stuck in Storage forever unless someone
 * notices. Nothing alerted on this before; this at least surfaces it in logs.
 */
export async function reportStuckDeletions() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("deletion_requests")
    .select("id, document_id, attempts, last_error")
    .eq("status", "FAILED")
    .gte("attempts", 10);
  if (error) {
    captureError("deletion_sweep.stuck_check", error);
    return 0;
  }
  if (data && data.length > 0) {
    captureError("deletion_sweep.stuck", new Error(`${data.length} deletion request(s) exhausted retries`), { requests: data });
  }
  return data?.length ?? 0;
}
