import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts";

/** Barres horizontales génériques : niveaux/filières -> valeur numérique.
 * `unite` personnalise le libellé du tooltip (défaut: élèves, pour l'usage
 * historique effectifs par niveau) — réutilisé tel quel pour les mentions et
 * les taux de réussite par filière (cf. ResultatsScolaires.jsx). */
export default function EffectifsParNiveau({ data, couleur = "#1E3A5F", unite = "élèves" }) {
  const entrees = Object.entries(data).map(([niveau, effectif]) => ({ niveau, effectif }));
  if (entrees.length === 0) return null;

  // Largeur de l'axe calculée sur le plus long libellé (ex: "TB avec
  // félicitations" ne tient pas dans les 68px fixes utilisés pour "CM2" ou
  // "6e" — le texte était coupé, avalant le "f" final).
  const pluslongLabel = Math.max(...entrees.map((e) => e.niveau.length));
  const largeurAxe = Math.min(130, Math.max(50, pluslongLabel * 6.4 + 12));

  return (
    <ResponsiveContainer width="100%" height={entrees.length * 30 + 10}>
      <BarChart data={entrees} layout="vertical" margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          dataKey="niveau"
          type="category"
          width={largeurAxe}
          tick={{ fontSize: 11, fill: "#12203A", fontFamily: "Inter" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "#F3EEE1" }}
          contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8 }}
          formatter={(v) => [`${v} ${unite}`, ""]}
        />
        <Bar dataKey="effectif" fill={couleur} radius={[0, 6, 6, 0]} barSize={14}>
          <LabelList
            dataKey="effectif"
            position="right"
            // Le "%" directement sur la barre évite d'avoir à survoler pour
            // savoir si on regarde un pourcentage ou un nombre brut d'élèves.
            formatter={(v) => (unite === "%" ? `${v}%` : v)}
            style={{ fontFamily: "IBM Plex Mono", fontSize: 11, fill: "#2F5A8C" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
