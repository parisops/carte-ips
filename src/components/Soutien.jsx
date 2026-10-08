import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Coffee, X, ArrowUpRight } from "lucide-react";
import { useEtablissementsStore } from "../hooks/useEtablissementsStore";
import { animationSoutienAutorisee, useSoutienStore } from "../utils/soutien";
import { trackEvent, trackSessionEvent } from "../utils/analytics";

export default function Soutien({ contexte = "carte", typeEtablissement }) {
  const aInteragi = useEtablissementsStore(s => s.aInteragi);
  const comparaisonOuverte = useEtablissementsStore(s => s.comparaisonOuverte);
  const selection = useEtablissementsStore(s => s.etablissementSelectionneId);
  const rappel = useSoutienStore(s => s.rappel);
  const [ouvert, setOuvert] = useState(false);
  const [agite, setAgite] = useState(false);
  const visible = (aInteragi || contexte === "comparaison") && !(contexte === "carte" && comparaisonOuverte);
  useEffect(() => {
    if (!visible) return;
    trackSessionEvent("soutien-bouton-vu", { contexte });
  }, [visible, contexte]);
  useEffect(() => {
    if (!visible || ouvert || !animationSoutienAutorisee(rappel)) return;
    const mouvement = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mouvement.matches) return;
    let fin;
    const animer = () => {
      if (document.visibilityState !== "visible" || mouvement.matches) return;
      setAgite(true);
      fin = setTimeout(() => setAgite(false), 900);
    };
    const debut = setTimeout(animer, 10000);
    const intervalle = setInterval(animer, 45000);
    return () => { clearTimeout(debut); clearTimeout(fin); clearInterval(intervalle); setAgite(false); };
  }, [visible, ouvert, rappel]);
  if (!visible) return null;
  const position = contexte === "carte" && selection
    ? "bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] md:bottom-5 md:right-[420px]"
    : "bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] md:bottom-5 md:right-5";
  const donnees = { contexte, ...(typeEtablissement ? { type_etablissement: typeEtablissement } : {}) };
  return <>
    <button onClick={() => { trackEvent("soutien-ouvert", undefined, donnees); setOuvert(true); }} aria-label="Offrir un café pour soutenir Trajectoires" title="Soutenir Trajectoires" className={`fixed right-4 z-[1600] flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-tableau-700 text-white shadow-panel transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tableau-700 ${position}`}>
      <Coffee size={23} aria-hidden="true" className={agite ? "cafe-agite" : ""} />
    </button>
    {ouvert && createPortal(<MessageSoutien donnees={donnees} onClose={() => setOuvert(false)} />, document.body)}
  </>;
}

function MessageSoutien({ donnees, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const precedent = document.activeElement;
    ref.current.showModal();
    trackEvent("soutien-vu", undefined, donnees);
    return () => { if (precedent?.isConnected) precedent.focus(); };
  }, []);
  const fermer = () => {
    useSoutienStore.getState().reporter(30);
    trackEvent("soutien-ferme", undefined, donnees);
    onClose();
  };
  return <dialog ref={ref} onCancel={event => { event.preventDefault(); fermer(); }} onClick={event => { if (event.target === ref.current) { const r = ref.current.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) fermer(); } }} aria-labelledby="soutien-titre" className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-sable-200 bg-sable-50 p-5 font-body text-encre-950 shadow-panel backdrop:bg-encre-950/35">
    <div className="flex items-start justify-between gap-2">
      <div><span className="mb-3 inline-flex rounded-xl bg-tableau-100 p-3 text-tableau-700"><Coffee size={25} aria-hidden="true" /></span><h2 id="soutien-titre" className="font-display text-lg font-semibold">Trajectoires vous est utile ?</h2></div>
      <button onClick={fermer} aria-label="Fermer l’invitation à soutenir Trajectoires" className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-encre-600 hover:bg-sable-200"><X size={19} /></button>
    </div>
    <p className="mt-3 text-sm leading-relaxed text-encre-800">Je développe ce site pour faciliter l’accès aux données scolaires et continuer à l’enrichir. Un petit café m’aide à le faire vivre. Merci !</p>
    <a href="https://ko-fi.com/parisops" target="_blank" rel="noopener noreferrer" onClick={() => {
      useSoutienStore.getState().reporter(90);
      trackEvent("soutien-clic", undefined, donnees);
      onClose();
    }} className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-tableau-700 px-4 py-3 text-sm font-semibold text-white hover:bg-encre-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tableau-700">Offrir un café <ArrowUpRight size={16} aria-hidden="true" /><span className="sr-only">sur Ko-fi, dans un nouvel onglet</span></a>
    <button onClick={fermer} className="mt-2 min-h-11 w-full rounded-lg text-sm text-encre-600 hover:bg-sable-200">Plus tard</button>
  </dialog>;
}
