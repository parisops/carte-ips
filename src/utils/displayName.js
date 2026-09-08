/**
 * Certains libellés du référentiel répètent l'adresse à la fin du nom
 * (ex. « École ... 9 rue ... »). L'adresse est déjà affichée sur sa propre
 * ligne dans la fiche ; on retire uniquement ce suffixe exact du titre.
 */
export function nomEtablissementSansAdresse(nom, adresse) {
  const libelle = String(nom ?? "").trim();
  const voie = String(adresse ?? "").trim();
  if (!libelle || !voie) return libelle;

  const libelleMin = libelle.toLocaleLowerCase("fr-FR");
  const voieMin = voie.toLocaleLowerCase("fr-FR");
  if (!libelleMin.endsWith(voieMin) || libelleMin.length === voieMin.length) return libelle;

  return libelle.slice(0, libelle.length - voie.length).replace(/[\s,;:–—-]+$/, "").trim();
}
