import "server-only";

import { createHmac } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export function requestFingerprint(request: Request) {
  const forwarded = request.headers.get("x-vercel-forwarded-for")
    ?? request.headers.get("x-forwarded-for")
    ?? "unknown";
  const address = forwarded.split(",", 1)[0]!.trim().slice(0, 128);
  const pepper = process.env.SESSION_TOKEN_PEPPER;
  if (!pepper || pepper.length < 32) throw new Error("SESSION_TOKEN_PEPPER invalide.");
  return createHmac("sha256", pepper).update(address).digest("hex");
}

export async function consumeRateLimit(request: Request, scope: string, maximumRequests: number, windowSeconds: number) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_api_rate_limit", {
    target_scope: scope,
    target_key_hash: requestFingerprint(request),
    maximum_requests: maximumRequests,
    window_seconds: windowSeconds,
  });
  if (error) throw new Error("Rate limiter unavailable");
  return data === true;
}
