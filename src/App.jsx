import { useEffect, useState, lazy, Suspense } from "react";
import { useEtablissementsStore } from "./hooks/useEtablissementsStore";
import FiltresPanel from "./components/FiltresPanel";
import ChipsFiltresActifs from "./components/ChipsFiltresActifs";
import CarteEtablissements from "./components/CarteEtablissements";
import { LogoTrajectoires } from "./components/EcranOnboarding";
import { trackEvent } from "./utils/analytics";
import BulleAvis from "./components/BulleAvis";

const PanneauDetail = lazy(() => import("./components/PanneauDetail"));
const MentionsLegales = lazy(() => import("./components/MentionsLegales"));
const EcranOnboarding = lazy(() => import("./components/EcranOnboarding"));

const CLE_DEJA_VU = "trajectoires:onboarding-vu";

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

  useEffect(() => {
    init();
  }, [init]);

  const fermerOnboarding = () => {
    localStorage.setItem(CLE_DEJA_VU, "1");
    trackEvent("onboarding-termine");
    setOnboardingOuvert(false);
  };

  const ouvrirOnboardingManuel = () => {
    trackEvent("onboarding-ouvert", "manuel (bouton ?)");
    setOnboardingOuvert(true);
  };

  const ouvrirMentionsLegales = () => {
    trackEvent("mentions-legales-ouvertes");
    setMentionsOuvertes(true);
  };

  const ouvrirFiltres = () => {
    fermerPanneau();
    setFiltresOuverts(true);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-sable-100">
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

      <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex items-start justify-between p-3 md:p-4">
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl bg-sable-50/95 px-3 py-2 shadow-panel">
          <LogoTrajectoires taille={22} />
          <p className="font-display text-sm font-semibold text-encre-950 md:text-base">
            Trajectoires
          </p>
        </div>

        <button
          onClick={ouvrirOnboardingManuel}
          className="pointer-events-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sable-50/95 font-mono text-sm font-bold text-encre-600 shadow-panel hover:bg-white"
          aria-label="À propos de Trajectoires"
        >
          ?
        </button>
      </header>

      <div className="pointer-events-none absolute inset-0 z-[1100] hidden md:block">
        <FiltresPanel
          variant="flottant-desktop"
          ouvert={filtresOuverts}
          onToggle={() => setFiltresOuverts((v) => !v)}
        />
      </div>

      {etablissementSelectionneId && (
        <div className="pointer-events-none absolute inset-0 z-[1200] hidden md:block">
          <Suspense fallback={<PanneauDetailSkeleton variant="flottant-desktop" />}>
            <PanneauDetail variant="flottant-desktop" />
          </Suspense>
        </div>
      )}

      <div className="absolute inset-x-0 top-14 z-[1050] px-3 md:hidden">
        <ChipsFiltresActifs onOuvrirFiltres={ouvrirFiltres} />
      </div>

      <div className="md:hidden">
        <FiltresPanel
          variant="feuille-mobile"
          ouvert={filtresOuverts}
          onToggle={() => setFiltresOuverts((v) => !v)}
          onFermer={() => setFiltresOuverts(false)}
        />
      </div>

      {etablissementSelectionneId && (
        <Suspense fallback={<PanneauDetailSkeleton variant="feuille-mobile" />}>
          <div className="md:hidden">
            <PanneauDetail variant="feuille-mobile" />
          </div>
        </Suspense>
      )}

      <button
        onClick={ouvrirMentionsLegales}
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

      <BulleAvis />
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