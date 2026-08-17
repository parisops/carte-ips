import EffectifsParNiveau from "./EffectifsParNiveau";
import InfoBulle from "./InfoBulle";
import HistoriqueResultats from "./HistoriqueResultats";

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

const INFOS_PAR_TYPE = {
  Collège: {
    titre: "Valeur ajoutée du collège (IVAC)",
    texte:
      "L'IVAC compare les résultats réellement observés au brevet à ceux qu'on attendrait d'un collège accueillant un profil d'élèves comparable (même niveau d'entrée en 6e). Positif = l'établissement fait mieux que prévu compte tenu de son public. Non calculé si les données d'entrée en 6e manquent pour plus de 25% des élèves.",
  },
  Lycée: {
    titre: "Valeur ajoutée du lycée (IVAL)",
    texte:
      "L'IVAL applique la même logique que l'IVAC au taux de réussite, taux de mentions et taux d'accès au bac : l'écart entre résultats observés et résultats attendus pour un profil d'élèves comparable. Diffusé seulement au-delà d'un seuil de candidats (20 en général/techno, 10 en professionnel).",
  },
};
const INFO_DEFAUT = {
  titre: "Résultats scolaires",
  texte:
    "Écart entre les résultats observés et ceux attendus pour un établissement accueillant un profil d'élèves comparable. Positif = fait mieux que prévu compte tenu de son public.",
};

export default function ResultatsScolaires({ resultats, typeEtablissement }) {
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

  const info = INFOS_PAR_TYPE[typeEtablissement] ?? INFO_DEFAUT;

  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 font-body text-xs font-semibold uppercase tracking-wide text-encre-400">
        {info.titre}
        <InfoBulle texte={info.texte} />
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
      </p>
      {resultats_millesime && (
        <p className="mt-1 font-body text-[11px] text-encre-400">
          Source : DEPP (Ministère de l'Éducation nationale), session {resultats_millesime}
        </p>
      )}

      <HistoriqueResultats codeUai={resultats.code_uai} sigle={typeEtablissement === "Lycée" ? "IVAL" : "IVAC"} />

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