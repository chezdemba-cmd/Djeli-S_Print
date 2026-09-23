import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { imageQualityByFormat, ratingForDpi } from "./quality.ts";

describe("preflight quality", () => {
  it("applique les seuils DPI", () => {
    assert.equal(ratingForDpi(300), "EXCELLENT");
    assert.equal(ratingForDpi(200), "GOOD");
    assert.equal(ratingForDpi(150), "ACCEPTABLE");
    assert.equal(ratingForDpi(100), "LOW");
    assert.equal(ratingForDpi(99), "NOT_RECOMMENDED");
  });
  it("dégrade la recommandation quand le format grandit", () => {
    const qualities = imageQualityByFormat(2480, 3508);
    assert.equal(qualities.find((item) => item.format === "A4")?.rating, "EXCELLENT");
    assert.ok((qualities.find((item) => item.format === "A0")?.dpi ?? 999) < 100);
  });
});
