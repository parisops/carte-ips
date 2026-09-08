import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check, Compass, X } from "lucide-react";
import { trackEvent } from "../utils/analytics";
import { CONSENTEMENT_PREMIUM, inscrirePremium } from "../utils/premium";

// Une exposition au maximum par chargement de page, même
// lorsque les fiches mobile et desktop sont montées ensemble ou changent de lycée.
const evenementsVus = new Set();
function compterUneFois(evenement) {
  if (evenementsVus.has(evenement)) return;
  evenementsVus.add(evenement);
  trackEvent(evenement);
}

export default function Premium() {
  const [ouvert, setOuvert] = useState(false);
  const carte = useRef(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entree]) => {
      if (entree.isIntersecting && entree.intersectionRatio >= 0.5) {
        compterUneFois("premium-vu");
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(carte.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={carte} className="rounded-xl border border-tableau-700/20 bg-tableau-100 p-4 font-body">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-tableau-700">
        <Compass size={17} aria-hidden="true" /> Premium · En développement
      </p>
      <h3 className="font-display text-lg font-semibold text-encre-950">Comparez vos lycées favoris</h3>
      <p className="mt-2 text-sm leading-relaxed text-encre-800">Comprenez leurs différences et préparez votre choix avec une comparaison claire et un dossier PDF à partager en famille.</p>
      <button type="button" onClick={() => {
        compterUneFois("premium-vu");
        // Chaque clic d'ouverture compte, y compris après une fermeture.
        trackEvent("premium-ouvert");
        setOuvert(true);
      }} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-tableau-700 px-3 py-2 text-sm font-semibold text-white hover:bg-encre-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tableau-700">
        Découvrir le Premium <ArrowRight size={17} aria-hidden="true" />
      </button>
      {ouvert && createPortal(<PresentationPremium onClose={() => setOuvert(false)} />, document.body)}
    </section>
  );
}

function PresentationPremium({ onClose }) {
  const dialogue = useRef(null);
  const requete = useRef(null);
  const id = useId();
  const [email, setEmail] = useState("");
  const [consentement, setConsentement] = useState(false);
  const [etat, setEtat] = useState("initial");

  useEffect(() => {
    const element = dialogue.current;
    const precedent = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => {
      requete.current?.abort("fermeture");
      element.close();
      document.body.style.overflow = overflow;
      if (precedent?.isConnected) precedent.focus();
    };
  }, []);

  async function envoyer(event) {
    event.preventDefault();
    if (requete.current || !consentement) return;
    const controller = new AbortController();
    requete.current = controller;
    setEtat("envoi");
    const delai = setTimeout(() => controller.abort(), 15000);
    try {
      await inscrirePremium(email, consentement, controller.signal);
      trackEvent("premium-inscription");
      setEmail("");
      setEtat("succes");
    } catch {
      if (controller.signal.reason === "fermeture") return;
      setEtat("erreur");
      trackEvent("premium-erreur");
    } finally {
      clearTimeout(delai);
      requete.current = null;
    }
  }

  return (
    <dialog ref={dialogue} aria-labelledby={`${id}-titre`} onCancel={onClose}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-sable-50 p-5 font-body text-encre-950 shadow-panel backdrop:bg-encre-950/50 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <p className="pt-3 text-xs font-semibold uppercase tracking-wide text-tableau-700">Futur accès Premium</p>
        <button type="button" onClick={onClose} aria-label="Fermer la présentation Premium" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-sable-200"><X size={22} /></button>
      </div>
      <h2 id={`${id}-titre`} className="mt-2 font-display text-2xl font-semibold">Vos lycées comparés, votre choix éclairé</h2>
      <p className="mt-3 text-sm leading-relaxed text-encre-800">Réunissez les informations utiles sur vos lycées favoris pour préparer votre décision et vos visites en famille.</p>
      <p className="mt-4 text-sm font-semibold">Ce que nous souhaitons vous proposer :</p>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-encre-800">
        <li>Comparer jusqu’à 5 lycées : résultats au bac, mentions, accompagnement et contexte social.</li>
        <li>Comprendre leurs différences et l’évolution des indicateurs disponibles.</li>
        <li>Retrouver votre sélection sauvegardée et exporter un dossier PDF avec les points à vérifier lors des visites.</li>
      </ul>
      <p className="mt-4 rounded-lg bg-sable-100 p-3 text-sm leading-relaxed text-encre-800">Le Premium est en développement. Inscrivez-vous pour être prévenu de son lancement.</p>

      {etat === "succes" ? (
        <div role="status" className="mt-5 rounded-xl bg-tableau-100 p-4 text-tableau-700">
          <p className="flex items-center gap-2 font-semibold"><Check size={20} aria-hidden="true" /> Votre inscription a été transmise.</p>
          <p className="mt-2 text-sm">Merci ! Nous vous préviendrons par email lorsque la fonctionnalité sera disponible.</p>
          <button type="button" onClick={onClose} className="mt-3 min-h-11 rounded-lg bg-tableau-700 px-4 py-2 text-sm font-semibold text-white">Revenir à la fiche</button>
        </div>
      ) : (
        <form onSubmit={envoyer} className="mt-5 space-y-3">
          <p className="text-sm font-semibold">Être prévenu du lancement</p>
          <p className="text-sm text-encre-800">L’inscription à la liste d’attente est gratuite et sans engagement. Le Premium sera proposé en paiement unique, sans abonnement. Tarif à définir.</p>
          <label htmlFor={`${id}-email`} className="block text-sm font-medium">Votre adresse email</label>
          <input id={`${id}-email`} name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} disabled={etat === "envoi"} className="min-h-11 w-full rounded-lg border border-sable-200 bg-white px-3 py-2 text-base focus:border-tableau-700 focus:outline-tableau-700" />
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-relaxed text-encre-800">
            <input type="checkbox" required checked={consentement} onChange={e => setConsentement(e.target.checked)} disabled={etat === "envoi"} className="mt-1 h-5 w-5 shrink-0 accent-tableau-700" />
            {CONSENTEMENT_PREMIUM}
          </label>
          <p className="text-xs leading-relaxed text-encre-600">Votre email est transmis via FormSubmit à l’éditeur de Trajectoires, uniquement pour cette liste d’attente. Vous pouvez demander sa suppression à tout moment via le bouton de contact du site.</p>
          {etat === "erreur" && <p role="alert" className="text-sm text-craie-600">L’inscription n’a pas pu être confirmée. Veuillez réessayer ou utiliser le bouton de contact du site.</p>}
          <button type="submit" disabled={etat === "envoi"} className="min-h-11 w-full rounded-lg bg-tableau-700 px-4 py-3 text-sm font-semibold text-white hover:bg-encre-950 disabled:opacity-60">{etat === "envoi" ? "Envoi en cours…" : "M’inscrire à la liste d’attente"}</button>
        </form>
      )}
    </dialog>
  );
}
