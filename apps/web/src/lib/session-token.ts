import "server-only";

import { createHmac, randomBytes } from "node:crypto";

function pepper(): string {
  const value = process.env.SESSION_TOKEN_PEPPER;
  if (!value || value.length < 32) {
    throw new Error("SESSION_TOKEN_PEPPER doit contenir au moins 32 caractères.");
  }
  return value;
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHmac("sha256", pepper()).update(token, "utf8").digest("hex");
}
