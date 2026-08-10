import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import {
  useEtablissementsFiltres,
  useEtablissementsStore,
} from "../hooks/useEtablissementsStore";
import { regrouperParSite } from "../utils/joinData";
import { couleurDegradeIPS, tailleDepuisEffectif, CLIP_PATH_PAR_FORME, FORME_PAR_TYPE } from "../utils/ipsColor";

const CENTRE_IDF = [48.8499, 2.6377];
const ZOOM_INITIAL = 9;
const ZOOM_INITIAL_DEZOOME = 7; // point de départ de l'animation d'entrée (cf. RecentrageInitial)

// Seuil de largeur d'écran en dessous duquel on considère l'appareil "mobile"
// pour adapter le comportement du clustering (cf. maxClusterRadius plus bas).
const SEUIL_MOBILE_PX = 768;

/**
 * Icône DivIcon : couleur = IPS (moyen si plusieurs établissements au même
 * site), taille = effectif total du site, FORME = type d'établissement
 * (rond=école, carré=collège, hexagone=lycée ; losange si le site mélange
 * plusieurs types). Un site multi-établissements porte en plus un badge avec
 * le nombre d'établissements regroupés.
 */
function creerIcone(site, estSelectionne, effectifMin, effectifMax) {
  const multi = site.membres.length > 1;
  const typesPresents = new Set(site.membres.map((m) => m.type_etablissement));
  const forme = typesPresents.size > 1 ? "losange" : FORME_PAR_TYPE[site.membres[0].type_etablissement] ?? "rond";
  const clipPath = CLIP_PATH_PAR_FORME[forme];

  const couleur = couleurDegradeIPS(site.ipsMoyen);
  const taille = tailleDepuisEffectif(site.effectifTotal, effectifMin, effectifMax) + (estSelectionne ? 6 : 0);
  const couleurContour = estSelectionne ? "#12203A" : "#FAF7F0";

  const epaisseurContour = 1.5;
  const tailleExt = taille + epaisseurContour * 2;

  const badge = multi
    ? `<div style="
        position:absolute;top:-5px;right:-5px;min-width:11px;height:11px;border-radius:6px;
        background:#12203A;color:#FAF7F0;font-family:'IBM Plex Mono',monospace;
        font-size:7px;font-weight:600;display:flex;align-items:center;justify-content:center;
        padding:0 2px;border:1px solid #FAF7F0;z-index:2;
      ">${site.membres.length}</div>`
    : "";

  return L.divIcon({
    className: "",
    html: `<div style="
        position:relative;width:${tailleExt}px;height:${tailleExt}px;
        filter:drop-shadow(0 2px 4px rgba(18,32,58,0.5));
        opacity:${estSelectionne ? 1 : 0.88};
      ">
      <div style="position:absolute;inset:0;background:${couleurContour};clip-path:${clipPath};"></div>
      <div style="
        position:absolute;top:${epaisseurContour}px;left:${epaisseurContour}px;
        width:${taille}px;height:${taille}px;background:${couleur};clip-path:${clipPath};
      "></div>
      ${badge}
    </div>`,
    iconSize: [tailleExt, tailleExt],
    iconAnchor: [tailleExt / 2, tailleExt / 2],
  });
}

/**
 * Icône de cluster : anneau CREUX (pas un disque plein) + compteur, couleur =
 * IPS moyen du groupe. Volontairement différent des 4 formes individuelles
 * (rond plein/carré/hexagone/losange) : un rond plein d'école bien dé-clusterisé
 * était visuellement indiscernable d'un cluster tant qu'on n'avait pas assez
 * zoomé, ce qui donnait l'impression que "la forme école ne marche pas".
 */
