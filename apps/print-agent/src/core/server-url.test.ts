import assert from "node:assert/strict";
import test from "node:test";
import { normalizeServerUrl } from "./server-url.js";

test("production agent only accepts an HTTPS origin", () => {
  assert.equal(normalizeServerUrl("https://print.example.com/"), "https://print.example.com");
  assert.throws(() => normalizeServerUrl("http://print.example.com"), /HTTPS/);
  assert.throws(() => normalizeServerUrl("https://print.example.com/path"), /invalide/);
  assert.throws(() => normalizeServerUrl("https://user:pass@print.example.com"), /invalide/);
});

test("localhost HTTP remains available for development", () => {
  assert.equal(normalizeServerUrl("http://localhost:3100"), "http://localhost:3100");
});

test("an optional host allowlist restricts which server this agent can pair with", () => {
  assert.equal(normalizeServerUrl("https://print.example.com/", ["print.example.com"]), "https://print.example.com");
  assert.throws(() => normalizeServerUrl("https://evil.example.com/", ["print.example.com"]), /pas autorisé/);
  assert.equal(normalizeServerUrl("https://print.example.com/"), "https://print.example.com");
});

test("the allowlist never blocks the localhost development exception", () => {
  assert.equal(normalizeServerUrl("http://localhost:3100", ["print.example.com"]), "http://localhost:3100");
});
