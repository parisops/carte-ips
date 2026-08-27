/**
 * Petit utilitaire pour envoyer des événements personnalisés à GoatCounter
 * ET Umami (les deux scripts sont chargés en parallèle dans index.html),
 * sans recharger de page. Respecte les mêmes garanties de confidentialité
 * que le comptage de pages : aucune donnée personnelle envoyée, uniquement
 * des libellés génériques (type d'établissement, nom de département, nom de
 * filtre) — jamais de code_uai, nom d'établissement ou terme de recherche
 * saisi par l'utilisateur.
 *
 * `path` doit rester une clé technique stable (utilisée par GoatCounter pour
 * grouper les événements, et comme nom d'événement Umami pour les funnels) ;
 * `title` porte le libellé humain affiché dans les tableaux de bord.
 *
 * Les deux envois sont indépendants (try/catch séparés) : un bloqueur de pub
 * qui coupe l'un des deux scripts ne doit jamais empêcher l'autre de
 * fonctionner, ni faire échouer l'app.
 */
export function trackEvent(path, title) {
  if (typeof window === "undefined") return;

  try {
    window.goatcounter?.count?.({
      path: `event:${path}`,
      title: title ?? path,
      event: true,
    });
  } catch {
    // Ne jamais faire échouer l'app pour un souci de tracking (bloqueur de
    // pub, script non chargé, etc.) — l'analytics est strictement accessoire.
  }

  try {
    window.umami?.track?.(path, { title: title ?? path });
  } catch {
    // Tolérance identique et indépendante pour Umami.
  }
}
