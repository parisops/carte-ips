import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import {
  useEtablissementsFiltres,
  useEtablissementsStore,
} from "../hooks/useEtablissementsStore";
import { regrouperParSite } from "../utils/joinData";
import { couleurDegradeIPS, tailleDepuisEffectif, CLIP_PATH_PAR_FORME, FORME_PAR_TYPE } from "../utils/ipsColor";

const CENTRE_FRANCE = [46.6, 2.4];
const ZOOM_FRANCE = 6;
const SEUIL_MOBILE_PX = 768;
const SEUIL_ZOOM_ECLATEMENT = 10;
const SEUIL_DECLUSTERING = 14;
const SEUIL_ZOOM_MARGE_RESSERREE = 12;
const MARGE_LARGE = 0.4;
const MARGE_RESSERREE = 0.25;
const DEBOUNCE_VIEWPORT_MS = 100;

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

function creerIconeDepartement(dept, estMobile) {
  const taille = estMobile ? 72 : 84;
  const couleur = couleurDegradeIPS(dept.ipsMoyen);
  return L.divIcon({
    html: `<div style="
      width:${taille}px;height:${taille}px;border-radius:50%;
      background:#FAF7F0;border:6px solid ${couleur};
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:'Inter',sans-serif;color:#12203A;text-align:center;padding:4px;
      box-shadow:0 6px 16px rgba(18,32,58,0.35);cursor:pointer;
    ">
      <span style="font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:${estMobile ? 15 : 17}px;line-height:1;">${dept.count}</span>
      <span style="font-size:${estMobile ? 9 : 10}px;font-weight:600;line-height:1.15;margin-top:2px;">${dept.nom}</span>
    </div>`,
    className: "",
    iconSize: [taille, taille],
    iconAnchor: [taille / 2, taille / 2],
  });
}

function RecentrerSurSelection({ etablissement }) {
  const map = useMap();
  useEffect(() => {
    if (!etablissement?.latitude || !etablissement?.longitude) return;
    const zoomCible = Math.max(map.getZoom(), 15);
    map.flyTo([etablissement.latitude, etablissement.longitude], zoomCible, { duration: 0.6 });
  }, [etablissement, map]);
  return null;
}

function CadrageInitial({ bounds }) {
  const map = useMap();
  const [fait, setFait] = useState(false);
  useEffect(() => {
    if (fait || !bounds) return;
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: ZOOM_FRANCE });
    setFait(true);
  }, [bounds, map, fait]);
  return null;
}

function RecentrageSurDepartement({ departement, sitesDuDepartement }) {
  const map = useMap();
  const premierRendu = useRef(true);

  const bounds = useMemo(() => {
    if (departement === "Tous" || sitesDuDepartement.length === 0) return null;
    return L.latLngBounds(sitesDuDepartement.map((s) => [s.latitude, s.longitude]));
  }, [departement, sitesDuDepartement]);

  useEffect(() => {
    if (premierRendu.current) {
      premierRendu.current = false;
      return;
    }
    if (departement === "Tous") {
      map.flyTo(CENTRE_FRANCE, ZOOM_FRANCE, { duration: 0.6 });
      return;
    }
    if (bounds) {
      map.flyToBounds(bounds, { padding: [40, 40], duration: 0.6, maxZoom: 13 });
    }
  }, [departement, bounds, map]);

  return null;
}

function SuiviZoom({ onZoomChange }) {
  const map = useMap();
  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);
  useMapEvents({
    zoomend: (e) => onZoomChange(e.target.getZoom()),
  });
  return null;
}

function SuiviViewport({ onViewportChange, marge }) {
  const map = useMap();
  const timerRef = useRef(null);
  const margeRef = useRef(marge);
  margeRef.current = marge;

  const calculerEtEmettre = useCallback(() => {
    const bounds = map.getBounds();
    const paddedBounds = bounds.pad(margeRef.current);
    onViewportChange(paddedBounds);
  }, [map, onViewportChange]);

  useEffect(() => {
    calculerEtEmettre();
  }, [calculerEtEmettre, marge]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useMapEvents({
    moveend: () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(calculerEtEmettre, DEBOUNCE_VIEWPORT_MS);
    },
    zoomend: () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(calculerEtEmettre, DEBOUNCE_VIEWPORT_MS);
    },
  });

  return null;
}

