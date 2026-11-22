import { create } from "zustand";
import { joinByUai } from "../utils/joinData";
import { firstInTab, trackEvent, trackSessionEvent } from "../utils/analytics";

const URL_RUNTIME = `${import.meta.env.BASE_URL}data/runtime/`;
let initialisation;
const chargementsZones = new Map();
async function lireJSON(fichier) {
  const reponse = await fetch(`${URL_RUNTIME}${fichier}.json`);
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
  return reponse.json();
}

const FILTRES_PAR_DEFAUT = {
  types: { École: true, Collège: true, Lycée: true },
  statuts: { Public: true, Privé: true },
  dispositifs: { ulis: false, segpa: false, rep: false },
  ipsMin: 0,
  recherche: "",
  commune: null,
  rechercheUai: null,
  departement: "Tous",
  departementsDisponibles: [],
};

export const useEtablissementsStore = create((set, get) => ({
  etablissements: [],
  isLoaded: false,
  indicateursCharges: false,
  erreurChargement: null,
  etablissementSelectionneId: null,
  historique: {},
  historiqueCharge: false,
  historiqueResultats: {},
  historiqueResultatsCharge: false,
  aInteragi: false,
  fichesConsultees: [],
  fichesParNiveau: {},
  comparaisonIds: [],
  comparaisonOuverte: false,
  comparerEtablissement: (codeUai) => {
    const e = get().etablissements.find(e => e.code_uai === codeUai);
    if (!e) return;
    const premier = get().etablissements.find(e => e.code_uai === get().comparaisonIds[0]);
    const ids = premier?.type_etablissement === e.type_etablissement ? get().comparaisonIds : [];
    const nouveaux = ids.includes(codeUai) ? ids : [...ids.slice(0, 1), codeUai];
    if (!ids.includes(codeUai)) {
      const donnees = { type_etablissement: e.type_etablissement, nombre: nouveaux.length };
      trackSessionEvent(nouveaux.length === 1 ? "comparison_started" : "comparison_pair_ready", { school_type: e.type_etablissement });
    }
    set({ comparaisonIds: nouveaux, comparaisonOuverte: true });
    get().chargerDetailsSiBesoin(codeUai);
  },
  ouvrirComparaison: () => set({ comparaisonOuverte: true }),
  fermerComparaison: () => set({ comparaisonOuverte: false }),
  retirerComparaison: (codeUai) => {
    const e = get().etablissements.find(e => e.code_uai === codeUai);
    trackEvent("comparison_school_removed", undefined, { type_etablissement: e?.type_etablissement });
    set({ comparaisonIds: get().comparaisonIds.filter(id => id !== codeUai) });
  },
  bornesIps: [50, 170],
  bornesEffectif: [0, 2000],

  filtres: FILTRES_PAR_DEFAUT,

  zonesChargees: {},
  zonesEnErreur: {},
  init: (retry = false) => {
    if (get().isLoaded) return Promise.resolve();
    if (initialisation) return initialisation;
    set({ erreurChargement: null });
    initialisation = (async () => {
      const start = performance.now();
      const diagnostic = { attempt: retry ? "retry" : "initial" };
      let stage = "request";
      try {
        const response = await fetch(`${URL_RUNTIME}catalogue.json`);
        if (!response.ok) {
          stage = "http";
          diagnostic.http_status = response.status;
          throw new Error(`HTTP ${response.status}`);
        }
        stage = "body";
        const { champs, lignes } = await response.json();
        stage = "prepare";
        let minIps = Infinity, maxIps = -Infinity;
        let minEffectif = Infinity, maxEffectif = -Infinity;
        const etablissements = lignes.map(ligne => {
          const e = {};
          champs.forEach((cle, i) => { e[cle] = ligne[i]; });
          if (e.ips_etablissement != null) {
            minIps = Math.min(minIps, e.ips_etablissement);
            maxIps = Math.max(maxIps, e.ips_etablissement);
          }
          if (e.effectif_total != null) {
            minEffectif = Math.min(minEffectif, e.effectif_total);
            maxEffectif = Math.max(maxEffectif, e.effectif_total);
          }
          return e;
        });
        const bornesIps = minIps === Infinity ? [50, 170] : [Math.floor(minIps / 10) * 10, Math.ceil(maxIps / 10) * 10];
        set(state => ({
          etablissements, isLoaded: true, indicateursCharges: true, bornesIps,
          bornesEffectif: minEffectif === Infinity ? [0, 2000] : [minEffectif, maxEffectif],
          filtres: { ...state.filtres, ipsMin: bornesIps[0], departementsDisponibles: [...new Set(etablissements.map(e => e.departement).filter(Boolean))].sort() },
        }));
        diagnostic.result = "success";
      } catch (err) {
        diagnostic.result = "error";
        diagnostic.stage = stage;
        diagnostic.error_kind = ["TypeError", "SyntaxError", "RangeError", "AbortError"].includes(err?.name) ? err.name : "other";
        if (typeof navigator !== "undefined") diagnostic.online = navigator.onLine;
        set({ erreurChargement: err?.message || "Erreur de chargement des données" });
      } finally {
        diagnostic.duration_ms = Math.round(performance.now() - start);
        trackEvent("app_ready", undefined, diagnostic);
        initialisation = null;
      }
    })();
    return initialisation;
  },

  chargerDetailsSiBesoin: (codeUai) => {
    const zone = codeUai.slice(0, 3);
    if (get().zonesChargees[zone]) return Promise.resolve();
    if (chargementsZones.has(zone)) return chargementsZones.get(zone);
    set(state => ({ zonesEnErreur: { ...state.zonesEnErreur, [zone]: false } }));
    const chargement = (async () => {
      try {
        const data = await lireJSON(zone);
        set(state => ({
          etablissements: joinByUai(state.etablissements, data.etablissements),
          historique: { ...state.historique, ...data.historique },
          historiqueResultats: { ...state.historiqueResultats, ...data.historiqueResultats },
          historiqueCharge: true, historiqueResultatsCharge: true,
          zonesChargees: { ...state.zonesChargees, [zone]: true },
        }));
      } catch {
        set(state => ({ zonesEnErreur: { ...state.zonesEnErreur, [zone]: true } }));
      } finally { chargementsZones.delete(zone); }
    })();
    chargementsZones.set(zone, chargement);
    return chargement;
  },

  setFiltre: (chemin, valeur) =>
    set((state) => {
      const filtres = structuredClone(state.filtres);
      const parts = chemin.split(".");
      if (parts.length === 1) {
        filtres[parts[0]] = valeur;
      } else {
        filtres[parts[0]][parts[1]] = valeur;
      }

      if (chemin === "recherche" || chemin === "departement") {
        filtres.commune = null;
        filtres.rechercheUai = null;
        if (chemin === "departement") filtres.recherche = "";
      }
      let interactionDetectee = false;
      if (chemin !== "recherche" && JSON.stringify(valeur) !== JSON.stringify(parts.length === 1 ? state.filtres[parts[0]] : state.filtres[parts[0]][parts[1]])) {
        trackEvent("filter_changed", undefined, { filter_name: chemin.replace(/\.(.*)/, "_$1"), action: valeur === false || valeur === "Tous" ? "removed" : "applied" });
      }
      if (chemin === "departement" && valeur !== "Tous") {
        interactionDetectee = true;
      } else if (chemin === "recherche" && valeur.trim() !== "" && state.filtres.recherche.trim() === "") {
        trackSessionEvent("search_started", { entry_point: "main_search" });
        interactionDetectee = true;
      } else if (parts[0] === "dispositifs" && valeur === true) {
        interactionDetectee = true;
      } else if (chemin === "ipsMin" && valeur !== state.bornesIps[0]) {
        interactionDetectee = true;
      }

      return { filtres, etablissementSelectionneId: ["recherche", "departement"].includes(chemin) ? null : state.etablissementSelectionneId, aInteragi: state.aInteragi || interactionDetectee };
    }),

  resetFiltres: () => {
    trackEvent("filters_reset");
    set((state) => ({
      etablissementSelectionneId: null,
      filtres: {
        ...FILTRES_PAR_DEFAUT,
        ipsMin: state.bornesIps[0],
        departementsDisponibles: state.filtres.departementsDisponibles,
      },
    }));
  },

  selectionnerEtablissement: (code_uai) => {
    const etablissement = get().etablissements.find((e) => e.code_uai === code_uai);
    if (!etablissement) return;
    const state = get();
    if (state.etablissementSelectionneId !== code_uai) {
      const visites = state.fichesConsultees;
      const niveau = etablissement.type_etablissement;
      const properties = {
        school_type: niveau,
        source: state.filtres.rechercheUai === code_uai ? "search" : "map_or_related",
      };
      if (!visites.includes(code_uai)) {
        const duNiveau = state.fichesParNiveau[niveau] ?? 0;
        properties.ordinal_bucket = duNiveau === 0 ? "first" : duNiveau === 1 ? "second" : "third_or_more";
        if (visites.length === 0 && firstInTab("first_school_opened", niveau)) properties.first_school = true;
        if (visites.length > 0 && firstInTab("exploration_qualified")) properties.exploration_qualified = true;
        if (duNiveau === 1 && firstInTab("school_level_qualified", niveau)) properties.level_qualified = true;
        set({ fichesConsultees: [...visites, code_uai], fichesParNiveau: { ...state.fichesParNiveau, [niveau]: duNiveau + 1 } });
      }
      trackEvent("school_opened", undefined, properties);
    }
    set({ etablissementSelectionneId: code_uai, aInteragi: true });
    return get().chargerDetailsSiBesoin(code_uai);
  },
  fermerPanneau: () => set({ etablissementSelectionneId: null }),

  selectionnerSuggestion: (suggestion) => {
    set(state => ({
      etablissementSelectionneId: null,
      aInteragi: true,
      filtres: {
        ...state.filtres,
        ...(suggestion.type === "etablissement" ? {
          types: FILTRES_PAR_DEFAUT.types, statuts: FILTRES_PAR_DEFAUT.statuts,
          dispositifs: FILTRES_PAR_DEFAUT.dispositifs, ipsMin: state.bornesIps[0],
        } : {}),
        recherche: suggestion.label,
        departement: "Tous",
        commune: suggestion.type === "commune" ? { nom: suggestion.label, departement: suggestion.departement } : null,
        rechercheUai: suggestion.type === "etablissement" ? suggestion.codeUai : null,
      },
    }));
    if (suggestion.type === "etablissement") get().selectionnerEtablissement(suggestion.codeUai);
  },
}));

