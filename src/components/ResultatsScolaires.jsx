import EffectifsParNiveau from "./EffectifsParNiveau";

/** Même convention visuelle que les écarts IPS de GaugeIPS.jsx : vert si positif,
 * corail si négatif, gris si nul/inconnu — pour rester cohérent dans toute la fiche. */
function EcartVA({ valeur }) {
  if (valeur == null) return null;
  const signe = valeur > 0 ? "+" : "";
  return (
    <span
      className={`font-mono text-xs font-semibold ${
        valeur > 0 ? "text-tableau-700" : valeur < 0 ? "text-craie-600" : "text-encre-400"
      }`}
      title="Valeur ajoutée : écart à ce qu'on attendrait d'un établissement au profil d'élèves comparable"
    >
      {signe}
      {valeur.toFixed(1)} VA
    </span>
  );
}

function LigneIndicateur({ label, valeur, va, unite = "%" }) {
  if (valeur == null) return null;
  return (
    <div className="flex items-center justify-between font-body text-sm">
      <span className="text-encre-600">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono font-semibold text-encre-950">
          {valeur}
          {unite}
        </span>
        <EcartVA valeur={va} />
      </span>
    </div>
  );
}

/**
 * Résultats scolaires officiels (IVAC pour les collèges, IVAL pour les lycées) :
 * taux bruts + valeur ajoutée (VA) — l'écart à ce qu'on attendrait d'un
 * établissement au profil d'élèves comparable. Complémentaire à l'IPS : l'IPS
 * décrit le profil social/scolaire à l'ENTRÉE, la VA mesure la performance de
 * l'établissement compte tenu de ce profil, donc neutralise le biais "favorisé
 * = bons résultats" que l'IPS seul ne permet pas de démêler.
 *
 * N'existe pas pour les écoles (pas d'examen en primaire) : le composant
 * retourne simplement `null` dans ce cas, cohérent avec le reste de la fiche.
 */
export default function ResultatsScolaires({ resultats }) {
  if (!resultats) return null;

  const {
    taux_reussite,
    va_taux_reussite,
    taux_mentions,
    va_taux_mentions,
    mentions_detail,
    taux_acces,
    taux_reussite_par_filiere,
    resultats_millesime,
  } = resultats;

  const aMentionsDetail = mentions_detail && Object.keys(mentions_detail).length > 0;
  const aFilieres = taux_reussite_par_filiere && Object.keys(taux_reussite_par_filiere).length > 0;
  const aAcces = taux_acces && taux_acces.length > 0;

  if (taux_reussite == null && !aAcces) return null;

  return (
    <section>
      <h3 className="mb-2 font-body text-xs font-semibold uppercase tracking-wide text-encre-400">
        Résultats scolaires
      </h3>

      <div className="space-y-1.5 rounded-xl bg-sable-100 p-3">
        <LigneIndicateur label="Taux de réussite" valeur={taux_reussite} va={va_taux_reussite} />
        <LigneIndicateur label="Taux de mentions" valeur={taux_mentions} va={va_taux_mentions} />
        {aAcces &&
          taux_acces.map((a) => (
            <LigneIndicateur key={a.label} label={a.label} valeur={a.valeur} va={a.va} />
          ))}
      </div>

      <p className="mt-1.5 font-body text-[11px] leading-relaxed text-encre-400">
        VA = valeur ajoutée : écart à la réussite attendue d'un établissement
        accueillant un public comparable. Positif = fait mieux que prévu.
        {resultats_millesime && <> Données de la session {resultats_millesime}.</>}
      </p>

      {aMentionsDetail && (
        <div className="mt-4">
          <p className="mb-1.5 font-body text-xs text-encre-400">
            Répartition des mentions <span className="text-encre-400/70">(nombre d'élèves)</span>
          </p>
          <EffectifsParNiveau data={mentions_detail} couleur="#2F5A8C" unite="mentions" />
        </div>
      )}

      {aFilieres && (
        <div className="mt-4">
          <p className="mb-1.5 font-body text-xs text-encre-400">
            Taux de réussite par filière <span className="text-encre-400/70">(%)</span>
          </p>
          <EffectifsParNiveau data={taux_reussite_par_filiere} couleur="#1E3A5F" unite="%" />
        </div>
      )}
    </section>
  );
}
