import assert from "node:assert/strict";
import test from "node:test";
import { createAgentSecret, hashAgentSecret } from "./agent-crypto.ts";

test("agent secrets are random and stored as irreversible fixed-size hashes", () => {
  const first = createAgentSecret();
  const second = createAgentSecret();
  assert.notEqual(first, second);
  assert.equal(hashAgentSecret(first).length, 43);
  assert.equal(hashAgentSecret(first), hashAgentSecret(first));
  assert.notEqual(hashAgentSecret(first), first);
});
