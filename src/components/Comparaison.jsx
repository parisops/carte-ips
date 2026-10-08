import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { ArrowLeftRight, Plus, Search, X } from "lucide-react";
import { useEtablissementsStore } from "../hooks/useEtablissementsStore";
import { trackEvent, trackSessionEvent } from "../utils/analytics";
import Soutien from "./Soutien";
import { nomEtablissementSansAdresse } from "../utils/displayName";

const bouton = "flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tableau-700";
const nom = e => nomEtablissementSansAdresse(e.nom_etablissement, e.adresse);
const normaliser = s => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function BoutonComparer({ etablissement }) {
  const ajouter = useEtablissementsStore(s => s.comparerEtablissement);
  const ids = useEtablissementsStore(s => s.comparaisonIds);
  const ref = useRef(null);
  useEffect(() => {
    if (!window.IntersectionObserver) return;
    const observer = new IntersectionObserver(([entree]) => {
      if (entree.isIntersecting && entree.intersectionRatio >= .5) {
        trackSessionEvent("comparaison-proposee", { type_etablissement: etablissement.type_etablissement });
        observer.disconnect();
      }
    }, { threshold: .5 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [etablissement.code_uai, etablissement.type_etablissement]);
  return <button ref={ref} onClick={() => ajouter(etablissement.code_uai)} className={`${bouton} mt-3 w-full border border-tableau-700/20 bg-tableau-100 text-tableau-700 hover:bg-sable-200`}>
    <ArrowLeftRight size={16} aria-hidden="true" />{ids.includes(etablissement.code_uai) ? "Voir ma comparaison" : "Comparer cet établissement"}
  </button>;
}

export function AccesComparaison() {
  const ids = useEtablissementsStore(s => s.comparaisonIds);
  const ouvrir = useEtablissementsStore(s => s.ouvrirComparaison);
  if (!ids.length) return null;
  return <button onClick={ouvrir} aria-label={`Ouvrir ma comparaison, ${ids.length} établissement${ids.length > 1 ? "s" : ""}`} className="flex min-h-9 items-center gap-1.5 rounded-lg bg-tableau-100 px-2 text-xs font-semibold text-tableau-700">
    <ArrowLeftRight size={16} aria-hidden="true" /><span className="hidden sm:inline">Comparer</span><span>{ids.length}/2</span>
  </button>;
}

export default function Comparaison() {
  const ouvert = useEtablissementsStore(s => s.comparaisonOuverte);
  return ouvert ? createPortal(<DialogueComparaison />, document.body) : null;
}

function DialogueComparaison() {
  const ref = useRef(null);
  const etablissements = useEtablissementsStore(s => s.etablissements);
  const ids = useEtablissementsStore(s => s.comparaisonIds);
  const fermer = useEtablissementsStore(s => s.fermerComparaison);
  const ajouter = useEtablissementsStore(s => s.comparerEtablissement);
  const retirer = useEtablissementsStore(s => s.retirerComparaison);
  const charger = useEtablissementsStore(s => s.chargerDetailsSiBesoin);
  const zones = useEtablissementsStore(s => s.zonesChargees);
  const erreurs = useEtablissementsStore(s => s.zonesEnErreur);
  const [recherche, setRecherche] = useState("");
  const selection = ids.map(id => etablissements.find(e => e.code_uai === id)).filter(Boolean);
  const type = selection[0]?.type_etablissement;
  const pret = selection.length === 2 && selection.every(e => zones[e.code_uai.slice(0, 3)]);
  const paireMesuree = useRef("");
  useEffect(() => {
    const precedent = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current.showModal();
    ref.current.querySelector("input")?.focus();
    trackEvent("comparaison-ouverte", undefined, { type_etablissement: type });
    return () => {
      document.body.style.overflow = overflow;
      if (precedent?.isConnected) precedent.focus();
    };
  }, []);
  useEffect(() => {
    const paire = ids.join(":");
    if (!pret || paireMesuree.current === paire) return;
    paireMesuree.current = paire;
    const donnees = { type_etablissement: type };
    trackEvent("comparaison-affichee", undefined, donnees);
    trackSessionEvent("comparaison-utilisee", donnees);
  }, [pret, ids, type]);
  const suggestions = useMemo(() => {
    const termes = normaliser(recherche).split(" ").filter(Boolean);
    if (!termes.length) return [];
    return etablissements.filter(e => !ids.includes(e.code_uai) && (!type || e.type_etablissement === type) && termes.every(t => normaliser(`${e.nom_etablissement} ${e.commune} ${e.code_postal}`).includes(t))).slice(0, 8);
  }, [etablissements, ids, type, recherche]);
  return <dialog ref={ref} onCancel={fermer} aria-labelledby="comparaison-titre" className="m-auto h-[100dvh] max-h-[100dvh] w-full max-w-2xl overflow-y-auto bg-sable-50 p-0 font-body text-encre-950 shadow-panel backdrop:bg-encre-950/50 sm:h-auto sm:max-h-[90dvh] sm:rounded-2xl">
    <div className="sticky top-0 z-10 border-b border-sable-200 bg-sable-50 px-4 pb-4 pt-4 sm:px-6">
      <div className="flex items-center justify-between gap-2">
        <h2 id="comparaison-titre" className="flex items-center gap-2 font-display text-xl font-semibold"><ArrowLeftRight size={20} className="text-tableau-700" />Ma comparaison</h2>
        <button onClick={fermer} aria-label="Fermer la comparaison" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-sable-200"><X size={20} /></button>
      </div>
      <p className="mb-4 text-sm text-encre-600">Deux établissements, les mêmes repères. Gratuit, sans inscription.</p>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map(i => <div key={i} className="min-w-0 rounded-xl border border-sable-200 bg-white p-3">
          {selection[i] ? <>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-tableau-700">{selection[i].type_etablissement}</p>
            <h3 className="line-clamp-3 break-words font-display text-sm font-semibold leading-snug sm:text-base">{nom(selection[i])}</h3>
            <p className="mt-1 text-xs text-encre-600">{selection[i].commune}</p>
            <button onClick={() => { retirer(selection[i].code_uai); setRecherche(""); }} className="mt-2 min-h-11 text-xs font-semibold text-tableau-700 underline underline-offset-4">Remplacer</button>
          </> : <div className="flex min-h-28 flex-col items-center justify-center gap-2 text-center text-sm text-encre-400"><Plus size={20} />{i === 0 ? "Choisir un établissement" : "Ajouter un deuxième"}</div>}
        </div>)}
      </div>
    </div>
    <div className="px-4 pb-6 pt-5 sm:px-6" style={{ paddingBottom: "max(5rem, env(safe-area-inset-bottom))" }}>
      {selection.length < 2 && <section>
        <label htmlFor="recherche-comparaison" className="mb-2 block text-sm font-semibold">{type ? `Rechercher un autre établissement de type « ${type} »` : "Rechercher un établissement"}</label>
        <div className="relative"><Search size={18} className="absolute left-3 top-3.5 text-encre-400" /><input autoFocus id="recherche-comparaison" type="search" value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Nom, commune ou code postal" className="min-h-11 w-full rounded-xl border border-sable-200 bg-white py-3 pl-10 pr-3 text-base focus:outline-tableau-700" /></div>
        <p className="mt-2 text-xs text-encre-600">Vous pouvez aussi fermer cette vue et choisir sur la carte.</p>
        <ul className="mt-3 space-y-2">{suggestions.map(e => <li key={e.code_uai}><button onClick={() => { ajouter(e.code_uai); setRecherche(""); }} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-sable-200 bg-white p-3 text-left hover:bg-tableau-100"><span className="min-w-0"><span className="block text-sm font-semibold">{nom(e)}</span><span className="text-xs text-encre-600">{e.commune} · {e.code_postal} · {e.type_etablissement}</span></span><Plus size={18} className="shrink-0 text-tableau-700" /></button></li>)}</ul>
        {recherche.trim() && !suggestions.length && <p role="status" className="mt-4 text-sm text-encre-600">Aucun établissement trouvé. Essayez une commune ou un autre nom.</p>}
      </section>}
      {selection.length === 2 && !pret && <div role="status" className="rounded-xl bg-sable-100 p-4 text-sm">{selection.map(e => !zones[e.code_uai.slice(0, 3)] && <p key={e.code_uai} className="mb-2">{erreurs[e.code_uai.slice(0, 3)] ? <><span>Impossible de charger les données de {nom(e)}. </span><button onClick={() => charger(e.code_uai)} className="min-h-11 font-semibold text-tableau-700 underline">Réessayer</button></> : `Chargement des données de ${nom(e)}…`}</p>)}</div>}
      {pret && <>
        <Ligne titre="Statut" selection={selection} champ="statut" />
        <Ligne titre="Profil social · IPS" selection={selection} champ="ips_etablissement" annee="ips_millesime" aide="L’IPS décrit le contexte social des élèves, pas la qualité de l’établissement." />
        {type !== "École" && <>
          <Ligne titre={type === "Collège" ? "Réussite au brevet" : "Réussite au bac"} selection={selection} champ="taux_reussite" unite=" %" annee="resultats_millesime" />
          <Ligne titre="Valeur ajoutée · réussite" selection={selection} champ="va_taux_reussite" unite=" points" annee="resultats_millesime" signe aide="Écart entre la réussite observée et celle attendue pour un public comparable. Une valeur positive indique une réussite supérieure à celle attendue." />
          <Ligne titre="Taux de mentions" selection={selection} champ="taux_mentions" unite=" %" annee="resultats_millesime" />
        </>}
        <Ligne titre="Nombre d’élèves" selection={selection} champ="effectif_total" annee="effectifs_millesime" />
        <Ligne titre="Éducation prioritaire" selection={selection} valeur={e => e.label_rep || "Non indiqué"} />
        <p className="mt-5 text-xs leading-relaxed text-encre-600">Sources : données publiques du ministère de l’Éducation nationale (DEPP). Les millésimes disponibles sont indiqués sous les valeurs. Cette comparaison ne constitue pas un classement.</p>
        <Soutien contexte="comparaison" typeEtablissement={type} />
      </>}
    </div>
  </dialog>;
}

function Ligne({ titre, selection, champ, unite = "", annee, aide, signe, valeur }) {
  const annees = selection.map(e => e[annee]);
  const decalage = annee && annees.every(Boolean) && String(annees[0]) !== String(annees[1]);
  return <section className="border-b border-sable-200 py-4 first:pt-0">
    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-encre-600">{titre}</h4>
    <div className="grid grid-cols-2 gap-3">{selection.map(e => {
      const v = valeur ? valeur(e) : e[champ];
      return <div key={e.code_uai} className="min-w-0 rounded-lg bg-sable-100 px-3 py-3">
        <p className={v == null ? "text-xs text-encre-400" : "font-mono text-base font-semibold sm:text-lg"}>{v == null ? "Non disponible" : `${signe && v > 0 ? "+" : ""}${typeof v === "number" ? v.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : v}${unite === " points" && Math.abs(v) <= 1 ? " point" : unite}`}</p>
        {annee && v != null && <p className="mt-1 text-[11px] text-encre-600">{e[annee] ? `${["ips_etablissement", "effectif_total"].includes(champ) ? "Rentrée" : "Session"} ${e[annee]}` : "Millésime non précisé"}</p>}
      </div>;
    })}</div>
    {decalage && <p className="mt-2 text-xs font-semibold text-craie-600">Millésimes différents : ces valeurs ne portent pas sur la même année.</p>}
    {aide && <p className="mt-2 text-xs leading-relaxed text-encre-600">{aide}</p>}
  </section>;
}
