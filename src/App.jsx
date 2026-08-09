import { useEffect, useState, lazy, Suspense } from "react";
import { useEtablissementsStore } from "./hooks/useEtablissementsStore";
import FiltresPanel from "./components/FiltresPanel";
import CarteEtablissements from "./components/CarteEtablissements";

// PanneauDetail embarque tout Recharts (jauges, anneaux, barres) — inutile
// dans le bundle initial pour quelqu'un qui n'a encore cliqué aucun
// marqueur. Chargé à la demande, seulement au premier clic.
const PanneauDetail = lazy(() => import("./components/PanneauDetail"));
const MentionsLegales = lazy(() => import("./components/MentionsLegales"));

export default function App() {
  const init = useEtablissementsStore((s) => s.init);
  const isLoaded = useEtablissementsStore((s) => s.isLoaded);
  const erreurChargement = useEtablissementsStore((s) => s.erreurChargement);
  const etablissementSelectionneId = useEtablissementsStore((s) => s.etablissementSelectionneId);
  const [mentionsOuvertes, setMentionsOuvertes] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="flex h-screen flex-col bg-sable-100 md:flex-row md:gap-4 md:p-4">
      <header className="shrink-0 px-4 py-3 md:hidden">
        <h1 className="font-display text-lg font-semibold text-encre-950">
          Explorateur d'établissements IDF
        </h1>
      </header>

      <div className="hidden shrink-0 md:flex md:h-full md:min-h-0 md:w-[280px] md:flex-col">
        <h1 className="mb-2 shrink-0 font-display text-lg font-semibold text-encre-950">
          Explorateur
          <br />
          d'établissements IDF
        </h1>
        <div className="min-h-0 flex-1 overflow-y-auto pt-1 pr-1">
          <FiltresPanel />
        </div>
        <button
          onClick={() => setMentionsOuvertes(true)}
          className="shrink-0 pt-2 text-left font-body text-[11px] text-encre-400 underline-offset-2 hover:underline"
        >
          Mentions légales & confidentialité
        </button>
      </div>

      <div className="block px-4 md:hidden">
        <FiltresPanel />
      </div>

      <main className="relative flex-1 overflow-hidden px-0 pb-4 md:flex md:gap-4 md:px-0 md:pb-0">
        <div className="h-[55vh] md:h-full md:flex-1">
          {isLoaded && <CarteEtablissements />}
          {!isLoaded && !erreurChargement && (
            <div className="flex h-full items-center justify-center rounded-2xl bg-white font-body text-sm text-encre-400">
              Chargement des ~9000 établissements d'Île-de-France…
            </div>
          )}
          {erreurChargement && (
            <div className="flex h-full items-center justify-center rounded-2xl bg-white px-6 text-center font-body text-sm text-craie-600">
              Impossible de charger les données ({erreurChargement}).
            </div>
          )}
        </div>
        {etablissementSelectionneId && (
          <Suspense
            fallback={
              <aside className="fixed inset-x-0 bottom-0 z-[1500] h-24 animate-pulse rounded-t-3xl bg-sable-50 shadow-panel md:static md:h-full md:w-[400px] md:shrink-0 md:rounded-2xl md:border md:border-sable-200" />
            }
          >
            <PanneauDetail />
          </Suspense>
        )}
      </main>

      <div className="px-4 pb-3 md:hidden">
        <button
          onClick={() => setMentionsOuvertes(true)}
          className="font-body text-[11px] text-encre-400 underline-offset-2 hover:underline"
        >
          Mentions légales & confidentialité
        </button>
      </div>

      {mentionsOuvertes && (
        <Suspense fallback={null}>
          <MentionsLegales onClose={() => setMentionsOuvertes(false)} />
        </Suspense>
      )}
    </div>
  );
}
