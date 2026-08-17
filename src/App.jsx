import { useEffect, useState, lazy, Suspense } from "react";
import { useEtablissementsStore } from "./hooks/useEtablissementsStore";
import FiltresPanel from "./components/FiltresPanel";
import ChipsFiltresActifs from "./components/ChipsFiltresActifs";
import CarteEtablissements from "./components/CarteEtablissements";
import { LogoTrajectoires } from "./components/EcranOnboarding";

// PanneauDetail embarque tout Recharts (jauges, anneaux, barres) — inutile
// dans le bundle initial pour quelqu'un qui n'a encore cliqué aucun
// marqueur. Chargé à la demande, seulement au premier clic.
const PanneauDetail = lazy(() => import("./components/PanneauDetail"));
const MentionsLegales = lazy(() => import("./components/MentionsLegales"));
const EcranOnboarding = lazy(() => import("./components/EcranOnboarding"));

// Clé localStorage pour n'afficher automatiquement l'écran d'onboarding qu'à
// la toute première visite — un visiteur récurrent n'a pas besoin de le
// revoir à chaque chargement, mais garde le bouton "?" pour le rouvrir.
const CLE_DEJA_VU = "trajectoires:onboarding-vu";

/**
 * REFONTE LAYOUT — principe : la carte occupe TOUJOURS 100% de l'espace
 * disponible (aucun panneau ne redimensionne le <MapContainer>). Filtres et
 * détail sont des calques flottants au-dessus de la carte :
 *
 * - Desktop : FiltresPanel flotte en haut-gauche (collapsible en icône),
 *   PanneauDetail flotte en overlay à droite. La carte ne bouge jamais.
 * - Mobile : une barre de chips (filtres actifs) reste visible en permanence
 *   au-dessus de la carte. Filtres et détail s'ouvrent chacun dans un
 *   bottom-sheet dédié — un seul actif à la fois, jamais empilés.
 */
export default function App() {
  const init = useEtablissementsStore((s) => s.init);
  const isLoaded = useEtablissementsStore((s) => s.isLoaded);
  const erreurChargement = useEtablissementsStore((s) => s.erreurChargement);
  const etablissementSelectionneId = useEtablissementsStore((s) => s.etablissementSelectionneId);
  const fermerPanneau = useEtablissementsStore((s) => s.fermerPanneau);

  const [filtresOuverts, setFiltresOuverts] = useState(false);
  const [mentionsOuvertes, setMentionsOuvertes] = useState(false);
  const [onboardingOuvert, setOnboardingOuvert] = useState(
    () => typeof window !== "undefined" && !localStorage.getItem(CLE_DEJA_VU)
  );

  // Le chargement des données (~7 Mo) démarre immédiatement, en parallèle de
  // l'écran d'onboarding : le temps de lecture masque une bonne partie du
  // temps de chargement réel, la carte est déjà prête au clic "Découvrir".
  useEffect(() => {
    init();
  }, [init]);

  const fermerOnboarding = () => {
    localStorage.setItem(CLE_DEJA_VU, "1");
    setOnboardingOuvert(false);
  };

  // Un seul panneau mobile actif à la fois : ouvrir les filtres ferme
  // automatiquement la fiche détail, et inversement (cf. clic marqueur
  // dans CarteEtablissements → selectionnerEtablissement).
  const ouvrirFiltres = () => {
    fermerPanneau();
    setFiltresOuverts(true);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-sable-100">
      {/* Carte plein écran — jamais redimensionnée par les panneaux */}
      <div className="absolute inset-0">
        {isLoaded && <CarteEtablissements />}
        {!isLoaded && !erreurChargement && (
          <div className="flex h-full items-center justify-center bg-sable-50 font-body text-sm text-encre-400">
            Chargement des établissements scolaires de France…
          </div>
        )}
        {erreurChargement && (
          <div className="flex h-full items-center justify-center bg-sable-50 px-6 text-center font-body text-sm text-craie-600">
            Impossible de charger les données ({erreurChargement}).
          </div>
        )}
      </div>

      {/* Bandeau de marque léger — logo + nom, bouton "?" pour rouvrir l'onboarding */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex items-start justify-between p-3 md:p-4">
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl bg-sable-50/95 px-3 py-2 shadow-panel">
          <LogoTrajectoires taille={22} />
          <p className="font-display text-sm font-semibold text-encre-950 md:text-base">
            Trajectoires
          </p>
        </div>

        <button
          onClick={() => setOnboardingOuvert(true)}
          className="pointer-events-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sable-50/95 font-mono text-sm font-bold text-encre-600 shadow-panel hover:bg-white"
          aria-label="À propos de Trajectoires"
        >
          ?
        </button>
      </header>

      {/* === DESKTOP : panneau filtres flottant, collapsible === */}
      <div className="pointer-events-none absolute inset-0 z-[1100] hidden md:block">
        <FiltresPanel
          variant="flottant-desktop"
          ouvert={filtresOuverts}
          onToggle={() => setFiltresOuverts((v) => !v)}
        />
      </div>

      {/* === DESKTOP : panneau détail flottant à droite, overlay non bloquant sur la carte === */}
      {etablissementSelectionneId && (
        <div className="pointer-events-none absolute inset-0 z-[1200] hidden md:block">
          <Suspense fallback={<PanneauDetailSkeleton variant="flottant-desktop" />}>
            <PanneauDetail variant="flottant-desktop" />
          </Suspense>
        </div>
      )}

      {/* === MOBILE : barre de chips filtres actifs, toujours visible === */}
      <div className="absolute inset-x-0 top-14 z-[1050] px-3 md:hidden">
        <ChipsFiltresActifs onOuvrirFiltres={ouvrirFiltres} />
      </div>

      {/* === MOBILE : bottom sheet filtres === */}
      <div className="md:hidden">
        <FiltresPanel
          variant="feuille-mobile"
          ouvert={filtresOuverts}
          onToggle={() => setFiltresOuverts((v) => !v)}
          onFermer={() => setFiltresOuverts(false)}
        />
      </div>

      {/* === MOBILE : bottom sheet détail établissement (3 états) === */}
      {etablissementSelectionneId && (
        <Suspense fallback={<PanneauDetailSkeleton variant="feuille-mobile" />}>
          <div className="md:hidden">
            <PanneauDetail variant="feuille-mobile" />
          </div>
        </Suspense>
      )}

      {/* Bouton mentions légales — discret, coin bas */}
      <button
        onClick={() => setMentionsOuvertes(true)}
        className="absolute bottom-2 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-sable-50/90 px-3 py-1 font-body text-[10px] text-encre-400 underline-offset-2 hover:underline md:bottom-3 md:left-3 md:translate-x-0"
      >
        Mentions légales & confidentialité
      </button>

      {mentionsOuvertes && (
        <Suspense fallback={null}>
          <MentionsLegales onClose={() => setMentionsOuvertes(false)} />
        </Suspense>
      )}

      {onboardingOuvert && (
        <Suspense fallback={null}>
          <EcranOnboarding onFermer={fermerOnboarding} />
        </Suspense>
      )}
    </div>
  );
}

function PanneauDetailSkeleton({ variant }) {
  if (variant === "flottant-desktop") {
    return (
      <aside className="pointer-events-auto absolute right-4 top-20 h-[calc(100%-6rem)] w-[380px] animate-pulse rounded-2xl bg-sable-50/90 shadow-panel" />
    );
  }
  return (
    <div className="fixed inset-x-0 bottom-0 z-[1500] h-24 animate-pulse rounded-t-3xl bg-sable-50 shadow-panel" />
  );
}