import { useMemo } from "react";

/**
 * Normalise une chaîne pour la recherche : minuscules, accents retirés
 * (é/è/ê → e, etc.), tirets/apostrophes/ponctuation ramenés à des espaces.
 * Sans ça, chercher "saint cloud" ne retrouvait pas "Saint-Cloud" (le tiret
 * empêchait le match) — la recherche devient insensible à ces variations
 * de graphie, dans les deux sens (texte saisi ET données).
 */
function normaliserPourRecherche(texte) {
  return (texte ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function useEtablissementsFiltres() {
  const etablissements = useEtablissementsStore((s) => s.etablissements);
  const filtres = useEtablissementsStore((s) => s.filtres);

  return useMemo(() => filtrerEtablissements(etablissements, filtres), [etablissements, filtres]);
}

export function filtrerEtablissements(etablissements, filtres) {

    const motsRecherche = normaliserPourRecherche(filtres.recherche).split(" ").filter(Boolean);

    return etablissements.filter((e) => {
      if (!filtres.types[e.type_etablissement]) return false;
      if (e.statut != null && !filtres.statuts[e.statut]) return false;

      if (filtres.departement && filtres.departement !== "Tous" && e.departement !== filtres.departement)
        return false;

      if (filtres.dispositifs.ulis && !(e.effectif_ulis > 0)) return false;
      if (filtres.dispositifs.segpa && !(e.effectif_segpa > 0)) return false;
      if (filtres.dispositifs.rep && !e.label_rep) return false;

      const ips = e.ips_etablissement;
      if (ips != null && ips < filtres.ipsMin) return false;

      if (filtres.commune && (e.commune !== filtres.commune.nom || e.departement !== filtres.commune.departement)) return false;
      if (filtres.rechercheUai && e.code_uai !== filtres.rechercheUai) return false;
      if (!filtres.commune && !filtres.rechercheUai && motsRecherche.length > 0) {
        const cible = normaliserPourRecherche(
          `${e.nom_etablissement} ${e.commune} ${e.code_postal ?? ""} ${e.code_uai ?? ""}`
        );
        if (!motsRecherche.every((mot) => cible.includes(mot))) return false;
      }

      return true;
    });


}

// Limite la liste d’autocomplétion ; les résultats de la commune restent complets.
const MAX_SUGGESTIONS_CALCULEES = 30;

export function useSuggestionsRecherche() {
  const etablissements = useEtablissementsStore((s) => s.etablissements);
  const filtres = useEtablissementsStore((s) => s.filtres);

  return useMemo(() => {
    const motsRecherche = normaliserPourRecherche(filtres.recherche).split(" ").filter(Boolean);
    if (motsRecherche.length === 0) return [];

    const correspond = (texte) => {
      const cible = normaliserPourRecherche(texte);
      return motsRecherche.every((mot) => cible.includes(mot));
    };

    const communes = new Map();
    for (const e of etablissements) {
      if (!e.commune) continue;
      const cle = `${e.departement}|${e.commune}`;
      if (correspond(`${e.commune} ${e.code_postal ?? ""}`)) communes.set(cle, { type: "commune", cle, label: e.commune, departement: e.departement });
    }
    const terme = normaliserPourRecherche(filtres.recherche);
    const suggestionsCommunes = [...communes.values()].sort((a, b) =>
      Number(normaliserPourRecherche(b.label) === terme) - Number(normaliserPourRecherche(a.label) === terme) || a.label.localeCompare(b.label)
    );
    const etablissementsTrouves = etablissements
      .filter(e => correspond(`${e.nom_etablissement} ${e.commune} ${e.code_postal ?? ""} ${e.code_uai}`))
      .sort((a, b) => a.nom_etablissement.localeCompare(b.nom_etablissement));

    const suggestionsEtablissements = etablissementsTrouves.map((e) => ({
      type: "etablissement",
      cle: e.code_uai,
      label: e.nom_etablissement,
      commune: e.commune,
      codeUai: e.code_uai,
    }));

    return [...suggestionsCommunes, ...suggestionsEtablissements].slice(0, MAX_SUGGESTIONS_CALCULEES);
  }, [etablissements, filtres.recherche]);
}

export function useEtablissementSelectionne() {
  const id = useEtablissementsStore((s) => s.etablissementSelectionneId);
  const etablissements = useEtablissementsStore((s) => s.etablissements);
  return useMemo(
    () => etablissements.find((e) => e.code_uai === id) ?? null,
    [etablissements, id]
  );
}

export function useHistoriqueIPS(codeUai) {
  const historique = useEtablissementsStore((s) => s.historique);
  const historiqueCharge = useEtablissementsStore((s) => s.historiqueCharge);

  return useMemo(() => {
    if (!historiqueCharge || !codeUai) return [];
    const points = historique[codeUai];
    if (!Array.isArray(points)) return [];
    return points
      .filter(([annee, ips]) => annee != null && ips != null)
      .map(([annee, ips]) => ({ annee, ips }))
      .sort((a, b) => a.annee - b.annee);
  }, [historique, historiqueCharge, codeUai]);
}

export function useHistoriqueResultats(codeUai) {
  const historiqueResultats = useEtablissementsStore((s) => s.historiqueResultats);
  const historiqueResultatsCharge = useEtablissementsStore((s) => s.historiqueResultatsCharge);

  return useMemo(() => {
    if (!historiqueResultatsCharge || !codeUai) return [];
    const points = historiqueResultats[codeUai];
    if (!Array.isArray(points)) return [];
    return points
      .filter(([annee, taux]) => annee != null && taux != null)
      .map(([annee, taux, va]) => ({ annee, taux, va: va ?? null }))
      .sort((a, b) => a.annee - b.annee);
  }, [historiqueResultats, historiqueResultatsCharge, codeUai]);
}

export function useAInteragi() {
  return useEtablissementsStore((s) => s.aInteragi);
}
