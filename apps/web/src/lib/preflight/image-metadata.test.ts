import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readImageDimensions } from "./image-metadata.ts";

describe("readImageDimensions", () => {
  it("lit un en-tête PNG", () => {
    const bytes = new Uint8Array(24);
    bytes.set([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
    new DataView(bytes.buffer).setUint32(16, 1200, false);
    new DataView(bytes.buffer).setUint32(20, 800, false);
    assert.deepEqual(readImageDimensions(bytes, "image/png"), { width: 1200, height: 800 });
  });
  it("refuse un en-tête trop court", () => assert.equal(readImageDimensions(new Uint8Array(4), "image/jpeg"), null));
});
