import { useState, useRef, useCallback, useEffect } from "react";
import { X, MapPin, Hash, Users, PersonStanding, School, ChevronDown, ChevronUp } from "lucide-react";
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
import InfoBulle from "./InfoBulle";

const HAUTEURS_ETATS = { peek: 16, mi: 52, plein: 92 };
const SEUILS_SNAP = { peek: 30, mi: 72 };

function useBottomSheetDrag(etatInitial = "mi") {
  const [etat, setEtat] = useState(etatInitial);
  const [hauteurEnCours, setHauteurEnCours] = useState(null);
  const [enTransition, setEnTransition] = useState(false);
  const drag = useRef(null);

  const onPointerDown = useCallback(
    (e) => {
      setEnTransition(false);
      drag.current = { startY: e.clientY, startHauteur: HAUTEURS_ETATS[etat] };
      e.target.setPointerCapture?.(e.pointerId);
    },
    [etat]
  );

  const onPointerMove = useCallback((e) => {
    if (!drag.current) return;
    const deltaVh = ((drag.current.startY - e.clientY) / window.innerHeight) * 100;
    const nouvelle = Math.min(96, Math.max(6, drag.current.startHauteur + deltaVh));
    setHauteurEnCours(nouvelle);
  }, []);

  const onPointerUp = useCallback(() => {
    if (hauteurEnCours == null) {
      drag.current = null;
      return;
    }
    const finale =
      hauteurEnCours < SEUILS_SNAP.peek
        ? "peek"
        : hauteurEnCours < SEUILS_SNAP.mi
        ? "peek"
        : hauteurEnCours < 78
        ? "mi"
        : "plein";
    setEnTransition(true);
    setEtat(finale);
    setHauteurEnCours(null);
    drag.current = null;
  }, [hauteurEnCours]);

  const changerEtat = useCallback((nouvelEtat) => {
    setEnTransition(true);
    setEtat(nouvelEtat);
  }, []);

  const hauteurActuelle = hauteurEnCours ?? HAUTEURS_ETATS[etat];
  return { etat, setEtat: changerEtat, hauteurActuelle, enTransition, onPointerDown, onPointerMove, onPointerUp };
}

export default function PanneauDetail({ variant = "flottant-desktop" }) {
  const etablissement = useEtablissementSelectionne();
  const fermerPanneau = useEtablissementsStore((s) => s.fermerPanneau);
  const selectionnerEtablissement = useEtablissementsStore((s) => s.selectionnerEtablissement);
  const tousLesEtablissements = useEtablissementsStore((s) => s.etablissements);

  const sheet = useBottomSheetDrag("mi");

  const dernierCodeUai = useRef(null);
  useEffect(() => {
    if (etablissement && etablissement.code_uai !== dernierCodeUai.current) {
      dernierCodeUai.current = etablissement.code_uai;
      sheet.setEtat("mi");
    }
  }, [etablissement, sheet]);

  const contenuRef = useRef(null);
  const [peutScroller, setPeutScroller] = useState(false);
  useEffect(() => {
    const el = contenuRef.current;
    if (!el) return;
    const verifier = () => setPeutScroller(el.scrollHeight - el.scrollTop - el.clientHeight > 24);
    verifier();
    el.addEventListener("scroll", verifier);
    const observer = new ResizeObserver(verifier);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", verifier);
      observer.disconnect();
    };
  }, [etablissement, sheet.etat]);

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

  const contenu = (
    <ContenuFiche
      etablissement={etablissement}
      fratrie={fratrie}
      parite={parite}
      dataFilieres={dataFilieres}
      onSelectFratrie={selectionnerEtablissement}
    />
  );

  if (variant === "flottant-desktop") {
    return (
      <aside className="pointer-events-auto absolute right-4 top-20 flex max-h-[calc(100%-6rem)] w-[380px] flex-col overflow-hidden rounded-2xl border border-sable-200 bg-sable-50 shadow-panel">
        <EnTeteFiche
          etablissement={etablissement}
          fratrie={fratrie}
          onFermer={fermerPanneau}
          onSelectFratrie={selectionnerEtablissement}
        />
        <div ref={contenuRef} className="overflow-y-auto px-5 py-5">
          {contenu}
        </div>
        {peutScroller && (
          <div className="pointer-events-none relative -mt-8 h-8 bg-gradient-to-t from-sable-50 to-transparent" />
        )}
      </aside>
    );
  }

  const hauteur = sheet.hauteurActuelle;

  return (
    <>
      {sheet.etat === "plein" && (
        <div className="fixed inset-0 z-[1400] bg-encre-950/30" onClick={fermerPanneau} />
      )}

      <aside
        className={`fixed inset-x-0 bottom-0 z-[1500] flex flex-col overflow-hidden rounded-t-3xl bg-sable-50 shadow-panel
                    ${sheet.enTransition ? "transition-[height] duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)]" : ""}`}
        style={{ height: `${hauteur}dvh` }}
      >
        <div
          className="group flex shrink-0 cursor-grab touch-none flex-col items-center justify-center gap-1 py-2.5 active:bg-sable-100"
          onPointerDown={sheet.onPointerDown}
          onPointerMove={sheet.onPointerMove}
          onPointerUp={sheet.onPointerUp}
          role="slider"
          aria-label="Redimensionner le panneau"
          aria-valuenow={Math.round(hauteur)}
          aria-valuemin={6}
          aria-valuemax={96}
        >
          <div className="h-1.5 w-12 rounded-full bg-sable-300 transition-colors group-active:bg-encre-600" />
          <div className="flex gap-1">
            <button
              onClick={() => sheet.setEtat(sheet.etat === "peek" ? "mi" : "plein")}
              className="rounded-full p-0.5 text-encre-400 hover:text-encre-600"
              aria-label="Agrandir le panneau"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={() => sheet.setEtat(sheet.etat === "plein" ? "mi" : "peek")}
              className="rounded-full p-0.5 text-encre-400 hover:text-encre-600"
              aria-label="Réduire le panneau"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        <EnTeteFiche
          etablissement={etablissement}
          fratrie={fratrie}
          onFermer={fermerPanneau}
          onSelectFratrie={selectionnerEtablissement}
          compact={sheet.etat === "peek"}
        />

        {sheet.etat !== "peek" && (
          <div className="relative flex-1 overflow-hidden">
            <div ref={contenuRef} className="h-full overflow-y-auto px-5 pb-8 pt-2">
              {contenu}
            </div>
            {peutScroller && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-sable-50 to-transparent" />
            )}
          </div>
        )}

        {sheet.etat === "peek" && (
          <button
            onClick={() => sheet.setEtat("mi")}
            className="mx-5 mb-4 flex items-center justify-center gap-1.5 rounded-xl bg-encre-950 py-3 font-body text-sm font-semibold text-sable-50"
          >
            Voir la fiche complète <ChevronDown size={15} className="rotate-180" />
          </button>
        )}
      </aside>
    </>
  );
}

