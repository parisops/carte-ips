import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Dot } from "recharts";
import { useHistoriqueResultats } from "../hooks/useEtablissementsStore";
import InfoBulle from "./InfoBulle";

export default function HistoriqueResultats({ codeUai, sigle = "IVAC" }) {
  const points = useHistoriqueResultats(codeUai).filter((p) => p.va != null);

  if (points.length < 2) return null;

  const premiereAnnee = points[0].annee;
  const derniereAnnee = points[points.length - 1].annee;
  const ecart = points[points.length - 1].va - points[0].va;

  return (
    <div className="mt-4 border-t border-sable-200 pt-3">
      <p className="mb-1.5 flex items-center gap-1.5 font-body text-xs text-encre-400">
        Évolution de la valeur ajoutée {premiereAnnee}–{derniereAnnee}
        <InfoBulle
          texte="Écart entre le taux de réussite réel et celui attendu pour un établissement au profil d'élèves comparable, session par session. Une tendance à la hausse/baisse est un signal plus solide qu'une seule année, mais reste sensible aux petites cohortes (établissements avec peu de candidats)."
          position="haut"
        />
        <span
          className={`ml-auto font-mono text-xs font-semibold ${
            ecart > 0 ? "text-tableau-700" : ecart < 0 ? "text-craie-600" : "text-encre-400"
          }`}
        >
          {ecart > 0 ? "+" : ""}
          {ecart.toFixed(1)} pts
        </span>
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
          <YAxis hide />
          <Tooltip
            contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8 }}
            formatter={(v) => [`${v > 0 ? "+" : ""}${v}`, `VA ${sigle}`]}
            labelFormatter={(annee) => `Session ${annee}`}
          />
          <Line
            type="monotone"
            dataKey="va"
            stroke="#2F6B4F"
            strokeWidth={2}
            dot={<Dot r={3.5} fill="#2F6B4F" stroke="#FAF7F0" strokeWidth={1.5} />}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}