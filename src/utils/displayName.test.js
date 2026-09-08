import { describe, expect, it } from "vitest";
import { nomEtablissementSansAdresse } from "./displayName";

describe("nomEtablissementSansAdresse", () => {
  it("retire une adresse répétée en suffixe", () => {
    expect(nomEtablissementSansAdresse("E.E.PU FRANC NOHAIN 9 rue Franc Nohain", "9 rue Franc Nohain"))
      .toBe("E.E.PU FRANC NOHAIN");
  });
  it("conserve un nom qui ne répète pas son adresse", () => {
    expect(nomEtablissementSansAdresse("Collège Victor Hugo", "1 rue des Écoles")).toBe("Collège Victor Hugo");
  });
});
