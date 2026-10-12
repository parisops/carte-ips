/** Envoi des événements produit à Umami uniquement.
 * Aucune donnée personnelle (email, recherche libre ou identifiant d'école)
 * ne doit figurer dans les propriétés.
 * Un bloqueur de suivi ne doit jamais interrompre l'application.
 */
export function trackEvent(path, title, donnees = {}) {
  if (typeof window === "undefined") return;

  try {
    window.umami?.track?.(path, { title: title ?? path, ...donnees });
  } catch {
    // Le suivi ne doit jamais faire échouer l'application.
  }
}

// Une visite correspond à la session de l’onglet, y compris ses rechargements.
// Les clés sont des événements génériques ; aucune identité d’établissement.
const vusEnMemoire = new Set();
export function trackSessionEvent(path, donnees = {}) {
  if (typeof window === "undefined") return;
  const cle = `trajectoires:mesure:${path}:${donnees.type_etablissement ?? "tous"}`;
  try {
    if (window.sessionStorage?.getItem(cle)) return;
    window.sessionStorage?.setItem(cle, "1");
  } catch { /* Le suivi reste utilisable si le stockage est bloqué. */ }
  if (vusEnMemoire.has(cle)) return;
  vusEnMemoire.add(cle);
  trackEvent(path, undefined, donnees);
}
