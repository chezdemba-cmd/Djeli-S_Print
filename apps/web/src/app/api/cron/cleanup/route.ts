import { isValidCronAuthorization } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { runDeletionSweep, reportStuckDeletions } from "@/lib/deletion-sweep";
import { captureError } from "@/lib/observability";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isValidCronAuthorization(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error: healthError } = await admin.rpc("maintain_print_agent_health");
  if (healthError) {
    captureError("cron.cleanup.health", healthError);
    return Response.json({ error: "Maintenance des agents indisponible." }, { status: 503 });
  }

  const sweep = await runDeletionSweep(50);
  if (sweep.error) return Response.json({ error: "File de suppression indisponible." }, { status: 503 });
  const stuck = await reportStuckDeletions();

  return Response.json({ claimed: sweep.claimed, deleted: sweep.deleted, failed: sweep.failed, stuck });
}
