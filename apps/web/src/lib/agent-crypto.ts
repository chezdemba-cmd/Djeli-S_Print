import { createHash, createHmac, randomBytes } from "node:crypto";

function pepper(): string {
  const value = process.env.AGENT_TOKEN_PEPPER;
  if (!value || value.length < 32) {
    throw new Error("AGENT_TOKEN_PEPPER doit contenir au moins 32 caractères.");
  }
  return value;
}

export function createAgentSecret(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function hashAgentSecret(secret: string) {
  return createHmac("sha256", pepper()).update(secret, "utf8").digest("base64url");
}

/**
 * Accept hashes created before AGENT_TOKEN_PEPPER was introduced. New secrets
 * are always stored with the HMAC hash; the SHA-256 candidate only keeps
 * already-paired pilot agents and unexpired pairing codes working during the
 * migration window.
 */
export function agentSecretHashCandidates(secret: string) {
  const current = hashAgentSecret(secret);
  const legacy = createHash("sha256").update(secret, "utf8").digest("base64url");
  return [current, legacy];
}
