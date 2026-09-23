import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { hashAgentSecret } from "@/lib/agent-crypto";

export async function authenticateAgent(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (token.length < 32) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("workstations")
    .select("id, organization_id, name")
    .eq("agent_token_hash", hashAgentSecret(token))
    .maybeSingle();
  return data;
}
