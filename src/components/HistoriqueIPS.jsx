import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Dot } from "recharts";
import { useHistoriqueIPS } from "../hooks/useEtablissementsStore";
import { couleurDegradeIPS, IPS_MIN, IPS_MAX } from "../utils/ipsColor";
import InfoBulle from "./InfoBulle";

import { preparerHistoriqueIPS, ANNEE_RUPTURE_METHODO } from "../utils/historiqueIPS";

function PointPersonnalise({ cx, cy, payload }) {
  return (
    <Dot cx={cx} cy={cy} r={3.5} fill={couleurDegradeIPS(payload.ips)} stroke="#FAF7F0" strokeWidth={1.5} />
  );
}

export default function HistoriqueIPS({ codeUai }) {
  const historique = useHistoriqueIPS(codeUai);
  const { points, rupture, ecart, debutComparaison, finComparaison } = preparerHistoriqueIPS(historique);
  if (points.length < 2) return null;
  const premiereAnnee = points[0].annee;
  const derniereAnnee = points.at(-1).annee;

  return (
    <div className="mt-4 border-t border-sable-200 pt-3">
      <p className="mb-1.5 flex items-center gap-1.5 font-body text-xs text-encre-400">
        Évolution {premiereAnnee}–{derniereAnnee}
        <InfoBulle
          texte="La méthode de calcul de l'IPS a évolué en 2022 (nouvelle nomenclature des professions). Comparez les tendances avant/après cette date avec prudence : un écart peut refléter ce changement de méthode plutôt qu'une évolution réelle du profil des élèves."
          position="haut"
        />
        {ecart != null && (
          <span
            className="ml-auto font-mono text-xs font-semibold text-encre-600"
          >
            {ecart > 0 ? "+" : ""}
            {ecart.toFixed(1)} pts ({debutComparaison}–{finComparaison})
          </span>
        )}
      </p>

      <ResponsiveContainer width="100%" height={72}>
        <LineChart data={points} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
          <XAxis
            dataKey="annee"
            tick={{ fontSize: 10, fill: "#6C93BE", fontFamily: "IBM Plex Mono" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis domain={[IPS_MIN, IPS_MAX]} hide />
          <Tooltip
            contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8 }}
            formatter={(v) => [v, "IPS"]}
            labelFormatter={(annee) => `Rentrée ${annee}`}
          />
          {["avant", "depuis"].map(periode => <Line
            key={periode}
            type="monotone"
            dataKey={periode}
            stroke="#2F5A8C"
            strokeWidth={2}
            dot={<PointPersonnalise />}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />)}
        </LineChart>
      </ResponsiveContainer>

      {rupture && (
        <p className="mt-2 text-xs leading-relaxed text-encre-600">
          Changement de méthode en {ANNEE_RUPTURE_METHODO} : les deux périodes sont séparées et aucun écart n’est calculé entre elles.
        </p>
      )}
    </div>
  );
}