import { X, MapPin, Hash, Users, PersonStanding, School } from "lucide-react";
import {
  useEtablissementSelectionne,
  useEtablissementsStore,
} from "../hooks/useEtablissementsStore";
import { computeParite, COULEUR_PAR_TYPE } from "../utils/joinData";
import Badge from "./Badge";
import GaugeIPS from "./GaugeIPS";
import DonutParite from "./DonutParite";
import EffectifsParNiveau from "./EffectifsParNiveau";
import ResultatsScolaires from "./ResultatsScolaires";

export default function PanneauDetail() {
  const etablissement = useEtablissementSelectionne();
  const fermerPanneau = useEtablissementsStore((s) => s.fermerPanneau);
  const selectionnerEtablissement = useEtablissementsStore((s) => s.selectionnerEtablissement);
  const tousLesEtablissements = useEtablissementsStore((s) => s.etablissements);

  if (!etablissement) return null;

  const fratrie = tousLesEtablissements.filter(
    (e) => e.site_key === etablissement.site_key && e.code_uai !== etablissement.code_uai
  );

  const parite = computeParite(etablissement);
  const aFilieres =
    etablissement.effectifs_filiere_gen != null || etablissement.effectifs_filiere_techno != null;
  const dataFilieres = aFilieres
    ? [
        ...(etablissement.effectifs_filiere_gen
          ? [{ nom: "Générale", effectif: etablissement.effectifs_filiere_gen }]
          : []),
        ...Object.entries(etablissement.effectifs_filiere_techno ?? {})
          .filter(([, v]) => v > 0)
          .map(([nom, effectif]) => ({ nom, effectif })),
      ]
    : [];

  return (
    <>
      {/* Overlay mobile : le panneau se comporte comme une modale sous md */}
      <div
        className="fixed inset-0 z-[1400] bg-encre-950/30 md:hidden"
        onClick={fermerPanneau}
      />

      <aside
        className="fixed inset-x-0 bottom-0 z-[1500] max-h-[88vh] overflow-y-auto rounded-t-3xl bg-sable-50 shadow-panel
                   md:static md:inset-auto md:h-full md:max-h-none md:w-[400px] md:shrink-0 md:rounded-2xl md:border md:border-sable-200"
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 border-b border-sable-200 bg-sable-50 px-5 pb-4 pt-5"
          style={{ borderTop: `4px solid ${COULEUR_PAR_TYPE[etablissement.type_etablissement]}` }}
        >
          <button
            onClick={fermerPanneau}
            className="absolute right-4 top-4 rounded-full p-1.5 text-encre-600 hover:bg-sable-200"
            aria-label="Fermer le panneau"
          >
            <X size={18} />
          </button>

          <h2 className="pr-8 font-display text-xl font-semibold leading-tight text-encre-950">
            {etablissement.nom_etablissement}
          </h2>

          <p className="mt-1 flex items-center gap-1.5 font-body text-sm text-encre-600">
            <MapPin size={14} />
            {etablissement.adresse ? `${etablissement.adresse}, ` : ""}
            {etablissement.commune} · {etablissement.code_postal}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-encre-400">
            <Hash size={12} />
            UAI {etablissement.code_uai}
            {etablissement.departement ? ` · ${etablissement.departement}` : ""}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="encre">{etablissement.type_etablissement}</Badge>
            <Badge tone={etablissement.statut === "Public" ? "tableau" : "neutre"}>
              {etablissement.statut}
            </Badge>
            {etablissement.label_rep && <Badge tone="alerte">{etablissement.label_rep}</Badge>}
          </div>

          {/* Fratrie : autres établissements exactement à la même adresse */}
          {fratrie.length > 0 && (
            <div className="mt-3 border-t border-sable-200 pt-3">
              <p className="mb-1.5 flex items-center gap-1.5 font-body text-xs text-encre-400">
                <School size={12} /> Même site
              </p>
              <div className="flex flex-wrap gap-1.5">
                {fratrie.map((s) => (
                  <button
                    key={s.code_uai}
                    onClick={() => selectionnerEtablissement(s.code_uai)}
                    className="flex items-center gap-1.5 rounded-full border border-sable-200 bg-white px-2.5 py-1 font-body text-xs text-encre-800 hover:border-encre-400"
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: COULEUR_PAR_TYPE[s.type_etablissement] }}
                    />
                    {s.type_etablissement}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6 px-5 py-5">
          {/* Démographie & parité */}
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 font-body text-xs font-semibold uppercase tracking-wide text-encre-400">
              <Users size={13} /> Démographie
            </h3>
            <div className="flex items-baseline gap-4">
              <p className="font-display text-3xl font-semibold text-encre-950">
                {etablissement.effectif_total ?? "—"}
                <span className="ml-1.5 font-body text-sm font-normal text-encre-600">élèves</span>
              </p>
              {etablissement.nombre_classes != null && (
                <p className="font-display text-3xl font-semibold text-encre-950">
                  {etablissement.nombre_classes}
                  <span className="ml-1.5 font-body text-sm font-normal text-encre-600">classes</span>
                </p>
              )}
            </div>

            {parite && (
              <div className="mt-3">
                <DonutParite pctFilles={parite.pctFilles} pctGarcons={parite.pctGarcons} />
              </div>
            )}

            {etablissement.effectifs_par_niveau &&
              Object.keys(etablissement.effectifs_par_niveau).length > 0 && (
                <div className="mt-4">
                  <p className="mb-1.5 font-body text-xs text-encre-400">Répartition par niveau</p>
                  <EffectifsParNiveau
                    data={etablissement.effectifs_par_niveau}
                    couleur={COULEUR_PAR_TYPE[etablissement.type_etablissement]}
                  />
                </div>
              )}
            {etablissement.effectifs_millesime && (
              <p className="mt-2 font-body text-[11px] text-encre-400">
                Données de la rentrée {etablissement.effectifs_millesime}
              </p>
            )}
          </section>

          {/* Mixité sociale */}
          {etablissement.ips_etablissement != null ? (
            <section>
              <h3 className="mb-2 font-body text-xs font-semibold uppercase tracking-wide text-encre-400">
                Mixité sociale — IPS
              </h3>
              <p className="mb-2 font-mono text-2xl font-semibold text-encre-950">
                {etablissement.ips_etablissement}
              </p>
              <GaugeIPS
                valeur={etablissement.ips_etablissement}
                moyDepartement={etablissement.ips_moy_departement}
                moyAcademie={etablissement.ips_moy_academie}
                moyNational={etablissement.ips_moy_national}
              />
              {etablissement.ips_millesime && (
                <p className="mt-2 font-body text-[11px] text-encre-400">
                  Données de la rentrée {etablissement.ips_millesime}
                </p>
              )}
            </section>
          ) : (
            <section>
              <h3 className="mb-2 font-body text-xs font-semibold uppercase tracking-wide text-encre-400">
                Mixité sociale — IPS
              </h3>
              <p className="rounded-lg bg-sable-100 px-3 py-2 font-body text-xs text-encre-600">
                IPS non publié pour cet établissement — le ministère ne diffuse pas l'indicateur en
                dessous d'un certain effectif, pour préserver l'anonymat des élèves.
              </p>
            </section>
          )}

          <ResultatsScolaires resultats={etablissement} />

          {/* Inclusivité */}
          {(etablissement.effectif_ulis > 0 || etablissement.effectif_segpa > 0) && (
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 font-body text-xs font-semibold uppercase tracking-wide text-encre-400">
                <PersonStanding size={13} /> Inclusivité
              </h3>
              <div className="flex gap-3">
                {etablissement.effectif_ulis > 0 && (
                  <div className="flex-1 rounded-xl bg-tableau-100 px-3 py-2">
                    <p className="font-mono text-lg font-semibold text-tableau-700">
                      {etablissement.effectif_ulis}
                    </p>
                    <p className="font-body text-xs text-tableau-700">élèves en ULIS</p>
                  </div>
                )}
                {etablissement.effectif_segpa > 0 && (
                  <div className="flex-1 rounded-xl bg-craie-100 px-3 py-2">
                    <p className="font-mono text-lg font-semibold text-craie-600">
                      {etablissement.effectif_segpa}
                    </p>
                    <p className="font-body text-xs text-craie-600">élèves en SEGPA</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Offre pédagogique */}
          {(etablissement.langues_lv1_lv2?.length > 0 || aFilieres) && (
            <section>
              <h3 className="mb-2 font-body text-xs font-semibold uppercase tracking-wide text-encre-400">
                Offre pédagogique
              </h3>

              {etablissement.langues_lv1_lv2?.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {etablissement.langues_lv1_lv2.map((langue) => (
                    <span
                      key={langue}
                      className="rounded-full border border-sable-200 bg-white px-2.5 py-1 font-body text-xs text-encre-800"
                    >
                      {langue}
                    </span>
                  ))}
                </div>
              )}

              {dataFilieres.length > 0 && (
                <div>
                  <p className="mb-1.5 font-body text-xs text-encre-400">
                    Effectifs par filière (1ère + Terminale)
                  </p>
                  <EffectifsParNiveauFilieres data={dataFilieres} />
                </div>
              )}
            </section>
          )}
        </div>
      </aside>
    </>
  );
}

function EffectifsParNiveauFilieres({ data }) {
  const objet = Object.fromEntries(data.map((d) => [d.nom, d.effectif]));
  return <EffectifsParNiveau data={objet} couleur="#1E3A5F" />;
}