function creerIconeCluster(cluster) {
  const count = cluster.getChildCount();
  const taille = count < 10 ? 42 : count < 50 ? 50 : 60;
  const epaisseurAnneau = Math.max(6, Math.round(taille * 0.2));

  const valeursIps = cluster
    .getAllChildMarkers()
    .map((m) => m.options.ips)
    .filter((v) => v != null);
  const moyenne = valeursIps.length
    ? valeursIps.reduce((a, b) => a + b, 0) / valeursIps.length
    : null;
  const couleur = couleurDegradeIPS(moyenne);

  return L.divIcon({
    html: `<div style="
      width:${taille}px;height:${taille}px;border-radius:50%;
      background:#FAF7F0;
      border:${epaisseurAnneau}px solid ${couleur};
      display:flex;align-items:center;justify-content:center;
      font-family:'IBM Plex Mono',monospace;font-weight:700;color:#12203A;
      box-shadow:0 4px 12px rgba(18,32,58,0.35);
    ">${count}</div>`,
    className: "",
    iconSize: [taille, taille],
  });
}

/** Recentre la carte quand la sélection change, sans jamais dézoomer. */
function RecentrerSurSelection({ etablissement }) {
  const map = useMap();
  useEffect(() => {
    if (!etablissement?.latitude || !etablissement?.longitude) return;
    const zoomCible = Math.max(map.getZoom(), 15);
    map.flyTo([etablissement.latitude, etablissement.longitude], zoomCible, { duration: 0.6 });
  }, [etablissement, map]);
  return null;
}

/**
 * AJOUT 1 — Cadrage initial calculé sur l'étendue réelle des données
 * (fitBounds) plutôt qu'un centre/zoom fixe, avec padding de sécurité pour
 * qu'aucun cluster ne soit coupé par le bord de l'écran au premier affichage.
 *
 * AJOUT 3 — Animation d'entrée : la carte démarre légèrement dézoomée
 * (ZOOM_INITIAL_DEZOOME) puis anime un zoom doux vers le cadrage final sur
 * ~700ms. Le mouvement communique immédiatement "voici un ensemble de
 * nombreux points" — plus efficace qu'une image statique pour faire
 * comprendre au premier regard qu'on observe un nuage de données, surtout
 * sur un écran mobile où la vue est plus contrainte.
 */
function RecentrageInitial({ sites }) {
  const map = useMap();
  const [dejaCadre, setDejaCadre] = useState(false);

  useEffect(() => {
    if (dejaCadre || sites.length === 0) return;

    const points = sites.map((s) => [s.latitude, s.longitude]);
    const bounds = L.latLngBounds(points);

    // Padding en pixels : marge de sécurité pour qu'un cluster en bord
    // d'étendue ne se retrouve jamais collé (ou coupé) sur le bord de
    // l'écran, y compris sur les petits écrans mobiles.
    const padding = [48, 48];

    map.setView(CENTRE_IDF, ZOOM_INITIAL_DEZOOME, { animate: false });

    const timer = setTimeout(() => {
      map.flyToBounds(bounds, { padding, duration: 0.7, maxZoom: ZOOM_INITIAL });
    }, 120);

    setDejaCadre(true);
    return () => clearTimeout(timer);
  }, [sites, map, dejaCadre]);

  return null;
}

