import { describe, it, expect } from "vitest";
import {
  couleurDegradeIPS,
  tailleDepuisEffectif,
  IPS_MIN,
  IPS_MAX,
  COULEUR_IPS_INCONNU,
  FORME_PAR_TYPE,
  CLIP_PATH_PAR_FORME,
} from "./ipsColor";

describe("couleurDegradeIPS", () => {
  it("retourne la couleur IPS inconnu si la valeur est null ou undefined", () => {
    expect(couleurDegradeIPS(null)).toBe(COULEUR_IPS_INCONNU);
    expect(couleurDegradeIPS(undefined)).toBe(COULEUR_IPS_INCONNU);
  });

  it("retourne une couleur rouge franche à la borne minimale", () => {
    expect(couleurDegradeIPS(IPS_MIN)).toBe("rgb(220,38,38)");
  });

  it("retourne une couleur verte franche à la borne maximale", () => {
    expect(couleurDegradeIPS(IPS_MAX)).toBe("rgb(22,163,74)");
  });

  it("retourne l'ambre au point médian de l'échelle", () => {
    const milieu = (IPS_MIN + IPS_MAX) / 2;
    expect(couleurDegradeIPS(milieu)).toBe("rgb(245,158,11)");
  });

  it("sature au rouge pour une valeur inférieure à IPS_MIN", () => {
    expect(couleurDegradeIPS(IPS_MIN - 50)).toBe(couleurDegradeIPS(IPS_MIN));
  });

  it("sature au vert pour une valeur supérieure à IPS_MAX", () => {
    expect(couleurDegradeIPS(IPS_MAX + 50)).toBe(couleurDegradeIPS(IPS_MAX));
  });
});

describe("tailleDepuisEffectif", () => {
  it("retourne une taille minimale par défaut si effectif est null", () => {
    expect(tailleDepuisEffectif(null, 0, 2000)).toBeGreaterThan(0);
  });

  it("retourne une taille croissante avec l'effectif", () => {
    const petite = tailleDepuisEffectif(10, 0, 2000);
    const grande = tailleDepuisEffectif(1500, 0, 2000);
    expect(grande).toBeGreaterThan(petite);
  });

  it("ne dépasse jamais la taille maximale (32px)", () => {
    expect(tailleDepuisEffectif(2000, 0, 2000)).toBeLessThanOrEqual(32);
  });

  it("gère le cas où effectifMax <= effectifMin sans lever d'exception", () => {
    expect(() => tailleDepuisEffectif(100, 500, 500)).not.toThrow();
  });
});

describe("FORME_PAR_TYPE / CLIP_PATH_PAR_FORME", () => {
  it("associe une forme à chacun des 3 types d'établissement", () => {
    expect(FORME_PAR_TYPE.École).toBe("rond");
    expect(FORME_PAR_TYPE.Collège).toBe("carre");
    expect(FORME_PAR_TYPE.Lycée).toBe("hexagone");
  });

  it("définit un clip-path pour chaque forme utilisée, y compris losange", () => {
    for (const forme of Object.values(FORME_PAR_TYPE)) {
      expect(CLIP_PATH_PAR_FORME[forme]).toBeTruthy();
    }
    expect(CLIP_PATH_PAR_FORME.losange).toBeTruthy();
  });
});
