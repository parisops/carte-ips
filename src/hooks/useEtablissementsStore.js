import { create } from "zustand";
import { joinByUai } from "../utils/joinData";

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
      return { filtres };
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
    set({ etablissementSelectionneId: code_uai });
    get().chargerResultatsSiBesoin();
    get().chargerHistoriqueSiBesoin();
    get().chargerHistoriqueResultatsSiBesoin();
  },
  fermerPanneau: () => set({ etablissementSelectionneId: null }),
}));

import { useMemo } from "react";

export function useEtablissementsFiltres() {
  const etablissements = useEtablissementsStore((s) => s.etablissements);
  const filtres = useEtablissementsStore((s) => s.filtres);

  return useMemo(() => {
    const recherche = filtres.recherche.trim().toLowerCase();

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

      if (recherche) {
        const cible = `${e.nom_etablissement} ${e.commune} ${e.code_postal ?? ""} ${e.code_uai ?? ""}`.toLowerCase();
        if (!cible.includes(recherche)) return false;
      }

      return true;
    });
  }, [etablissements, filtres]);
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