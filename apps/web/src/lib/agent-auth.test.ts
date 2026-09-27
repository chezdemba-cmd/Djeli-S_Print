import assert from "node:assert/strict";
import test from "node:test";
process.env.AGENT_TOKEN_PEPPER ??= "test-agent-token-pepper-0123456789ab";
import { agentSecretHashCandidates, createAgentSecret, hashAgentSecret } from "./agent-crypto.ts";

test("agent secrets are random and stored as irreversible fixed-size hashes", () => {
  const first = createAgentSecret();
  const second = createAgentSecret();
  assert.notEqual(first, second);
  assert.equal(hashAgentSecret(first).length, 43);
  assert.equal(hashAgentSecret(first), hashAgentSecret(first));
  assert.notEqual(hashAgentSecret(first), first);
});

test("agent authentication accepts the current and legacy hash during migration", () => {
  const secret = createAgentSecret();
  const candidates = agentSecretHashCandidates(secret);
  assert.equal(candidates.length, 2);
  assert.equal(candidates[0], hashAgentSecret(secret));
  assert.notEqual(candidates[0], candidates[1]);
});
