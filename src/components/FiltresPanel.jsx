import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, ChevronDown, X, HelpCircle, MapPin, School } from "lucide-react";
import { useEtablissementsStore, useSuggestionsRecherche } from "../hooks/useEtablissementsStore";
import {
  couleurDegradeIPS,
  COULEUR_IPS_INCONNU,
  IPS_MIN,
  IPS_MAX,
  CLIP_PATH_PAR_FORME,
  FORME_PAR_TYPE,
} from "../utils/ipsColor";
import InfoBulle from "./InfoBulle";

function CaseAFilter({ label, checked, onChange, couleur, forme }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-1 font-body text-sm text-encre-950">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 rounded border-sable-200 accent-encre-800"
      />
      {forme && (
        <span
          className="inline-block h-2.5 w-2.5 bg-encre-800"
          style={{ clipPath: CLIP_PATH_PAR_FORME[forme] }}
        />
      )}
      {!forme && couleur && (
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: couleur }} />
      )}
      {label}
    </label>
  );
}

function SliderSimple({ label, min, max, value, onChangeCommit }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  return (
    <div>
      <div className="mb-1.5 flex justify-between font-body text-sm text-encre-950">
        <span>{label}</span>
        <span className="font-mono text-xs text-encre-600">{local}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={local}
        onChange={(e) => setLocal(+e.target.value)}
        onMouseUp={(e) => onChangeCommit(+e.target.value)}
        onTouchEnd={(e) => onChangeCommit(+e.target.value)}
        onKeyUp={(e) => onChangeCommit(+e.target.value)}
        className="slider-cible-large w-full accent-encre-800"
      />
    </div>
  );
}

function BandeDegradeIPS() {
  const stops = [];
  for (let i = 0; i <= 10; i++) {
    const v = IPS_MIN + (i / 10) * (IPS_MAX - IPS_MIN);
    stops.push(`${couleurDegradeIPS(v)} ${(i / 10) * 100}%`);
  }
  return (
    <div
      className="h-2.5 w-full rounded-full"
      style={{ background: `linear-gradient(to right, ${stops.join(", ")})` }}
    />
  );
}