export default function CarteEtablissements() {
  const etablissements = useEtablissementsFiltres();
  const selectionnerEtablissement = useEtablissementsStore((s) => s.selectionnerEtablissement);
  const selectionId = useEtablissementsStore((s) => s.etablissementSelectionneId);
  const bornesEffectif = useEtablissementsStore((s) => s.bornesEffectif);

  // AJOUT 4 — Rayon de clustering adaptatif : sur mobile, un rayon plus
  // large réduit le nombre de petits clusters proches les uns des autres
  // près des bords de l'écran, ce qui limite le risque qu'un cluster se
  // retrouve à cheval sur la limite visible (donc perçu comme "coupé").
  const [estMobile, setEstMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < SEUIL_MOBILE_PX
  );
  useEffect(() => {
    const onResize = () => setEstMobile(window.innerWidth < SEUIL_MOBILE_PX);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const rayonCluster = estMobile ? 26 : 14;

  const sites = useMemo(() => {
    return regrouperParSite(etablissements).map((site) => {
      const ipsConnus = site.membres.map((m) => m.ips_etablissement).filter((v) => v != null);
      const effectifsConnus = site.membres.map((m) => m.effectif_total).filter((v) => v != null);
      return {
        ...site,
        ipsMoyen: ipsConnus.length ? ipsConnus.reduce((a, b) => a + b, 0) / ipsConnus.length : null,
        effectifTotal: effectifsConnus.length ? effectifsConnus.reduce((a, b) => a + b, 0) : null,
      };
    });
  }, [etablissements]);

  const etablissementSelectionne = etablissements.find((e) => e.code_uai === selectionId) ?? null;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-none md:rounded-2xl md:shadow-panel">
      <MapContainer
        center={CENTRE_IDF}
        zoom={ZOOM_INITIAL}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        />

        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={creerIconeCluster}
          maxClusterRadius={rayonCluster}
          disableClusteringAtZoom={12}
          spiderfyOnMaxZoom
        >
          {sites.map((site) => {
            const estSiteSelectionne = site.membres.some((m) => m.code_uai === selectionId);
            const principal = site.membres.find((m) => m.code_uai === selectionId) ?? site.membres[0];
            return (
              <Marker
                key={site.site_key}
                position={[site.latitude, site.longitude]}
                icon={creerIcone(site, estSiteSelectionne, bornesEffectif[0], bornesEffectif[1])}
                ips={site.ipsMoyen}
                eventHandlers={{
                  click: () => selectionnerEtablissement(principal.code_uai),
                }}
              >
                <Tooltip direction="top" offset={[0, -12]} opacity={1}>
                  <div className="font-body text-sm">
                    {site.membres.length === 1 ? (
                      <>
                        <p className="font-semibold text-encre-950">{principal.nom_etablissement}</p>
                        <p className="text-encre-600">{principal.commune}</p>
                        <p className="text-encre-400">
                          {principal.ips_etablissement != null ? (
                            <>
                              IPS&nbsp;: <span className="font-mono">{principal.ips_etablissement}</span>
                            </>
                          ) : (
                            "IPS non publié"
                          )}
                          {principal.effectif_total != null && (
                            <> · {principal.effectif_total} élèves</>
                          )}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-encre-950">
                          {site.membres.length} établissements à cette adresse
                        </p>
                        <p className="text-encre-600">{principal.commune}</p>
                        <ul className="mt-1 list-disc pl-4">
                          {site.membres.map((m) => (
                            <li key={m.code_uai}>
                              {m.type_etablissement} — {m.nom_etablissement}
                              {m.ips_etablissement != null && ` (IPS ${m.ips_etablissement})`}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </Tooltip>
              </Marker>
            );
          })}
        </MarkerClusterGroup>

        <RecentrageInitial sites={sites} />
        <RecentrerSurSelection etablissement={etablissementSelectionne} />
      </MapContainer>

      {/*
        AJOUT 2 — Vignette de fondu sur les bords de la carte : un cluster
        partiellement visible en bord d'écran s'estompe progressivement au
        lieu d'être tranché net, ce qui évite l'effet "morceau de cercle"
        signalé sur mobile. Dégradés transparents → sable-100 sur ~28px,
        pointer-events désactivés pour ne jamais bloquer les interactions
        avec la carte en dessous.
      */}
      <div className="pointer-events-none absolute inset-0 z-[900]">
        <div className="absolute inset-x-0 top-0 h-7 bg-gradient-to-b from-sable-100/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-sable-100/70 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-7 bg-gradient-to-r from-sable-100/70 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-7 bg-gradient-to-l from-sable-100/70 to-transparent" />
      </div>

      <div className="absolute right-4 top-4 z-[1000] rounded-xl bg-sable-50/95 px-3 py-1.5 font-mono text-xs text-encre-600 shadow-panel">
        {etablissements.length} établissement{etablissements.length > 1 ? "s" : ""} · {sites.length} point
        {sites.length > 1 ? "s" : ""} sur la carte
      </div>
    </div>
  );
}