export default function CarteEtablissements() {
  const etablissements = useEtablissementsFiltres();
  const selectionnerEtablissement = useEtablissementsStore((s) => s.selectionnerEtablissement);
  const selectionId = useEtablissementsStore((s) => s.etablissementSelectionneId);
  const bornesEffectif = useEtablissementsStore((s) => s.bornesEffectif);
  const filtres = useEtablissementsStore((s) => s.filtres);
  const setFiltre = useEtablissementsStore((s) => s.setFiltre);

  const [zoomActuel, setZoomActuel] = useState(ZOOM_FRANCE);
  const [viewportBounds, setViewportBounds] = useState(null);

  const [estMobile, setEstMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < SEUIL_MOBILE_PX
  );
  useEffect(() => {
    const onResize = () => setEstMobile(window.innerWidth < SEUIL_MOBILE_PX);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const rayonCluster = estMobile ? 44 : 32;

  const margeViewport = zoomActuel >= SEUIL_ZOOM_MARGE_RESSERREE ? MARGE_RESSERREE : MARGE_LARGE;

  const sites = useMemo(() => {
    return regrouperParSite(etablissements).map((site) => {
      const ipsConnus = site.membres.map((m) => m.ips_etablissement).filter((v) => v != null);
      const effectifsConnus = site.membres.map((m) => m.effectif_total).filter((v) => v != null);
      return {
        ...site,
        ipsMoyen: ipsConnus.length ? ipsConnus.reduce((a, b) => a + b, 0) / ipsConnus.length : null,
        effectifTotal: effectifsConnus.length ? effectifsConnus.reduce((a, b) => a + b, 0) : null,
        departement: site.membres[0]?.departement ?? null,
      };
    });
  }, [etablissements]);

  const sitesParDepartement = useMemo(() => {
    const groupes = new Map();
    for (const site of sites) {
      if (!site.departement) continue;
      if (!groupes.has(site.departement)) groupes.set(site.departement, []);
      groupes.get(site.departement).push(site);
    }
    return Array.from(groupes.entries()).map(([nom, sitesGroupe]) => {
      const lat = sitesGroupe.reduce((a, s) => a + s.latitude, 0) / sitesGroupe.length;
      const lon = sitesGroupe.reduce((a, s) => a + s.longitude, 0) / sitesGroupe.length;
      const ipsConnus = sitesGroupe.map((s) => s.ipsMoyen).filter((v) => v != null);
      const count = sitesGroupe.reduce((a, s) => a + s.membres.length, 0);
      return {
        nom,
        latitude: lat,
        longitude: lon,
        count,
        ipsMoyen: ipsConnus.length ? ipsConnus.reduce((a, b) => a + b, 0) / ipsConnus.length : null,
      };
    });
  }, [sites]);

  const boundsFrance = useMemo(() => {
    if (sites.length === 0) return null;
    return L.latLngBounds(sites.map((s) => [s.latitude, s.longitude]));
  }, [sites]);

  const sitesDuDepartementFiltre = useMemo(
    () => sites.filter((s) => s.departement === filtres.departement),
    [sites, filtres.departement]
  );

  const etablissementSelectionne = etablissements.find((e) => e.code_uai === selectionId) ?? null;

  const vueEnsemble = filtres.departement === "Tous" && zoomActuel < SEUIL_ZOOM_ECLATEMENT;

  const sitesVisibles = useMemo(() => {
    if (vueEnsemble || !viewportBounds) return sites;
    return sites.filter((site) => {
      if (site.membres.some((m) => m.code_uai === selectionId)) return true;
      return viewportBounds.contains([site.latitude, site.longitude]);
    });
  }, [sites, viewportBounds, vueEnsemble, selectionId]);

  const handleViewportChange = useCallback((bounds) => {
    setViewportBounds(bounds);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-none md:rounded-2xl md:shadow-panel">
      <MapContainer
        center={CENTRE_FRANCE}
        zoom={ZOOM_FRANCE}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        />

        {vueEnsemble ? (
          sitesParDepartement.map((dept) => (
            <Marker
              key={dept.nom}
              position={[dept.latitude, dept.longitude]}
              icon={creerIconeDepartement(dept, estMobile)}
              eventHandlers={{ click: () => setFiltre("departement", dept.nom) }}
            >
              <Tooltip direction="top" offset={[0, -12]} opacity={1}>
                <div className="font-body text-sm">
                  <p className="font-semibold text-encre-950">{dept.nom}</p>
                  <p className="text-encre-600">{dept.count} établissements</p>
                  {dept.ipsMoyen != null && (
                    <p className="text-encre-400">
                      IPS moyen&nbsp;: <span className="font-mono">{Math.round(dept.ipsMoyen)}</span>
                    </p>
                  )}
                </div>
              </Tooltip>
            </Marker>
          ))
        ) : (
          <MarkerClusterGroup
            chunkedLoading
            chunkInterval={100}
            chunkDelay={25}
            iconCreateFunction={creerIconeCluster}
            maxClusterRadius={rayonCluster}
            disableClusteringAtZoom={SEUIL_DECLUSTERING}
            spiderfyOnMaxZoom
            removeOutsideVisibleBounds
          >
            {sitesVisibles.map((site) => {
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
        )}

        <CadrageInitial bounds={boundsFrance} />
        <RecentrageSurDepartement
          departement={filtres.departement}
          sitesDuDepartement={sitesDuDepartementFiltre}
        />
        <RecentrerSurSelection etablissement={etablissementSelectionne} />
        <SuiviZoom onZoomChange={setZoomActuel} />
        {!vueEnsemble && (
          <SuiviViewport onViewportChange={handleViewportChange} marge={margeViewport} />
        )}
      </MapContainer>

      <div className="pointer-events-none absolute inset-0 z-[900]">
        <div className="absolute inset-x-0 top-0 h-7 bg-gradient-to-b from-sable-100/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-sable-100/70 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-7 bg-gradient-to-r from-sable-100/70 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-7 bg-gradient-to-l from-sable-100/70 to-transparent" />
      </div>

      <div className="absolute right-4 top-4 z-[1000] flex flex-col items-end gap-2">
        {!vueEnsemble && (
          <button
            onClick={() => setFiltre("departement", "Tous")}
            className="rounded-full bg-encre-950 px-3 py-1.5 font-body text-xs font-semibold text-sable-50 shadow-panel"
          >
            ← Tous les départements
          </button>
        )}
        <div className="rounded-xl bg-sable-50/95 px-3 py-1.5 font-mono text-xs text-encre-600 shadow-panel">
          {etablissements.length} établissement{etablissements.length > 1 ? "s" : ""} · {sites.length} point
          {sites.length > 1 ? "s" : ""} sur la carte
        </div>
      </div>
    </div>
  );
}