function EnTeteFiche({ etablissement, fratrie, onFermer, onSelectFratrie, compact = false }) {
  return (
    <div
      className="relative shrink-0 border-b border-sable-200 px-5 pb-3 pt-1"
      style={{ borderTop: compact ? "none" : `4px solid ${COULEUR_PAR_TYPE[etablissement.type_etablissement]}` }}
    >
      <button
        onClick={onFermer}
        className="absolute right-4 top-2 rounded-full p-2 text-encre-600 hover:bg-sable-200"
        aria-label="Fermer le panneau"
      >
        <X size={18} />
      </button>

      <h2 className="pr-8 font-display text-lg font-semibold leading-tight text-encre-950">
        {etablissement.nom_etablissement}
      </h2>

      {!compact && (
        <>
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
        </>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge tone="encre">{etablissement.type_etablissement}</Badge>
        <Badge tone={etablissement.statut === "Public" ? "tableau" : "neutre"}>
          {etablissement.statut}
        </Badge>
        {etablissement.label_rep && (
          <span className="inline-flex items-center gap-1">
            <Badge tone="alerte">{etablissement.label_rep}</Badge>
            <InfoBulle texte="REP (Réseau d'Éducation Prioritaire) et REP+ désignent les établissements accueillant les publics les plus éloignés de la réussite scolaire, bénéficiant de moyens renforcés. REP+ concerne les situations les plus difficiles." />
          </span>
        )}
        {compact && etablissement.ips_etablissement != null && (
          <span className="font-mono text-sm font-semibold text-encre-950">
            IPS {etablissement.ips_etablissement}
          </span>
        )}
      </div>

      {!compact && fratrie.length > 0 && (
        <div className="mt-3 border-t border-sable-200 pt-3">
          <p className="mb-1.5 flex items-center gap-1.5 font-body text-xs text-encre-400">
            <School size={12} /> Même site
          </p>
          <div className="flex flex-wrap gap-1.5">
            {fratrie.map((s) => (
              <button
                key={s.code_uai}
                onClick={() => onSelectFratrie(s.code_uai)}
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
  );
}

function ContenuFiche({ etablissement, parite, dataFilieres }) {
  const aFilieres = dataFilieres.length > 0;

  return (
    <div className="space-y-6">
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

      {etablissement.ips_etablissement != null ? (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 font-body text-xs font-semibold uppercase tracking-wide text-encre-400">
            Mixité sociale — IPS
            <InfoBulle texte="L'Indice de Position Sociale (IPS) résume le profil social et scolaire moyen des familles d'un établissement, à partir des professions des deux parents. Échelle continue d'environ 50 à 170. Il décrit le PUBLIC accueilli, pas la qualité de l'établissement — pour cela, voir la valeur ajoutée (IVAC/IVAL) ci-dessous." />
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
          {etablissement.ips_percentile_regional != null && (
            <p className="mt-2 font-body text-xs text-encre-600">
              Plus favorisé que <span className="font-mono font-semibold">{etablissement.ips_percentile_regional}%</span>{" "}
              des {etablissement.type_etablissement.toLowerCase()}s d'Île-de-France.
            </p>
          )}
          {etablissement.ips_millesime && (
            <p className="mt-2 flex items-center gap-1 font-body text-[11px] text-encre-400">
              Source : DEPP (Ministère de l'Éducation nationale), rentrée {etablissement.ips_millesime}
              <InfoBulle
                texte="Comparer deux établissements sur leur seul IPS compare des populations d'élèves, pas des performances. Un écart de quelques points ne doit pas être sur-interprété. Pour juger l'efficacité propre d'un établissement à profil équivalent, référez-vous plutôt à sa valeur ajoutée (IVAC/IVAL)."
                position="haut"
              />
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

      <ResultatsScolaires resultats={etablissement} typeEtablissement={etablissement.type_etablissement} />

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

          {aFilieres && (
            <div>
              <p className="mb-1.5 font-body text-xs text-encre-400">
                Effectifs par filière (1ère + Terminale)
              </p>
              <EffectifsParNiveau
                data={Object.fromEntries(dataFilieres.map((d) => [d.nom, d.effectif]))}
                couleur="#1E3A5F"
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
