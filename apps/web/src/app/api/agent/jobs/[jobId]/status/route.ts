import { authenticateAgent } from "@/lib/agent-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const workstation = await authenticateAgent(request);
  if (!workstation) return Response.json({ error: "Agent non autorisé." }, { status: 401 });
  const { jobId } = await context.params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const status = body?.status;
  if (status !== "PRINTING" && status !== "PRINTED" && status !== "FAILED") {
    return Response.json({ error: "Statut invalide." }, { status: 400 });
  }
  const admin = createAdminClient();
  const { error } = await admin.rpc("report_print_job_status", {
    target_workstation_id: workstation.id,
    target_job_id: jobId,
    target_status: status,
    target_failure_code: typeof body?.failureCode === "string" ? body.failureCode : null,
    target_failure_message: typeof body?.failureMessage === "string" ? body.failureMessage : null,
  });
  return error ? Response.json({ error: "Mise à jour refusée." }, { status: 409 }) : Response.json({ ok: true });
}
