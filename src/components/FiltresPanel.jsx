import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react";
import { useEtablissementsStore } from "../hooks/useEtablissementsStore";
import {
  couleurDegradeIPS,
  COULEUR_IPS_INCONNU,
  IPS_MIN,
  IPS_MAX,
  CLIP_PATH_PAR_FORME,
  FORME_PAR_TYPE,
} from "../utils/ipsColor";

function CaseAFilter({ label, checked, onChange, couleur, forme }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 font-body text-sm text-encre-950">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-sable-200 accent-encre-800"
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

/**
 * Slider natif à une seule poignée : familier, léger, et surtout PERFORMANT.
 * Le curseur met à jour un état local à chaque frame (gratuit), mais ne
 * déclenche le filtrage global (recalcul + re-rendu de ~8000 marqueurs sur la
 * carte) qu'au relâchement — sinon chaque pixel glissé recalculait toute la
 * carte, d'où le lag ressenti avec l'ancien slider double.
 */
function SliderSimple({ label, min, max, value, onChangeCommit }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  return (
    <div>
      <div className="mb-1 flex justify-between font-body text-sm text-encre-950">
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
        className="w-full accent-encre-800"
      />
    </div>
  );
}

/** Bande de dégradé continue (pas des puces discrètes) : la carte utilise le
 * même dégradé pixel pour pixel, donc la légende doit lui ressembler exactement. */
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

function LegendeCarte() {
  return (
    <div className="space-y-3 rounded-2xl border border-sable-200 bg-white p-3.5">
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
        {/* items-center (et non items-end) : les cercles de tailles différentes
            doivent être centrés sur une même ligne horizontale, pas alignés
            par le bas — sinon les petits cercles paraissent "flotter". */}
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

      <p className="border-t border-sable-200 pt-2.5 font-body text-[11px] leading-relaxed text-encre-400">
        Les regroupements (plusieurs établissements au même site, ou clusters à
        faible zoom) sont colorés selon l'IPS <strong>moyen</strong> du groupe.
      </p>
    </div>
  );
}

export default function FiltresPanel() {
  const filtres = useEtablissementsStore((s) => s.filtres);
  const setFiltre = useEtablissementsStore((s) => s.setFiltre);
  const resetFiltres = useEtablissementsStore((s) => s.resetFiltres);
  const bornesIps = useEtablissementsStore((s) => s.bornesIps);
  const [ouvertMobile, setOuvertMobile] = useState(false);

  return (
    <div className="w-full">
      {/* Barre de recherche — toujours visible */}
      <div className="relative mb-2.5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-encre-400" />
        <input
          type="text"
          placeholder="Chercher un nom ou une commune…"
          value={filtres.recherche}
          onChange={(e) => setFiltre("recherche", e.target.value)}
          className="w-full rounded-xl border border-sable-200 bg-white py-2.5 pl-9 pr-3 font-body text-sm
                     text-encre-950 placeholder:text-encre-400 focus:outline-none focus:ring-2 focus:ring-encre-600"
        />
      </div>

      {/* Bouton toggle sur mobile */}
      <button
        onClick={() => setOuvertMobile((v) => !v)}
        className="mb-3 flex w-full items-center justify-between rounded-xl border border-sable-200 bg-white px-4 py-2.5 font-body text-sm font-medium text-encre-950 md:hidden"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal size={15} /> Filtres & légende
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform ${ouvertMobile ? "rotate-180" : ""}`}
        />
      </button>

      <div className={`${ouvertMobile ? "block" : "hidden"} space-y-3 md:block`}>
        <div className="space-y-3.5 rounded-2xl border border-sable-200 bg-white p-3.5">
          {/* Type */}
          <fieldset className="space-y-1.5">
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

          {/* Statut */}
          <fieldset className="space-y-1.5">
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

          {/* Dispositifs */}
          <fieldset className="space-y-1.5">
            <legend className="mb-1 font-body text-xs font-semibold uppercase tracking-wide text-encre-400">
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
            <CaseAFilter
              label="Éducation prioritaire (REP/REP+)"
              checked={filtres.dispositifs.rep}
              onChange={(v) => setFiltre("dispositifs.rep", v)}
            />
          </fieldset>

          {/* Slider IPS — seuil minimum uniquement (pas de plafond : on veut
              voir "tout ce qui est au-dessus de X", pas isoler une tranche). */}
          <div className="space-y-1.5">
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-encre-400">
              Score IPS minimum
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
            className="w-full rounded-lg border border-sable-200 py-1.5 font-body text-xs font-medium text-encre-600 hover:bg-sable-100"
          >
            Réinitialiser les filtres
          </button>
        </div>

        <LegendeCarte />
      </div>
    </div>
  );
}
