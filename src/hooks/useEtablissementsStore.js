import { create } from "zustand";
import { joinByUai } from "../utils/joinData";

const URL_IDENTITE = `${import.meta.env.BASE_URL}data/identite.json`;
const URL_INDICATEURS = `${import.meta.env.BASE_URL}data/indicateurs.json`;
const URL_RESULTATS = `${import.meta.env.BASE_URL}data/resultats.json`;

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
