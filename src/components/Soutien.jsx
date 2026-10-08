import { useEffect, useId, useRef } from "react";
import { Coffee, X, ArrowUpRight } from "lucide-react";
import { useEtablissementsStore } from "../hooks/useEtablissementsStore";
import { soutienEligible, useSoutienStore } from "../utils/soutien";
import { trackEvent } from "../utils/analytics";

// Temps visible, fenêtre active, avec une interaction dans les 30 dernières secondes.
export function useTempsActifSoutien() {
  useEffect(() => {
    let precedent = performance.now();
    let derniereActivite = precedent;
    const activite = () => { derniereActivite = performance.now(); };
    const evenements = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"];
    evenements.forEach(event => window.addEventListener(event, activite, { passive: true, capture: true }));
    const intervalle = setInterval(() => {
      const maintenant = performance.now();
      if (document.visibilityState === "visible" && document.hasFocus() && maintenant - derniereActivite < 30000) {
        useSoutienStore.getState().ajouterTemps(Math.min(maintenant - precedent, 1000));
      }
      precedent = maintenant;
      if (useSoutienStore.getState().tempsActif >= 60000) clearInterval(intervalle);
    }, 1000);
    return () => {
      clearInterval(intervalle);
      evenements.forEach(event => window.removeEventListener(event, activite, true));
    };
  }, []);
}

export default function Soutien({ contexte, typeEtablissement }) {
  const id = useId();
  const ref = useRef(null);
  const comparaisonOuverte = useEtablissementsStore(s => s.comparaisonOuverte);
  const nombreFiches = useEtablissementsStore(s => s.fichesConsultees.length);
  const soutien = useSoutienStore();
  const eligible = soutienEligible({ ...soutien, nombreFiches });
  const visible = (soutien.proprietaire === id || eligible) && !(contexte === "fiche" && comparaisonOuverte);
  useEffect(() => {
    if (!visible || !ref.current || soutien.proprietaire === id) return;
    const observer = new IntersectionObserver(([entree]) => {
      if (!entree.isIntersecting || entree.intersectionRatio < .5 || document.visibilityState !== "visible") return;
      if (contexte === "fiche" && useEtablissementsStore.getState().comparaisonOuverte) return;
      const etat = useSoutienStore.getState();
      if (!soutienEligible({ ...etat, nombreFiches: useEtablissementsStore.getState().fichesConsultees.length })) return;
      etat.marquerVu(id);
      trackEvent("soutien-vu", undefined, { contexte, type_etablissement: typeEtablissement });
      observer.disconnect();
    }, { threshold: .5 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible, soutien.proprietaire, id, contexte, typeEtablissement]);
  if (!visible) return null;
  const fermer = () => {
    soutien.reporter(30);
    trackEvent("soutien-ferme", undefined, { contexte, type_etablissement: typeEtablissement });
  };
  return <section ref={ref} aria-label="Soutenir Trajectoires" className="relative mt-6 rounded-xl border border-tableau-700/15 bg-tableau-100/50 p-4 font-body">
    <button onClick={fermer} aria-label="Fermer l’invitation à soutenir Trajectoires" className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full text-encre-600 hover:bg-sable-200"><X size={16} /></button>
    <p className="flex items-center gap-2 pr-7 font-display text-base font-semibold text-encre-950"><Coffee size={19} className="shrink-0 text-tableau-700" aria-hidden="true" />Trajectoires vous est utile ?</p>
    <p className="mt-2 text-sm leading-relaxed text-encre-800">Je développe ce site pour faciliter l’accès aux données scolaires et continuer à l’enrichir. Un petit café m’aide à le faire vivre. Merci !</p>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <a href="https://ko-fi.com/parisops" target="_blank" rel="noopener noreferrer" onClick={() => {
        soutien.reporter(90);
        trackEvent("soutien-clic", undefined, { contexte, type_etablissement: typeEtablissement });
      }} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-tableau-700 px-4 py-2 text-sm font-semibold text-white hover:bg-encre-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tableau-700">Offrir un café <ArrowUpRight size={16} aria-hidden="true" /><span className="sr-only">sur Ko-fi, dans un nouvel onglet</span></a>
      <button onClick={fermer} className="min-h-11 rounded-lg px-3 text-sm text-encre-600 hover:bg-sable-200">Plus tard</button>
    </div>
  </section>;
}
