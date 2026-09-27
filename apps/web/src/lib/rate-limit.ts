import "server-only";

import { createHmac } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

type HeaderReader = { get(name: string): string | null };

export function requestFingerprint(headers: HeaderReader) {
  const forwarded = headers.get("x-vercel-forwarded-for")
    ?? headers.get("x-forwarded-for")
    ?? "unknown";
  const address = forwarded.split(",", 1)[0]!.trim().slice(0, 128);
  const pepper = process.env.RATE_LIMIT_PEPPER;
  if (!pepper || pepper.length < 32) throw new Error("RATE_LIMIT_PEPPER invalide.");
  return createHmac("sha256", pepper).update(address).digest("hex");
}

export async function consumeRateLimit(headers: HeaderReader, scope: string, maximumRequests: number, windowSeconds: number) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_api_rate_limit", {
    target_scope: scope,
    target_key_hash: requestFingerprint(headers),
    maximum_requests: maximumRequests,
    window_seconds: windowSeconds,
  });
  if (error) throw new Error("Rate limiter unavailable");
  return data === true;
}
