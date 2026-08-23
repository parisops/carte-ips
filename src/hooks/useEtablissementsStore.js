import { create } from "zustand";
import { joinByUai } from "../utils/joinData";
import { trackEvent } from "../utils/analytics";

const URL_IDENTITE = `${import.meta.env.BASE_URL}data/identite.json`;
const URL_INDICATEURS = `${import.meta.env.BASE_URL}data/indicateurs.json`;
const URL_RESULTATS = `${import.meta.env.BASE_URL}data/resultats.json`;
const URL_HISTORIQUE = `${import.meta.env.BASE_URL}data/historique_ips.json`;
const URL_HISTORIQUE_RESULTATS = `${import.meta.env.BASE_URL}data/historique_resultats.json`;

const FILTRES_PAR_DEFAUT = {
  types: { École: true, Collège: true, Lycée: true },
  statuts: { Public: true, Privé: true },
  dispositifs: { ulis: false, segpa: false, rep: false },
  ipsMin: 0,
  recherche: "",
  departement: "Tous",
  departementsDisponibles: [],
};

export const useEtablissementsStore = create((set, get) => ({
  etablissements: [],
  isLoaded: false,
  indicateursCharges: false,
  erreurChargement: null,
  etablissementSelectionneId: null,
  resultatsCharges: false,
  historique: {},
  historiqueCharge: false,
  historiqueEnErreur: false,
  historiqueResultats: {},
  historiqueResultatsCharge: false,
  historiqueResultatsEnErreur: false,
  aInteragi: false,
  bornesIps: [50, 170],
  bornesEffectif: [0, 2000],

  filtres: FILTRES_PAR_DEFAUT,

  init: async () => {
    try {
      const identite = await fetch(URL_IDENTITE).then((r) => {
        if (!r.ok) throw new Error(`identite.json : HTTP ${r.status}`);
        return r.json();
      });

      const departementsDisponibles = Array.from(
        new Set(identite.map((e) => e.departement).filter(Boolean))
      ).sort();

      set({
        etablissements: identite,
        isLoaded: true,
        filtres: { ...FILTRES_PAR_DEFAUT, departementsDisponibles },
      });

      const indicateurs = await fetch(URL_INDICATEURS).then((r) => {
        if (!r.ok) throw new Error(`indicateurs.json : HTTP ${r.status}`);
        return r.json();
      });

      const fusion = joinByUai(identite, indicateurs);

      const ipsValues = fusion.map((e) => e.ips_etablissement).filter((v) => v != null);
      const effectifValues = fusion.map((e) => e.effectif_total).filter((v) => v != null);

      const ipsMin = ipsValues.length ? Math.min(...ipsValues) : 0;
      const ipsMax = ipsValues.length ? Math.max(...ipsValues) : 200;
      const effectifMin = effectifValues.length ? Math.min(...effectifValues) : 0;
      const effectifMax = effectifValues.length ? Math.max(...effectifValues) : 2000;
      const ipsRangeArrondi = [Math.floor(ipsMin / 10) * 10, Math.ceil(ipsMax / 10) * 10];

      set((state) => ({
        etablissements: fusion,
        indicateursCharges: true,
        bornesIps: ipsRangeArrondi,
        bornesEffectif: [effectifMin, effectifMax],
        filtres: { ...state.filtres, ipsMin: ipsRangeArrondi[0] },
      }));
    } catch (err) {
      set({ erreurChargement: err.message ?? "Erreur de chargement des données" });
    }
  },

  chargerResultatsSiBesoin: async () => {
    if (get().resultatsCharges) return;
    set({ resultatsCharges: true });
    try {
      const resultats = await fetch(URL_RESULTATS).then((r) => r.json());
      set((state) => ({ etablissements: joinByUai(state.etablissements, resultats) }));
    } catch {
      set({ resultatsCharges: false });
    }
  },

  chargerHistoriqueSiBesoin: async () => {
    if (get().historiqueCharge) return;
    set({ historiqueCharge: true });
    try {
      const historique = await fetch(URL_HISTORIQUE).then((r) => {
        if (!r.ok) throw new Error(`historique_ips.json : HTTP ${r.status}`);
        return r.json();
      });
      set({ historique, historiqueEnErreur: false });
    } catch {
      set({ historiqueCharge: false, historiqueEnErreur: true });
    }
  },

  chargerHistoriqueResultatsSiBesoin: async () => {
    if (get().historiqueResultatsCharge) return;
    set({ historiqueResultatsCharge: true });
    try {
      const historiqueResultats = await fetch(URL_HISTORIQUE_RESULTATS).then((r) => {
        if (!r.ok) throw new Error(`historique_resultats.json : HTTP ${r.status}`);
        return r.json();
      });
      set({ historiqueResultats, historiqueResultatsEnErreur: false });
    } catch {
      set({ historiqueResultatsCharge: false, historiqueResultatsEnErreur: true });
    }
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

      let interactionDetectee = false;
      if (chemin === "departement" && valeur !== "Tous") {
        trackEvent("departement-selectionne", valeur);
        interactionDetectee = true;
      } else if (chemin === "recherche" && valeur.trim() !== "" && state.filtres.recherche.trim() === "") {
        trackEvent("filtre-recherche-utilisee");
        interactionDetectee = true;
      } else if (parts[0] === "dispositifs" && valeur === true) {
        trackEvent("filtre-dispositif-actif", parts[1]);
        interactionDetectee = true;
      } else if (chemin === "ipsMin" && valeur !== state.bornesIps[0]) {
        trackEvent("filtre-ips-ajuste");
        interactionDetectee = true;
      }

      return { filtres, aInteragi: state.aInteragi || interactionDetectee };
    }),

  resetFiltres: () =>
    set((state) => ({
      filtres: {
        ...FILTRES_PAR_DEFAUT,
        ipsMin: state.bornesIps[0],
        departementsDisponibles: state.filtres.departementsDisponibles,
      },
    })),

  selectionnerEtablissement: (code_uai) => {
    const etablissement = get().etablissements.find((e) => e.code_uai === code_uai);
    if (etablissement) {
      trackEvent("etablissement-selectionne", etablissement.type_etablissement);
    }
    set({ etablissementSelectionneId: code_uai, aInteragi: true });
    get().chargerResultatsSiBesoin();
    get().chargerHistoriqueSiBesoin();
    get().chargerHistoriqueResultatsSiBesoin();
  },
  fermerPanneau: () => set({ etablissementSelectionneId: null }),

  /**
   * Applique une suggestion d'autocomplétion (cf. useSuggestionsRecherche) :
   * une commune remplit la recherche avec son nom ET sélectionne son premier
   * établissement (alphabétique) pour centrer la carte dessus (réutilise le
   * recentrage déjà déclenché par selectionnerEtablissement — pas besoin
   * d'une logique de centrage dédiée à la commune). Un établissement remplit
   * la recherche avec son nom et se sélectionne directement.
   */
  selectionnerSuggestion: (suggestion) => {
    if (suggestion.type === "commune") {
      const premier = get()
        .etablissements.filter((e) => e.commune === suggestion.label)
        .sort((a, b) => a.nom_etablissement.localeCompare(b.nom_etablissement))[0];
      get().setFiltre("recherche", suggestion.label);
      if (premier) get().selectionnerEtablissement(premier.code_uai);
      trackEvent("suggestion-recherche-choisie", "commune");
    } else {
      get().setFiltre("recherche", suggestion.label);
      get().selectionnerEtablissement(suggestion.codeUai);
      trackEvent("suggestion-recherche-choisie", "etablissement");
    }
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

  return useMemo(() => {
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

      if (motsRecherche.length > 0) {
        const cible = normaliserPourRecherche(
          `${e.nom_etablissement} ${e.commune} ${e.code_postal ?? ""} ${e.code_uai ?? ""}`
        );
        if (!motsRecherche.every((mot) => cible.includes(mot))) return false;
      }

      return true;
    });
  }, [etablissements, filtres]);
}

