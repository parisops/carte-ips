// Même destinataire que le formulaire de contact existant. Ce jeton public
// identifie le formulaire ; ce n'est pas une clé d'authentification.
export const ENDPOINT_CONTACT = "https://formsubmit.co/ajax/caeba402af3e279c617c491017dd1ec9";
export const CONSENTEMENT_PARCOURSUP = "J’accepte de recevoir un email pour être prévenu du lancement du Traceur de Débouchés Parcoursup.";

export async function inscrireParcoursup(email, consentement, signal) {
  if (!email.trim() || consentement !== true) throw new Error("Inscription incomplète");
  const reponse = await fetch(ENDPOINT_CONTACT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    signal,
    body: JSON.stringify({
      email: email.trim(),
      _subject: "Liste d’attente Parcoursup — Trajectoires",
      message: "Inscription à la liste d’attente du futur accès Premium Parcoursup.",
      consentement: CONSENTEMENT_PARCOURSUP,
      date_consentement: new Date().toISOString(),
    }),
  });
  if (!reponse.ok) throw new Error("Envoi refusé");
  const resultat = await reponse.json();
  if (resultat.success !== true && resultat.success !== "true") {
    throw new Error("Inscription non confirmée");
  }
}
