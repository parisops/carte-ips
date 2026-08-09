import { create } from "zustand";
import { joinByUai } from "../utils/joinData";

// Les données réelles (data.education.gouv.fr, ~9000 établissements Île-de-France,
// pré-normalisées par scripts/prepare_data.py) sont servies comme assets statiques
// plutôt qu'importées, pour ne pas les embarquer dans le bundle JS de l'app.
// `import.meta.env.BASE_URL` respecte le `base` de vite.config.js (nécessaire
// pour un déploiement en sous-dossier comme GitHub Pages : sans ça, ces
// chemins absolus ignoreraient le préfixe "/edu-idf-map/" et 404eraient).
const URL_IDENTITE = `${import.meta.env.BASE_URL}data/identite.json`;
const URL_INDICATEURS = `${import.meta.env.BASE_URL}data/indicateurs.json`;
const URL_RESULTATS = `${import.meta.env.BASE_URL}data/resultats.json`;
// Valeurs par défaut des filtres — les bornes IPS sont recalculées
// dynamiquement à partir des données réelles au chargement (cf. init()).
const FILTRES_PAR_DEFAUT = {
  types: { École: true, Collège: true, Lycée: true },
  // NB: la donnée source (secteur_public_prive_libe) ne connaît que "Public"
  // et "Privé" — pas "Privé sous contrat". Utiliser la bonne valeur ici est
  // important : une clé qui ne correspond à aucune valeur réelle du champ
  // `statut` fait échouer `filtres.statuts[e.statut]` en permanence (retourne
  // toujours `undefined`), donc exclut ces établissements quel que soit
  // l'état de la case à cocher — c'est le bug qui vient d'être corrigé.
  statuts: { Public: true, Privé: true },
  dispositifs: { ulis: false, segpa: false, rep: false },
  ipsMin: 0,
  recherche: "",
};

export const useEtablissementsStore = create((set, get) => ({
  // --- Données ---
  etablissements: [],
  isLoaded: false,
  erreurChargement: null,
  etablissementSelectionneId: null,
  resultatsCharges: false,
  // Bornes réelles des données (pas des filtres) : utilisées pour dimensionner
  // les marqueurs sur la carte selon l'effectif, et graduer la légende IPS.
  bornesIps: [50, 170],
  bornesEffectif: [0, 2000],

  // --- Filtres ---
  filtres: FILTRES_PAR_DEFAUT,

  /**
   * À appeler une fois au montage de l'app : récupère l'identité et les
   * indicateurs (nécessaires dès le premier rendu de la carte : couleur,
   * forme, taille des marqueurs en dépendent), les joint sur `code_uai`, et
   * fige les bornes des sliders. `resultats.json` (résultats scolaires,
   * ~700 Ko) N'EST PAS chargé ici : rien sur la carte n'en dépend, seule la
   * fiche d'un établissement l'utilise — cf. `chargerResultatsSiBesoin()`.
   */
  init: async () => {
    try {
      const [identite, indicateurs] = await Promise.all([
        fetch(URL_IDENTITE).then((r) => r.json()),
        fetch(URL_INDICATEURS).then((r) => r.json()),
      ]);

      const fusion = joinByUai(identite, indicateurs);

      const ipsValues = fusion.map((e) => e.ips_etablissement).filter((v) => v != null);
      const effectifValues = fusion.map((e) => e.effectif_total).filter((v) => v != null);

      const ipsMin = ipsValues.length ? Math.min(...ipsValues) : 0;
      const ipsMax = ipsValues.length ? Math.max(...ipsValues) : 200;
      const effectifMin = effectifValues.length ? Math.min(...effectifValues) : 0;
      const effectifMax = effectifValues.length ? Math.max(...effectifValues) : 2000;

      const ipsRangeArrondi = [Math.floor(ipsMin / 10) * 10, Math.ceil(ipsMax / 10) * 10];

      set({
        etablissements: fusion,
        isLoaded: true,
        bornesIps: ipsRangeArrondi,
        bornesEffectif: [effectifMin, effectifMax],
        filtres: {
          ...FILTRES_PAR_DEFAUT,
          ipsMin: ipsRangeArrondi[0],
        },
      });
    } catch (err) {
      set({ erreurChargement: err.message ?? "Erreur de chargement des données" });
    }
  },

  /**
   * Charge resultats.json à la demande (premier clic sur un établissement),
   * et le fusionne dans les établissements déjà en mémoire. `joinByUai` est
   * générique : lui repasser le tableau déjà fusionné + les nouveaux
   * résultats fonctionne exactement comme au premier chargement.
   */
  chargerResultatsSiBesoin: async () => {
    if (get().resultatsCharges) return;
    set({ resultatsCharges: true }); // évite un double-fetch si cliqué 2x vite
    try {
      const resultats = await fetch(URL_RESULTATS).then((r) => r.json());
      set((state) => ({ etablissements: joinByUai(state.etablissements, resultats) }));
    } catch {
      set({ resultatsCharges: false }); // on retentera au prochain clic
    }
  },

  setFiltre: (chemin, valeur) =>
    set((state) => {
      const filtres = structuredClone(state.filtres);
      // chemin ex: "types.Collège" ou "ipsMin"
      const parts = chemin.split(".");
      if (parts.length === 1) {
        filtres[parts[0]] = valeur;
      } else {
        filtres[parts[0]][parts[1]] = valeur;
      }
      return { filtres };
    }),

  resetFiltres: () =>
    set((state) => ({ filtres: { ...FILTRES_PAR_DEFAUT, ipsMin: state.bornesIps[0] } })),

  selectionnerEtablissement: (code_uai) => {
    set({ etablissementSelectionneId: code_uai });
    get().chargerResultatsSiBesoin();
  },
  fermerPanneau: () => set({ etablissementSelectionneId: null }),
}));

/**
 * Hook dérivé : applique les filtres (opérateur ET) et mémoïse le résultat.
 * Séparé du store pour que useMemo se recalcule uniquement quand
 * `etablissements` ou `filtres` changent réellement.
 */
import { useMemo } from "react";

export function useEtablissementsFiltres() {
  const etablissements = useEtablissementsStore((s) => s.etablissements);
  const filtres = useEtablissementsStore((s) => s.filtres);

  return useMemo(() => {
    const recherche = filtres.recherche.trim().toLowerCase();

    return etablissements.filter((e) => {
      if (!filtres.types[e.type_etablissement]) return false;
      if (!filtres.statuts[e.statut]) return false;

      if (filtres.dispositifs.ulis && !(e.effectif_ulis > 0)) return false;
      if (filtres.dispositifs.segpa && !(e.effectif_segpa > 0)) return false;
      if (filtres.dispositifs.rep && !e.label_rep) return false;

      const ips = e.ips_etablissement;
      if (ips != null && ips < filtres.ipsMin) return false;

      if (recherche) {
        const cible = `${e.nom_etablissement} ${e.commune}`.toLowerCase();
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
