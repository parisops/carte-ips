import { SlidersHorizontal, X } from "lucide-react";
import { useEtablissementsStore, useEtablissementsFiltres } from "../hooks/useEtablissementsStore";

/**
 * Barre de chips mobile, toujours visible au-dessus de la carte : résout le
 * point de friction identifié dans l'audit ("l'utilisateur perd le fil de ce
 * qu'il vient de filtrer" une fois le panneau de filtres refermé). Chaque
 * filtre actif est retirable en un tap direct, sans rouvrir tout le panneau.
 */
export default function ChipsFiltresActifs({ onOuvrirFiltres }) {
  const filtres = useEtablissementsStore((s) => s.filtres);
  const setFiltre = useEtablissementsStore((s) => s.setFiltre);
  const resetFiltres = useEtablissementsStore((s) => s.resetFiltres);
  const bornesIps = useEtablissementsStore((s) => s.bornesIps);
  const resultats = useEtablissementsFiltres();

  const typesInactifs = Object.entries(filtres.types).filter(([, v]) => !v);

  const chips = [];
  // Un type/statut décoché est ce qui a changé par rapport au défaut (tout coché) —
  // c'est donc lui qu'on affiche comme "filtre actif" à retirer.
  for (const [type] of Object.entries(filtres.types).filter(([, v]) => v)) {
    if (typesInactifs.length > 0) {
      chips.push({
        id: `type-${type}`,
        label: type,
        onRemove: () => setFiltre(`types.${type}`, false),
      });
    }
  }
  if (filtres.dispositifs.ulis) {
    chips.push({ id: "ulis", label: "ULIS", onRemove: () => setFiltre("dispositifs.ulis", false) });
  }
  if (filtres.dispositifs.segpa) {
    chips.push({ id: "segpa", label: "SEGPA", onRemove: () => setFiltre("dispositifs.segpa", false) });
  }
  if (filtres.dispositifs.rep) {
    chips.push({ id: "rep", label: "REP/REP+", onRemove: () => setFiltre("dispositifs.rep", false) });
  }
  if (filtres.departement && filtres.departement !== "Tous") {
    chips.push({
      id: "departement",
      label: filtres.departement,
      onRemove: () => setFiltre("departement", "Tous"),
    });
  }
  if (filtres.ipsMin > bornesIps[0]) {
    chips.push({
      id: "ipsMin",
      label: `IPS ≥ ${filtres.ipsMin}`,
      onRemove: () => setFiltre("ipsMin", bornesIps[0]),
    });
  }
  if (filtres.recherche.trim()) {
    chips.push({
      id: "recherche",
      label: `"${filtres.recherche.trim()}"`,
      onRemove: () => setFiltre("recherche", ""),
    });
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto rounded-full bg-sable-50/95 px-2 py-2 shadow-panel">
      <button
        onClick={onOuvrirFiltres}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-encre-950 px-3 py-1.5 font-body text-xs font-semibold text-sable-50"
      >
        <SlidersHorizontal size={13} /> Filtres
      </button>

      <span className="shrink-0 font-mono text-[11px] text-encre-400">
        {resultats.length}
      </span>

      <div className="flex shrink-0 items-center gap-1.5">
        {chips.map((chip) => (
          <button
            key={chip.id}
            onClick={chip.onRemove}
            className="flex items-center gap-1 whitespace-nowrap rounded-full border border-sable-200 bg-white px-2.5 py-1 font-body text-[11px] text-encre-800"
          >
            {chip.label}
            <X size={11} />
          </button>
        ))}
      </div>

      {chips.length > 0 && (
        <button
          onClick={resetFiltres}
          className="ml-auto shrink-0 whitespace-nowrap px-2 font-body text-[11px] text-encre-400 underline-offset-2 hover:underline"
        >
          Tout effacer
        </button>
      )}
    </div>
  );
}