function LegendeCarte({ collapsibleParDefaut = false }) {
  const [ouverte, setOuverte] = useState(!collapsibleParDefaut);

  return (
    <div className="rounded-2xl border border-sable-200 bg-white">
      <button
        onClick={() => setOuverte((v) => !v)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 font-body text-xs font-semibold uppercase tracking-wide text-encre-400"
      >
        <span className="flex items-center gap-1.5">
          <HelpCircle size={13} /> Légende
        </span>
        <ChevronDown size={14} className={`transition-transform ${ouverte ? "rotate-180" : ""}`} />
      </button>

      {ouverte && (
        <div className="space-y-3 border-t border-sable-200 p-3.5">
          <div>
            <p className="mb-2 font-body text-xs font-semibold uppercase tracking-wide text-encre-400">
              Couleur = score IPS
            </p>
            <BandeDegradeIPS />
            <div className="mt-1 flex justify-between font-mono text-[10px] text-encre-400">
              <span>{IPS_MIN} (défavorisé)</span>
              <span>{IPS_MAX} (favorisé)</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 font-body text-xs text-encre-600">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: COULEUR_IPS_INCONNU }}
              />
              IPS non publié
              <InfoBulle texte="Le ministère ne diffuse pas l'IPS pour les établissements en dessous d'un certain effectif, afin de préserver l'anonymat des élèves. C'est le cas d'environ 44% des écoles primaires." />
            </div>
          </div>

          <div className="border-t border-sable-200 pt-2.5">
            <p className="mb-2 font-body text-xs font-semibold uppercase tracking-wide text-encre-400">
              Forme = type d'établissement
            </p>
            <div className="flex items-center justify-around">
              {Object.entries(FORME_PAR_TYPE).map(([type, forme]) => (
                <div key={type} className="flex flex-col items-center gap-1.5">
                  <span
                    className="inline-block h-4 w-4 bg-encre-800"
                    style={{ clipPath: CLIP_PATH_PAR_FORME[forme] }}
                  />
                  <span className="font-body text-[10px] text-encre-400">{type}</span>
                </div>
              ))}
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className="inline-block h-4 w-4 bg-encre-800"
                  style={{ clipPath: CLIP_PATH_PAR_FORME.losange }}
                />
                <span className="font-body text-[10px] text-encre-400">Site mixte</span>
              </div>
            </div>
          </div>

          <div className="border-t border-sable-200 pt-2.5">
            <p className="mb-2 font-body text-xs font-semibold uppercase tracking-wide text-encre-400">
              Taille = effectif
            </p>
            <div className="flex h-10 items-center justify-around">
              {[
                { taille: 7, label: "petit" },
                { taille: 18, label: "moyen" },
                { taille: 32, label: "grand" },
              ].map(({ taille, label }) => (
                <div key={taille} className="flex items-center gap-1.5">
                  <div
                    className="shrink-0 rounded-full bg-encre-600"
                    style={{ width: taille, height: taille }}
                  />
                  <span className="font-body text-[10px] text-encre-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Liste déroulante d'autocomplétion sous le champ de recherche : jusqu'à 5
 * suggestions (communes puis établissements, cf. useSuggestionsRecherche),
 * chacune cliquable. Un clic délègue entièrement au store
 * (selectionnerSuggestion) : remplit la recherche ET centre la carte sur la
 * commune ou l'établissement choisi.
 */
function SuggestionsRecherche({ onChoisir }) {
  const suggestions = useSuggestionsRecherche();
  if (suggestions.length === 0) return null;

  return (
    <ul className="absolute inset-x-0 top-full z-10 mt-1.5 overflow-hidden rounded-xl border border-sable-200 bg-white shadow-panel">
      {suggestions.map((s) => (
        <li key={s.cle}>
          <button
            onClick={() => onChoisir(s)}
            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left font-body text-sm text-encre-950 hover:bg-sable-100"
          >
            {s.type === "commune" ? (
              <MapPin size={14} className="shrink-0 text-encre-400" />
            ) : (
              <School size={14} className="shrink-0 text-encre-400" />
            )}
            <span className="min-w-0 flex-1 truncate">
              {s.label}
              {s.type === "etablissement" && s.commune && (
                <span className="ml-1.5 text-encre-400">— {s.commune}</span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ContenuFiltres({ onFermer }) {
  const filtres = useEtablissementsStore((s) => s.filtres);
  const setFiltre = useEtablissementsStore((s) => s.setFiltre);
  const resetFiltres = useEtablissementsStore((s) => s.resetFiltres);
  const bornesIps = useEtablissementsStore((s) => s.bornesIps);
  const selectionnerSuggestion = useEtablissementsStore((s) => s.selectionnerSuggestion);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-encre-400" />
        <input
          type="text"
          placeholder="Chercher un nom, une commune, un code postal…"
          value={filtres.recherche}
          onChange={(e) => setFiltre("recherche", e.target.value)}
          className="w-full rounded-xl border border-sable-200 bg-white py-2.5 pl-9 pr-3 font-body text-sm
                     text-encre-950 placeholder:text-encre-400 focus:outline-none focus:ring-2 focus:ring-encre-600"
        />
        <SuggestionsRecherche onChoisir={selectionnerSuggestion} />
      </div>

      <div className="space-y-3.5 rounded-2xl border border-sable-200 bg-white p-3.5">
        <fieldset className="space-y-1">
          <legend className="mb-1 font-body text-xs font-semibold uppercase tracking-wide text-encre-400">
            Type d'établissement
          </legend>
          {Object.keys(filtres.types).map((type) => (
            <CaseAFilter
              key={type}
              label={type}
              forme={FORME_PAR_TYPE[type]}
              checked={filtres.types[type]}
              onChange={(v) => setFiltre(`types.${type}`, v)}
            />
          ))}
        </fieldset>

        <fieldset className="space-y-1">
          <legend className="mb-1 font-body text-xs font-semibold uppercase tracking-wide text-encre-400">
            Statut
          </legend>
          {Object.keys(filtres.statuts).map((statut) => (
            <CaseAFilter
              key={statut}
              label={statut}
              checked={filtres.statuts[statut]}
              onChange={(v) => setFiltre(`statuts.${statut}`, v)}
            />
          ))}
        </fieldset>

        <fieldset className="space-y-1.5">
          <legend className="mb-1 font-body text-xs font-semibold uppercase tracking-wide text-encre-400">
            Département
          </legend>
          <select
            value={filtres.departement ?? "Tous"}
            onChange={(e) => setFiltre("departement", e.target.value)}
            className="w-full rounded-xl border border-sable-200 bg-white px-3 py-2 font-body text-sm text-encre-950 focus:outline-none focus:ring-2 focus:ring-encre-600"
          >
            <option value="Tous">Tous les départements</option>
            {(filtres.departementsDisponibles ?? []).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </fieldset>

        <fieldset className="space-y-1">
          <legend className="mb-1 flex items-center gap-1.5 font-body text-xs font-semibold uppercase tracking-wide text-encre-400">
            Dispositifs
          </legend>
          <CaseAFilter
            label="ULIS"
            checked={filtres.dispositifs.ulis}
            onChange={(v) => setFiltre("dispositifs.ulis", v)}
          />
          <CaseAFilter
            label="SEGPA"
            checked={filtres.dispositifs.segpa}
            onChange={(v) => setFiltre("dispositifs.segpa", v)}
          />
          <span className="flex items-center gap-1.5">
            <CaseAFilter
              label="Éducation prioritaire (REP/REP+)"
              checked={filtres.dispositifs.rep}
              onChange={(v) => setFiltre("dispositifs.rep", v)}
            />
            <InfoBulle texte="REP et REP+ désignent les établissements du réseau d'éducation prioritaire, qui bénéficient de moyens renforcés pour accompagner les publics les plus éloignés de la réussite scolaire." />
          </span>
        </fieldset>

        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 font-body text-xs font-semibold uppercase tracking-wide text-encre-400">
            Score IPS minimum
            <InfoBulle texte="Déplacez le curseur pour n'afficher que les établissements dont l'IPS est supérieur ou égal à la valeur choisie." position="droite" />
          </p>
          <SliderSimple
            label="À partir de"
            min={bornesIps[0]}
            max={bornesIps[1]}
            value={filtres.ipsMin}
            onChangeCommit={(v) => setFiltre("ipsMin", v)}
          />
        </div>

        <button
          onClick={resetFiltres}
          className="w-full rounded-lg border border-sable-200 py-2 font-body text-xs font-medium text-encre-600 hover:bg-sable-100"
        >
          Réinitialiser les filtres
        </button>
      </div>

      <LegendeCarte collapsibleParDefaut />

      {onFermer && (
        <button
          onClick={onFermer}
          className="w-full rounded-xl bg-encre-950 py-3 font-body text-sm font-semibold text-sable-50"
        >
          Voir les résultats sur la carte
        </button>
      )}
    </div>
  );
}

export default function FiltresPanel({ variant, ouvert, onToggle, onFermer }) {
  if (variant === "flottant-desktop") {
    return (
      <div className="pointer-events-auto absolute left-4 top-20 max-h-[calc(100%-6rem)] w-[300px] overflow-y-auto">
        {!ouvert && (
          <button
            onClick={onToggle}
            className="flex items-center gap-2 rounded-full bg-sable-50 px-4 py-2.5 font-body text-sm font-medium text-encre-950 shadow-panel hover:bg-white"
          >
            <SlidersHorizontal size={16} /> Filtres & légende
          </button>
        )}
        {ouvert && (
          <div className="rounded-2xl bg-sable-100/0">
            <div className="mb-2 flex items-center justify-between">
              <button
                onClick={onToggle}
                className="flex items-center gap-2 rounded-full bg-sable-50 px-4 py-2.5 font-body text-sm font-medium text-encre-950 shadow-panel hover:bg-white"
              >
                <SlidersHorizontal size={16} /> Filtres & légende
                <ChevronDown size={14} className="rotate-180" />
              </button>
            </div>
            <ContenuFiltres />
          </div>
        )}
      </div>
    );
  }

  if (!ouvert) return null;
  return (
    <>
      <div className="fixed inset-0 z-[1600] bg-encre-950/30" onClick={onFermer} />
      <aside className="fixed inset-x-0 bottom-0 z-[1700] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-sable-50 p-4 pb-6 shadow-panel">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-sable-200" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-encre-950">Filtres & légende</h2>
          <button
            onClick={onFermer}
            className="rounded-full p-2 text-encre-600 hover:bg-sable-200"
            aria-label="Fermer les filtres"
          >
            <X size={18} />
          </button>
        </div>
        <ContenuFiltres onFermer={onFermer} />
      </aside>
    </>
  );
}
