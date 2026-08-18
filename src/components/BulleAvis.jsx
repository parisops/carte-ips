import { useState } from "react";
import { MessageCircle, X, Send, Check } from "lucide-react";
import { useAInteragi } from "../hooks/useEtablissementsStore";
import { trackEvent } from "../utils/analytics";

/**
 * Adresse de réception éclatée en morceaux plutôt qu'en chaîne contiguë : ne
 * bloque pas un humain déterminé à lire le bundle JS, mais évite qu'un
 * scraper automatisé (regex sur un motif d'email) la récupère directement
 * dans le code source livré au navigateur. Combiné aux protections propres
 * de FormSubmit (reCAPTCHA + honeypot), c'est une défense en profondeur
 * raisonnable pour un simple formulaire d'avis, pas une garantie absolue.
 */
const PARTIES_EMAIL = ["vivien.colas", "@", "outlook.com"];
function construireEndpointAvis() {
  return `https://formsubmit.co/ajax/${PARTIES_EMAIL.join("")}`;
}

/**
 * Bulle flottante "Laisser un avis" — volontairement invisible tant que
 * l'utilisateur n'a pas interagi au minimum avec la carte (recherche,
 * filtre, sélection d'un département ou d'un établissement). Le signal
 * vient de `aInteragi` dans le store (cf. useEtablissementsStore.js),
 * déjà mis à jour par les actions existantes — aucune duplication de
 * logique de suivi, aucun nouvel appel réseau ajouté ailleurs dans l'app.
 *
 * Envoi par AJAX (fetch) vers FormSubmit : reste sur la page, pas de
 * redirection, retour visuel immédiat de confirmation ou d'erreur.
 */
export default function BulleAvis() {
  const aInteragi = useAInteragi();
  const [ouverte, setOuverte] = useState(false);
  const [message, setMessage] = useState("");
  const [nom, setNom] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState(false);

  if (!aInteragi) return null;

  const ouvrir = () => {
    trackEvent("bulle-avis-ouverte");
    setOuverte(true);
  };

  const fermer = () => {
    setOuverte(false);
    setErreur(false);
  };

  const envoyer = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setEnvoiEnCours(true);
    setErreur(false);
    try {
      const reponse = await fetch(construireEndpointAvis(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          nom: nom.trim() || "Anonyme",
          message: message.trim(),
          _subject: "Nouvel avis — Trajectoires",
        }),
      });
      if (!reponse.ok) throw new Error("Échec de l'envoi");
      trackEvent("bulle-avis-envoyee");
      setEnvoye(true);
    } catch {
      setErreur(true);
    } finally {
      setEnvoiEnCours(false);
    }
  };

  return (
    <>
      <button
        onClick={ouvrir}
        className="pointer-events-auto fixed bottom-4 right-4 z-[1300] flex h-12 w-12 items-center justify-center rounded-full bg-encre-950 text-sable-50 shadow-panel transition-transform hover:scale-105 active:scale-95 md:bottom-5 md:right-5"
        aria-label="Laisser un avis ou une question"
      >
        <MessageCircle size={20} />
      </button>

      {ouverte && (
        <div
          className="fixed inset-0 z-[2200] flex items-end justify-center bg-encre-950/30 p-3 md:items-center md:justify-end md:bg-transparent md:p-6"
          onClick={fermer}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-sable-50 p-5 shadow-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-encre-950">
                {envoye ? "Merci !" : "Un avis, une question ?"}
              </h2>
              <button
                onClick={fermer}
                className="rounded-full p-1 text-encre-600 hover:bg-sable-200"
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>

            {envoye ? (
              <div className="flex items-center gap-2 rounded-xl bg-tableau-100 px-3 py-3 font-body text-sm text-tableau-700">
                <Check size={16} />
                Ton message a bien été envoyé.
              </div>
            ) : (
              <form onSubmit={envoyer} className="space-y-2.5">
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ton prénom (optionnel)"
                  className="w-full rounded-lg border border-sable-200 bg-white px-3 py-2 font-body text-sm text-encre-950 placeholder:text-encre-400 focus:outline-none focus:ring-2 focus:ring-encre-600"
                />
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ton avis ou ta question…"
                  required
                  rows={4}
                  className="w-full rounded-lg border border-sable-200 bg-white px-3 py-2 font-body text-sm text-encre-950 placeholder:text-encre-400 focus:outline-none focus:ring-2 focus:ring-encre-600"
                />
                {erreur && (
                  <p className="font-body text-xs text-craie-600">
                    L'envoi a échoué, réessaie dans un instant.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={envoiEnCours || !message.trim()}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-encre-950 px-4 py-2.5 font-body text-sm font-semibold text-sable-50 disabled:opacity-50"
                >
                  <Send size={14} />
                  {envoiEnCours ? "Envoi…" : "Envoyer"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
