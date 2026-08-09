/**
 * Joint N sources de données hétérogènes sur la clé commune `code_uai`.
 * Chaque source est un tableau d'objets contenant tous `code_uai`.
 * Le résultat est un tableau d'établissements "à plat", fusion de tous les champs.
 *
 * Conçu pour être tolérant : un établissement présent dans une seule source
 * (ex: identité connue mais indicateurs manquants) est quand même renvoyé,
 * les champs absents restant `undefined` — à gérer côté affichage (conditionnel).
 */
export function joinByUai(...sources) {
  const index = new Map();

  for (const source of sources) {
    if (!Array.isArray(source)) continue;
    for (const record of source) {
      const key = record.code_uai;
      if (!key) continue;
      const existing = index.get(key) ?? { code_uai: key };
      index.set(key, { ...existing, ...record });
    }
  }

  return Array.from(index.values());
}

/** Calcule le ratio de parité filles/garçons en pourcentage, null si données absentes. */
export function computeParite(etablissement) {
  const { effectif_filles, effectif_garcons } = etablissement;
  if (effectif_filles == null || effectif_garcons == null) return null;
  const total = effectif_filles + effectif_garcons;
  if (total === 0) return null;
  return {
    pctFilles: Math.round((effectif_filles / total) * 1000) / 10,
    pctGarcons: Math.round((effectif_garcons / total) * 1000) / 10,
  };
}

/** Couleur associée à chaque type d'établissement — partagée entre carte et badges. */
export const COULEUR_PAR_TYPE = {
  École: "#D9A441",
  Collège: "#2F6B4F",
  Lycée: "#1E3A5F",
};

/**
 * Regroupe les établissements filtrés par `site_key` (coordonnées GPS
 * identiques) : une école maternelle et une école élémentaire du même groupe
 * scolaire, ou un collège et un lycée d'une cité scolaire, partagent souvent
 * exactement les mêmes coordonnées. Sans ce regroupement, la carte affiche
 * plusieurs marqueurs parfaitement superposés — qui ressemblent à des
 * doublons alors que ce sont de vrais établissements distincts. On les
 * affiche donc comme un seul marqueur "site", avec un sélecteur de fratrie
 * dans le panneau de détail.
 */
export function regrouperParSite(etablissements) {
  const sites = new Map();
  for (const e of etablissements) {
    const cle = e.site_key ?? `${e.latitude}_${e.longitude}`;
    if (!sites.has(cle)) sites.set(cle, []);
    sites.get(cle).push(e);
  }
  return Array.from(sites.entries()).map(([site_key, membres]) => ({
    site_key,
    latitude: membres[0].latitude,
    longitude: membres[0].longitude,
    membres,
  }));
}
