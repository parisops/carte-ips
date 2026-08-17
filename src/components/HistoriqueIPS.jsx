import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Dot } from "recharts";
import { useHistoriqueIPS } from "../hooks/useEtablissementsStore";
import { couleurDegradeIPS, IPS_MIN, IPS_MAX } from "../utils/ipsColor";
import InfoBulle from "./InfoBulle";

const ANNEE_RUPTURE_METHODO = 2022;

function PointPersonnalise({ cx, cy, payload }) {
  return (
    <Dot cx={cx} cy={cy} r={3.5} fill={couleurDegradeIPS(payload.ips)} stroke="#FAF7F0" strokeWidth={1.5} />
  );
}

/**
 * Historique de l'IPS d'un établissement au fil des années, sous forme de
 * mini-graphique en ligne — complète la valeur ponctuelle affichée dans
 * GaugeIPS avec une lecture de tendance (établissement en hausse/baisse/
 * stable), impossible à percevoir avec un seul chiffre.
 *
 * Chargement à la demande : `historique_ips.json` pèse plusieurs Mo, donc
 * n'est récupéré qu'au premier clic sur un établissement (cf.
 * chargerHistoriqueSiBesoin() dans le store), jamais au démarrage de la carte.
 */
export default function HistoriqueIPS({ codeUai, valeurActuelle }) {
  const points = useHistoriqueIPS(codeUai);

  if (points.length < 2) return null;

  const premiereAnnee = points[0].annee;
  const derniereAnnee = points[points.length - 1].annee;
  const ecart = valeurActuelle != null ? valeurActuelle - points[0].ips : null;

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
            className={`ml-auto font-mono text-xs font-semibold ${
              ecart > 0 ? "text-tableau-700" : ecart < 0 ? "text-craie-600" : "text-encre-400"
            }`}
          >
            {ecart > 0 ? "+" : ""}
            {ecart.toFixed(1)} pts
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
          <Line
            type="monotone"
            dataKey="ips"
            stroke="#2F5A8C"
            strokeWidth={2}
            dot={<PointPersonnalise />}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {points.some((p) => p.annee < ANNEE_RUPTURE_METHODO) &&
        points.some((p) => p.annee >= ANNEE_RUPTURE_METHODO) && (
          <p className="mt-1 font-body text-[10px] text-encre-400">
            Rupture méthodologique en {ANNEE_RUPTURE_METHODO} — voir l'info-bulle ci-dessus.
          </p>
        )}
    </div>
  );
}