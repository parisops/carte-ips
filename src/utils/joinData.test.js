import { describe, it, expect } from "vitest";
import { joinByUai, computeParite, regrouperParSite, COULEUR_PAR_TYPE } from "./joinData";

describe("joinByUai", () => {
  it("fusionne deux sources sur code_uai", () => {
    const identite = [{ code_uai: "A1", nom_etablissement: "École A" }];
    const indicateurs = [{ code_uai: "A1", ips_etablissement: 105 }];
    const resultat = joinByUai(identite, indicateurs);
    expect(resultat).toHaveLength(1);
    expect(resultat[0]).toMatchObject({
      code_uai: "A1",
      nom_etablissement: "École A",
      ips_etablissement: 105,
    });
  });

  it("conserve un établissement présent dans une seule source, champs manquants undefined", () => {
    const identite = [{ code_uai: "A1", nom_etablissement: "École A" }];
    const indicateurs = [{ code_uai: "B2", ips_etablissement: 90 }];
    const resultat = joinByUai(identite, indicateurs);
    expect(resultat).toHaveLength(2);
    const ecoleA = resultat.find((e) => e.code_uai === "A1");
    expect(ecoleA.ips_etablissement).toBeUndefined();
    const ecoleB = resultat.find((e) => e.code_uai === "B2");
    expect(ecoleB.nom_etablissement).toBeUndefined();
  });

  it("fusionne plus de deux sources (identite + indicateurs + resultats)", () => {
    const identite = [{ code_uai: "A1", nom_etablissement: "École A" }];
    const indicateurs = [{ code_uai: "A1", ips_etablissement: 105 }];
    const resultats = [{ code_uai: "A1", taux_reussite: 92 }];
    const resultat = joinByUai(identite, indicateurs, resultats);
    expect(resultat[0]).toMatchObject({
      code_uai: "A1",
      nom_etablissement: "École A",
      ips_etablissement: 105,
      taux_reussite: 92,
    });
  });

  it("ignore les enregistrements sans code_uai", () => {
    const identite = [{ nom_etablissement: "Sans UAI" }, { code_uai: "A1", nom_etablissement: "École A" }];
    const resultat = joinByUai(identite);
    expect(resultat).toHaveLength(1);
    expect(resultat[0].code_uai).toBe("A1");
  });

  it("ignore les sources qui ne sont pas des tableaux", () => {
    const identite = [{ code_uai: "A1", nom_etablissement: "École A" }];
    const resultat = joinByUai(identite, null, undefined, "pas un tableau");
    expect(resultat).toHaveLength(1);
  });

  it("un enregistrement plus récent écrase les champs communs (dernier gagne)", () => {
    const source1 = [{ code_uai: "A1", ips_etablissement: 100 }];
    const source2 = [{ code_uai: "A1", ips_etablissement: 110 }];
    const resultat = joinByUai(source1, source2);
    expect(resultat[0].ips_etablissement).toBe(110);
  });

  it("retourne un tableau vide si aucune source valide", () => {
    expect(joinByUai()).toEqual([]);
    expect(joinByUai([])).toEqual([]);
  });
});

describe("computeParite", () => {
  it("calcule le pourcentage filles/garçons correctement", () => {
    const resultat = computeParite({ effectif_filles: 60, effectif_garcons: 40 });
    expect(resultat).toEqual({ pctFilles: 60, pctGarcons: 40 });
  });

  it("retourne null si effectif_filles est manquant", () => {
    expect(computeParite({ effectif_garcons: 40 })).toBeNull();
  });

  it("retourne null si effectif_garcons est manquant", () => {
    expect(computeParite({ effectif_filles: 60 })).toBeNull();
  });

  it("retourne null si le total est zéro (division par zéro évitée)", () => {
    expect(computeParite({ effectif_filles: 0, effectif_garcons: 0 })).toBeNull();
  });

  it("arrondit à une décimale", () => {
    const resultat = computeParite({ effectif_filles: 33, effectif_garcons: 67 });
    expect(resultat.pctFilles).toBeCloseTo(33.0, 1);
    expect(resultat.pctGarcons).toBeCloseTo(67.0, 1);
  });
});

describe("regrouperParSite", () => {
  it("regroupe les établissements partageant le même site_key", () => {
    const etablissements = [
      { code_uai: "A1", site_key: "48.85_2.35", latitude: 48.85, longitude: 2.35 },
      { code_uai: "A2", site_key: "48.85_2.35", latitude: 48.85, longitude: 2.35 },
      { code_uai: "B1", site_key: "48.9_2.4", latitude: 48.9, longitude: 2.4 },
    ];
    const sites = regrouperParSite(etablissements);
    expect(sites).toHaveLength(2);
    const siteGroupe = sites.find((s) => s.site_key === "48.85_2.35");
    expect(siteGroupe.membres).toHaveLength(2);
  });

  it("utilise latitude_longitude comme repli si site_key est absent", () => {
    const etablissements = [{ code_uai: "A1", latitude: 48.85, longitude: 2.35 }];
    const sites = regrouperParSite(etablissements);
    expect(sites[0].site_key).toBe("48.85_2.35");
  });

  it("retourne un tableau vide pour une entrée vide", () => {
    expect(regrouperParSite([])).toEqual([]);
  });
});

describe("COULEUR_PAR_TYPE", () => {
  it("définit une couleur pour chacun des 3 types d'établissement", () => {
    expect(COULEUR_PAR_TYPE).toHaveProperty("École");
    expect(COULEUR_PAR_TYPE).toHaveProperty("Collège");
    expect(COULEUR_PAR_TYPE).toHaveProperty("Lycée");
  });
});
