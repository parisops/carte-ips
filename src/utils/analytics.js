/**
 * Petit utilitaire pour envoyer des événements personnalisés à GoatCounter
 * (déjà chargé dans index.html), sans recharger de page. Respecte les mêmes
 * garanties de confidentialité que le comptage de pages : aucune donnée
 * personnelle envoyée, uniquement des libellés génériques (type
 * d'établissement, nom de département, nom de filtre) — jamais de code_uai,
 * nom d'établissement ou terme de recherche saisi par l'utilisateur.
 *
 * `path` doit rester une clé technique stable (utilisée par GoatCounter pour
 * grouper les événements) ; `title` porte le libellé humain affiché dans le
 * tableau de bord.
 */
export function trackEvent(path, title) {
  if (typeof window === "undefined" || !window.goatcounter?.count) return;
  try {
    window.goatcounter.count({
      path: `event:${path}`,
      title: title ?? path,
      event: true,
    });
  } catch {
    // Ne jamais faire échouer l'app pour un souci de tracking (bloqueur de
    // pub, script non chargé, etc.) — l'analytics est strictement accessoire.
  }
}
