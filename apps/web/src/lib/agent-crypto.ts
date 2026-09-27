import { createHmac, randomBytes } from "node:crypto";

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
