import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateOrganization, validateRegistration } from "./validation.ts";

describe("validateRegistration", () => {
  it("accepte une inscription valide", () => {
    assert.equal(validateRegistration({
      displayName: "Chez Demba",
      email: "atelier@example.com",
      password: "mot-de-passe-solide",
    }), null);
  });

  it("refuse un mot de passe court", () => {
    assert.match(
      validateRegistration({ displayName: "Demba", email: "a@b.fr", password: "court" }) ?? "",
      /10 caractères/,
    );
  });
});

describe("validateOrganization", () => {
  it("accepte un slug stable", () => {
    assert.equal(validateOrganization({ name: "Djeli Print", slug: "djeli-print-lyon" }), null);
  });

  for (const slug of ["Djeli_Print", "Djeli Print", "-djeli", "djeli-"]) {
    it(`refuse le slug ${slug}`, () => {
      assert.notEqual(validateOrganization({ name: "Djeli Print", slug }), null);
    });
  }
});
