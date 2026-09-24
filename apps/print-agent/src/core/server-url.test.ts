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
  assert.equal(normalizeServerUrl("http://localhost:3000"), "http://localhost:3000");
});
