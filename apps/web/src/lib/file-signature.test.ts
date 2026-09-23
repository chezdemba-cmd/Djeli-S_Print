import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectMime } from "./file-signature.ts";

describe("detectMime", () => {
  it("reconnaît les signatures autorisées", () => {
    assert.equal(detectMime(Uint8Array.from([0x25,0x50,0x44,0x46,0x2d])), "application/pdf");
    assert.equal(detectMime(Uint8Array.from([0xff,0xd8,0xff,0x00])), "image/jpeg");
    assert.equal(detectMime(Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])), "image/png");
    assert.equal(detectMime(Uint8Array.from([0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50])), "image/webp");
  });
  it("refuse une extension déguisée", () => assert.equal(detectMime(new TextEncoder().encode("not a pdf")), null));
});
