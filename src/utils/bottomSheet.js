export const HAUTEURS_ETATS = { peek: 26, mi: 52, plein: 92 };
export function etatLePlusProche(hauteur) {
  return Object.keys(HAUTEURS_ETATS).reduce((meilleur, etat) =>
    Math.abs(HAUTEURS_ETATS[etat] - hauteur) < Math.abs(HAUTEURS_ETATS[meilleur] - hauteur) ? etat : meilleur
  , "peek");
}
