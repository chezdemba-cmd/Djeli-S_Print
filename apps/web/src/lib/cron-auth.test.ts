import assert from "node:assert/strict";
import test from "node:test";
import { isValidCronAuthorization } from "./cron-auth.ts";

test("cron authorization requires an exact bearer secret", () => {
  const secret = "a-secure-cron-secret-value";
  assert.equal(isValidCronAuthorization(`Bearer ${secret}`, secret), true);
  assert.equal(isValidCronAuthorization(`Bearer ${secret}x`, secret), false);
  assert.equal(isValidCronAuthorization(null, secret), false);
  assert.equal(isValidCronAuthorization("Bearer short", "short"), false);
});
