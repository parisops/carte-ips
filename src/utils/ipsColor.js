// Échelle IPS fixe, partagée par la carte, la jauge des fiches et la légende.
// L'IPS francilien va globalement de ~60 à ~165 sur ce jeu de données ; on
// prend un peu de marge pour ne saturer le dégradé qu'aux vraies extrêmes.
export const IPS_MIN = 50;
export const IPS_MAX = 170;

// Couleur utilisée quand l'IPS n'est pas publié pour l'établissement (cf.
// README : ~44% des écoles primaires n'ont pas d'IPS diffusé par le ministère).
export const COULEUR_IPS_INCONNU = "#9CA3AF";

/**
 * Dégradé rouge → ambre → vert (franc, pas pastel), aux bornes IPS_MIN/IPS_MAX.
 * Utilisé pour : couleur des marqueurs individuels, couleur des clusters
 * (IPS moyen du groupe), et la légende — donc TOUJOURS la même échelle,
 * ce qui permet de comparer une zone à l'autre d'un simple coup d'œil.
 */
export function couleurDegradeIPS(valeur) {
  if (valeur == null) return COULEUR_IPS_INCONNU;
  const t = Math.min(1, Math.max(0, (valeur - IPS_MIN) / (IPS_MAX - IPS_MIN)));
  // Rouge franc → ambre → vert franc : plus saturé qu'un dégradé pastel,
  // pour que "faible IPS" / "IPS élevé" se distinguent au premier coup d'œil.
  const stops =
    t < 0.5
      ? [
          [220, 38, 38], // rouge franc (#DC2626)
          [245, 158, 11], // ambre (#F59E0B)
        ]
      : [
          [245, 158, 11],
          [22, 163, 74], // vert franc (#16A34A)
        ];
  const localT = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
  const [r1, g1, b1] = stops[0];
  const [r2, g2, b2] = stops[1];
  const r = Math.round(r1 + (r2 - r1) * localT);
  const g = Math.round(g1 + (g2 - g1) * localT);
  const b = Math.round(b1 + (b2 - b1) * localT);
  return `rgb(${r},${g},${b})`;
}

const TAILLE_MIN = 7;
const TAILLE_MAX = 32;

/**
 * Diamètre (en px) d'un marqueur en fonction de son effectif, sur une échelle
 * en racine carrée adoucie (exposant 0.45 plutôt que 0.5) : les effectifs vont
 * de ~5 à ~2500 élèves (2 ordres de grandeur), une échelle linéaire écraserait
 * toutes les petites structures à une taille quasi nulle, et une racine carrée
 * stricte reste un peu plate au milieu de la plage — l'exposant légèrement
 * inférieur accentue l'écart visuel entre petits/moyens/grands établissements
 * tout en gardant les toutes petites structures lisibles.
 */
export function tailleDepuisEffectif(effectif, effectifMin, effectifMax) {
  if (effectif == null || !effectifMax || effectifMax <= effectifMin) return TAILLE_MIN + 4;
  const t = Math.min(1, Math.max(0, (effectif - effectifMin) / (effectifMax - effectifMin)));
  const courbe = Math.pow(t, 0.45);
  return Math.round(TAILLE_MIN + courbe * (TAILLE_MAX - TAILLE_MIN));
}

export { TAILLE_MIN, TAILLE_MAX };

/**
 * Forme par type d'établissement — indépendante de la couleur (réservée à
 * l'IPS) et de la taille (réservée à l'effectif), pour un 3ᵉ canal visuel :
 * École = rond, Collège = carré, Lycée = polygone (hexagone). Un site qui
 * regroupe plusieurs établissements de types différents (ex: cité scolaire
 * collège+lycée) prend une forme "losange" dédiée, pour ne pas prétendre
 * représenter un seul type.
 */
export const CLIP_PATH_PAR_FORME = {
  rond: "circle(50% at 50% 50%)",
  // Arrondi en % (pas en px) : reste proportionnellement identique quelle
  // que soit la taille du marqueur. Un arrondi fixe en px (ex: 4px) sur un
  // marqueur de 12px de côté arrondissait presque tout le carré en cercle.
  carre: "inset(0% round 22%)",
  hexagone: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
  losange: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
};

export const FORME_PAR_TYPE = {
  École: "rond",
  Collège: "carre",
  Lycée: "hexagone",
};
