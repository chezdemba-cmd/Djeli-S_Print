import { createHash, randomBytes } from "node:crypto";

export function createAgentSecret(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function hashAgentSecret(secret: string) {
  return createHash("sha256").update(secret, "utf8").digest("base64url");
}