/**
 * Suggestions d'autocomplétion : jusqu'à 5 résultats maximum, communes
 * correspondantes d'abord (triées alphabétiquement), puis établissements
 * correspondants (triés alphabétiquement) — soit par leur propre nom, soit
 * parce qu'ils sont situés dans une commune déjà trouvée (permet à "saint
 * cloud" de proposer aussi les établissements de Saint-Cloud, pas seulement
 * la ville). Cherche dans TOUS les établissements chargés, indépendamment
 * des autres filtres actifs (type, statut, IPS...).
 */
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

    const communesTrouvees = Array.from(
      new Set(etablissements.map((e) => e.commune).filter(Boolean))
    )
      .filter((commune) => correspond(commune))
      .sort((a, b) => a.localeCompare(b));

    const suggestionsCommunes = communesTrouvees.map((commune) => ({
      type: "commune",
      cle: `commune-${commune}`,
      label: commune,
    }));

    const communesTrouveesSet = new Set(communesTrouvees);
    const etablissementsTrouves = etablissements
      .filter((e) => correspond(e.nom_etablissement) || communesTrouveesSet.has(e.commune))
      .sort((a, b) => a.nom_etablissement.localeCompare(b.nom_etablissement));

    const suggestionsEtablissements = etablissementsTrouves.map((e) => ({
      type: "etablissement",
      cle: e.code_uai,
      label: e.nom_etablissement,
      commune: e.commune,
      codeUai: e.code_uai,
    }));

    return [...suggestionsCommunes, ...suggestionsEtablissements].slice(0, 5);
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
