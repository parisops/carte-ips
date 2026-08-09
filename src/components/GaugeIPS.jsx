import { IPS_MIN as BORNE_MIN, IPS_MAX as BORNE_MAX } from "../utils/ipsColor";

// Échelle FIXE partagée par toutes les fiches ET par la carte (utils/ipsColor.js) :
// l'IPS francilien va globalement de ~60 à ~165. Une borne fixe et partagée
// permet de comparer visuellement deux fiches, ou une fiche et la couleur
// d'un marqueur sur la carte — avec une borne variable, la même barre à 80%
// de large pouvait représenter un IPS de 90 ou de 140 selon l'établissement.

const REPERES = [
  { cle: "moyDepartement", label: "Département", couleur: "#2F5A8C" }, // encre-600
  { cle: "moyAcademie", label: "Académie", couleur: "#C4562F" }, // craie-600
  { cle: "moyNational", label: "National", couleur: "#12203A" }, // encre-950
];

function formatEcart(ecart) {
  if (ecart == null) return null;
  const signe = ecart > 0 ? "+" : "";
  return `${signe}${ecart.toFixed(1)}`;
}

/**
 * Bullet graph horizontal : positionne le score IPS de l'établissement sur une
 * échelle fixe [50, 170], avec 3 repères distincts (département / académie /
 * national) — chacun sa couleur, sa position ET son écart chiffré en dessous,
 * pour ne pas dépendre uniquement de la lecture visuelle des traits.
 */
export default function GaugeIPS({ valeur, moyDepartement, moyAcademie, moyNational }) {
  const pct = (v) => Math.min(100, Math.max(0, ((v - BORNE_MIN) / (BORNE_MAX - BORNE_MIN)) * 100));

  const reperes = { moyDepartement, moyAcademie, moyNational };
  const couleurValeur =
    moyNational != null && valeur >= moyNational
      ? "#2F6B4F"
      : moyNational != null && valeur >= moyNational - 10
      ? "#D9A441"
      : "#C4562F";

  return (
    <div className="w-full">
      <div className="relative h-3.5 w-full rounded-full bg-sable-200">
        <div
          className="absolute h-3.5 rounded-full transition-all"
          style={{ width: `${pct(valeur)}%`, background: couleurValeur }}
        />
        {REPERES.map(({ cle, couleur }) => {
          const v = reperes[cle];
          if (v == null) return null;
          return (
            <div
              key={cle}
              className="absolute top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full"
              style={{ left: `${pct(v)}%`, background: couleur, boxShadow: "0 0 0 1.5px white" }}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-encre-400">
        <span>{BORNE_MIN}</span>
        <span>{BORNE_MAX}</span>
      </div>

      {/* Écarts chiffrés — plus lisible que 3 traits fins à distinguer à l'œil */}
      <div className="mt-2.5 space-y-1.5">
        {REPERES.map(({ cle, label, couleur }) => {
          const v = reperes[cle];
          if (v == null) return null;
          const ecart = valeur - v;
          return (
            <div key={cle} className="flex items-center justify-between font-body text-xs">
              <span className="flex items-center gap-1.5 text-encre-600">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: couleur }}
                />
                {label} <span className="font-mono text-encre-400">({v})</span>
              </span>
              <span
                className={`font-mono font-semibold ${
                  ecart > 0 ? "text-tableau-700" : ecart < 0 ? "text-craie-600" : "text-encre-400"
                }`}
              >
                {formatEcart(ecart)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
