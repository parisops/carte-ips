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
import { trackEvent } from "../utils/analytics";

const CENTRE_FRANCE = [46.6, 2.4];
const ZOOM_FRANCE = 6;
const BOUNDS_METROPOLE = [[41.3, -5.2], [51.2, 9.7]];
const SEUIL_MOBILE_PX = 768;
const SEUIL_ZOOM_ECLATEMENT = 10;
const SEUIL_DECLUSTERING = 14;
const SEUIL_ZOOM_MARGE_RESSERREE = 12;
const MARGE_LARGE = 0.4;
const MARGE_RESSERREE = 0.25;
const DEBOUNCE_VIEWPORT_MS = 100;

// Le référentiel d'identité ne fournit pas de région ni d'arrondissement.
// On les reconstruit à partir du département et du code postal, sans modifier
// les données sources. Paris est détaillé par arrondissement (le code postal
// 75001…75020 est stable et compréhensible pour les familles).
const REGION_PAR_DEPARTEMENT = {
  Ain: "Auvergne-Rhône-Alpes", Allier: "Auvergne-Rhône-Alpes", Ardèche: "Auvergne-Rhône-Alpes", Cantal: "Auvergne-Rhône-Alpes", Drôme: "Auvergne-Rhône-Alpes", Isère: "Auvergne-Rhône-Alpes", Loire: "Auvergne-Rhône-Alpes", "Haute-Loire": "Auvergne-Rhône-Alpes", "Puy-de-Dôme": "Auvergne-Rhône-Alpes", Rhône: "Auvergne-Rhône-Alpes", Savoie: "Auvergne-Rhône-Alpes", "Haute-Savoie": "Auvergne-Rhône-Alpes",
  Côte: "Bourgogne-Franche-Comté", "Côte-d'Or": "Bourgogne-Franche-Comté", Doubs: "Bourgogne-Franche-Comté", Jura: "Bourgogne-Franche-Comté", Nièvre: "Bourgogne-Franche-Comté", "Haute-Saône": "Bourgogne-Franche-Comté", Saône: "Bourgogne-Franche-Comté", "Saône-et-Loire": "Bourgogne-Franche-Comté", Territoire: "Bourgogne-Franche-Comté", "Territoire de Belfort": "Bourgogne-Franche-Comté", Yonne: "Bourgogne-Franche-Comté",
  "Côtes-d'Armor": "Bretagne", Finistère: "Bretagne", Ille: "Bretagne", "Ille-et-Vilaine": "Bretagne", Morbihan: "Bretagne",
  Cher: "Centre-Val de Loire", "Eure-et-Loir": "Centre-Val de Loire", Indre: "Centre-Val de Loire", "Indre-et-Loire": "Centre-Val de Loire", Loir: "Centre-Val de Loire", "Loir-et-Cher": "Centre-Val de Loire", Loiret: "Centre-Val de Loire",
  "Corse-du-Sud": "Corse", "Haute-Corse": "Corse",
  Ardennes: "Grand Est", Aube: "Grand Est", Marne: "Grand Est", "Haute-Marne": "Grand Est", Meurthe: "Grand Est", "Meurthe-et-Moselle": "Grand Est", Meuse: "Grand Est", Moselle: "Grand Est", Bas: "Grand Est", "Bas-Rhin": "Grand Est", Haut: "Grand Est", "Haut-Rhin": "Grand Est", Vosges: "Grand Est",
  "Paris": "Île-de-France", "Seine-et-Marne": "Île-de-France", Yvelines: "Île-de-France", Essonne: "Île-de-France", "Hauts-de-Seine": "Île-de-France", "Seine-Saint-Denis": "Île-de-France", "Val-de-Marne": "Île-de-France", "Val-d'Oise": "Île-de-France",
  Calvados: "Normandie", Eure: "Normandie", Manche: "Normandie", Orne: "Normandie", "Seine-Maritime": "Normandie",
  Charente: "Nouvelle-Aquitaine", "Charente-Maritime": "Nouvelle-Aquitaine", Corrèze: "Nouvelle-Aquitaine", Creuse: "Nouvelle-Aquitaine", Dordogne: "Nouvelle-Aquitaine", Gironde: "Nouvelle-Aquitaine", Landes: "Nouvelle-Aquitaine", "Lot-et-Garonne": "Nouvelle-Aquitaine", "Pyrénées-Atlantiques": "Nouvelle-Aquitaine", "Deux-Sèvres": "Nouvelle-Aquitaine", Vienne: "Nouvelle-Aquitaine", "Haute-Vienne": "Nouvelle-Aquitaine",
  Ariège: "Occitanie", Aude: "Occitanie", Aveyron: "Occitanie", Gard: "Occitanie", "Haute-Garonne": "Occitanie", Gers: "Occitanie", Hérault: "Occitanie", Lot: "Occitanie", Lozère: "Occitanie", "Hautes-Pyrénées": "Occitanie", "Pyrénées-Orientales": "Occitanie", Tarn: "Occitanie", "Tarn-et-Garonne": "Occitanie",
  "Loire-Atlantique": "Pays de la Loire", Maine: "Pays de la Loire", "Maine-et-Loire": "Pays de la Loire", Mayenne: "Pays de la Loire", Sarthe: "Pays de la Loire", Vendée: "Pays de la Loire",
  "Alpes-de-Haute-Provence": "Provence-Alpes-Côte d'Azur", "Hautes-Alpes": "Provence-Alpes-Côte d'Azur", "Alpes-Maritimes": "Provence-Alpes-Côte d'Azur", Bouches: "Provence-Alpes-Côte d'Azur", "Bouches-du-Rhône": "Provence-Alpes-Côte d'Azur", Var: "Provence-Alpes-Côte d'Azur", Vaucluse: "Provence-Alpes-Côte d'Azur",
  Guadeloupe: "Guadeloupe", Martinique: "Martinique", Guyane: "Guyane", "La Réunion": "La Réunion", Mayotte: "Mayotte", "Saint-Martin": "Saint-Martin", "Saint-Barthélémy": "Saint-Barthélémy", "St-Pierre-et-Miquelon": "St-Pierre-et-Miquelon", "Nouvelle Calédonie": "Nouvelle Calédonie",
};
function nomRegion(departement) { return REGION_PAR_DEPARTEMENT[departement] ?? departement; }
function nomQuartierParis(etablissement) {
  const code = String(etablissement.code_postal ?? "");
  const arrondissement = Number(code.slice(3));
  return etablissement.departement === "Paris" && arrondissement >= 1 && arrondissement <= 20
    ? `${arrondissement}e arrondissement`
    : "Paris (arrondissement non précisé)";
}

// Suivi GoatCounter : un seul événement "carte-interaction" par visite, à la
// première interaction réelle avec la carte (clic sur un marqueur ou une
// bulle département). sessionStorage (pas localStorage) : on veut mesurer
// l'engagement PAR VISITE, pas seulement à la toute première visite du site.
// Passe par trackEvent() (src/utils/analytics.js) comme tous les autres
// événements custom de l'app, pour rester regroupé de façon cohérente dans
// le tableau de bord GoatCounter (même préfixe "event:", même format).
const CLE_INTERACTION_ENVOYEE = "trajectoires:carte-interaction-envoyee";
function suivreInteractionCarte() {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(CLE_INTERACTION_ENVOYEE)) return;
  sessionStorage.setItem(CLE_INTERACTION_ENVOYEE, "1");
  trackEvent("carte-interaction");
}

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
  const count = cluster.getAllChildMarkers().reduce((total, marqueur) => total + (marqueur.options.nbEtablissements ?? 1), 0);
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
  const taille = estMobile ? 54 : 64;
  const couleur = couleurDegradeIPS(dept.ipsMoyen);
  return L.divIcon({
    html: `<div style="
      width:${taille}px;height:${taille}px;border-radius:50%;
      background:#FAF7F0;border:6px solid ${couleur};
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:'Inter',sans-serif;color:#12203A;text-align:center;padding:4px;
      box-shadow:0 3px 8px rgba(18,32,58,0.2);cursor:pointer;
    ">
      <span style="font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:${estMobile ? 15 : 17}px;line-height:1;">${dept.count}</span>
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

function RecentrageSurCommune({ commune, etablissements }) {
  const map = useMap();
  const cle = commune ? `${commune.departement}|${commune.nom}` : null;
  const dernierCadrage = useRef(null);
  useEffect(() => {
    if (!cle) { dernierCadrage.current = null; return; }
    if (dernierCadrage.current === cle) return;
    const points = etablissements.filter(e => Number.isFinite(e.latitude) && Number.isFinite(e.longitude));
    if (!points.length) return;
    map.flyToBounds(L.latLngBounds(points.map(e => [e.latitude, e.longitude])), {
      paddingTopLeft: window.innerWidth < 768 ? [24, 180] : [370, 100],
      paddingBottomRight: [24, 80], maxZoom: 14, duration: 0.6,
    });
    dernierCadrage.current = cle;
  }, [cle, etablissements, map]);
  return null;
}

function RecentrageSurNavigation({ navigation, sites }) {
  const map = useMap();
  useEffect(() => {
    if (navigation.niveau === "regions") return;
    const points = sites.filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude));
    if (!points.length) return;
    map.flyToBounds(L.latLngBounds(points.map((s) => [s.latitude, s.longitude])), {
      padding: [48, 48], maxZoom: navigation.niveau === "departements" ? 8 : 12, duration: 0.6,
    });
  }, [navigation, sites, map]);
  return null;
}

function CadrageInitial({ bounds }) {
  const map = useMap();
  const [fait, setFait] = useState(false);
  useEffect(() => {
    if (fait || !bounds) return;
    map.fitBounds(bounds, { paddingTopLeft: [24, 170], paddingBottomRight: [24, 70], maxZoom: ZOOM_FRANCE });
    setFait(true);
  }, [bounds, map, fait]);
  return null;
}

function RecentrageSurDepartement({ departement, sitesDuDepartement, retourVersion }) {
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
      map.flyToBounds(BOUNDS_METROPOLE, { paddingTopLeft: [24, 170], paddingBottomRight: [24, 70], maxZoom: ZOOM_FRANCE, duration: 0.6 });
      return;
    }
    if (bounds) {
      map.flyToBounds(bounds, { padding: [40, 40], duration: 0.6, maxZoom: 13 });
    }
  }, [departement, bounds, map, retourVersion]);

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

  const [retourVersion, setRetourVersion] = useState(0);
  const [navigation, setNavigation] = useState({ niveau: "regions", valeur: null, parent: null });
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
    return regrouperParSite(etablissements.filter(e => Number.isFinite(e.latitude) && Number.isFinite(e.longitude))).map((site) => {
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

  const agreger = useCallback((sitesSource, clef, libelle) => {
    const groupes = new Map();
    for (const site of sitesSource) {
      const cle = clef(site);
      if (!cle) continue;
      if (!groupes.has(cle)) groupes.set(cle, []);
      groupes.get(cle).push(site);
    }
    return Array.from(groupes.entries()).map(([nom, sitesGroupe]) => {
      const lat = sitesGroupe.reduce((a, s) => a + s.latitude, 0) / sitesGroupe.length;
      const lon = sitesGroupe.reduce((a, s) => a + s.longitude, 0) / sitesGroupe.length;
      const ipsConnus = sitesGroupe.map((s) => s.ipsMoyen).filter((v) => v != null);
      const count = sitesGroupe.reduce((a, s) => a + s.membres.length, 0);
      return { nom: libelle ? libelle(nom) : nom, valeur: nom, latitude: lat, longitude: lon, count, ipsMoyen: ipsConnus.length ? ipsConnus.reduce((a, b) => a + b, 0) / ipsConnus.length : null };
    });
  }, []);

  const regions = useMemo(() => agreger(sites, s => nomRegion(s.departement)), [sites, agreger]);
  const regionSites = useMemo(() => navigation.niveau === "departements" ? sites.filter(s => nomRegion(s.departement) === navigation.valeur) : sites, [sites, navigation]);
  const departements = useMemo(() => agreger(regionSites, s => s.departement), [regionSites, agreger]);
  const parisSites = useMemo(() => sites.filter(s => s.departement === "Paris"), [sites]);
  const quartiersParis = useMemo(() => agreger(parisSites, s => nomQuartierParis(s.membres[0])), [parisSites, agreger]);
  const sitesNavigues = useMemo(() => {
    if (navigation.niveau === "quartiers") return parisSites.filter(s => nomQuartierParis(s.membres[0]) === navigation.valeur);
    if (navigation.niveau === "etablissements" && navigation.parent === "Paris") return parisSites.filter(s => navigation.quartier ? nomQuartierParis(s.membres[0]) === navigation.quartier : true);
    if (navigation.niveau === "etablissements") return sites.filter(s => s.departement === navigation.valeur);
    return sites;
  }, [navigation, sites, parisSites]);

  const boundsFrance = BOUNDS_METROPOLE;

  const sitesDuDepartementFiltre = useMemo(
    () => sites.filter((s) => s.departement === filtres.departement),
    [sites, filtres.departement]
  );

  const etablissementSelectionne = etablissements.find((e) => e.code_uai === selectionId) ?? null;
  const vueEnsemble = !filtres.commune && !filtres.rechercheUai && navigation.niveau !== "etablissements";
  const zonesAffichees = navigation.niveau === "regions" ? regions : navigation.niveau === "departements" ? departements : navigation.niveau === "quartiers" ? quartiersParis : [];
  const sitesVisibles = useMemo(() => {
    if (vueEnsemble || !viewportBounds) return sitesNavigues;
    return sitesNavigues.filter((site) => {
      if (site.membres.some((m) => m.code_uai === selectionId)) return true;
      return viewportBounds.contains([site.latitude, site.longitude]);
    });
  }, [sitesNavigues, viewportBounds, vueEnsemble, selectionId]);
  const handleViewportChange = useCallback((bounds) => setViewportBounds(bounds), []);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-none md:rounded-2xl md:shadow-panel">
      <MapContainer center={CENTRE_FRANCE} zoom={ZOOM_FRANCE} className="h-full w-full" zoomControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_2h8i_1_e62007e74f2676dbb792a934" attribution='&copy; OpenStreetMap contributors &copy; CARTO' />

        {vueEnsemble ? (
          <>
          {zonesAffichees.map((zone) => (
            <Marker key={zone.nom} nbEtablissements={zone.count} ips={zone.ipsMoyen} position={[zone.latitude, zone.longitude]} icon={creerIconeDepartement(zone, estMobile)} eventHandlers={{ click: () => {
              suivreInteractionCarte();
              if (navigation.niveau === "regions") setNavigation({ niveau: "departements", valeur: zone.valeur, parent: null });
              else if (navigation.niveau === "departements") {
                if (zone.valeur === "Paris") setNavigation({ niveau: "quartiers", valeur: "Paris", parent: zone.valeur });
                else { setFiltre("departement", zone.valeur); setNavigation({ niveau: "etablissements", valeur: zone.valeur, parent: navigation.valeur }); }
              } else if (navigation.niveau === "quartiers") setNavigation({ niveau: "etablissements", valeur: "Paris", parent: "Paris", quartier: zone.valeur });
            } }}>
              <Tooltip direction="top" offset={[0, -12]} opacity={1}>
                <div className="font-body text-sm">
                  <p className="font-semibold text-encre-950">{zone.nom}</p>
                  <p className="text-encre-600">{zone.count} établissements</p>
                  {zone.ipsMoyen != null && <p className="text-encre-400">IPS moyen&nbsp;: <span className="font-mono">{Math.round(zone.ipsMoyen)}</span></p>}
                </div>
              </Tooltip>
            </Marker>
          ))}
          </>
        ) : (
          <MarkerClusterGroup key="etablissements" chunkedLoading chunkInterval={100} chunkDelay={25} iconCreateFunction={creerIconeCluster} maxClusterRadius={rayonCluster} disableClusteringAtZoom={SEUIL_DECLUSTERING} spiderfyOnMaxZoom removeOutsideVisibleBounds>
            {sitesVisibles.map((site) => {
              const estSiteSelectionne = site.membres.some((m) => m.code_uai === selectionId);
              const principal = site.membres.find((m) => m.code_uai === selectionId) ?? site.membres[0];
              return (
                <Marker key={site.site_key} position={[site.latitude, site.longitude]} icon={creerIcone(site, estSiteSelectionne, bornesEffectif[0], bornesEffectif[1])} ips={site.ipsMoyen} eventHandlers={{ click: () => { suivreInteractionCarte(); selectionnerEtablissement(principal.code_uai); } }}>
                  <Tooltip direction="top" offset={[0, -12]} opacity={1}>
                    <div className="font-body text-sm">
                      {site.membres.length === 1 ? (
                        <><p className="font-semibold text-encre-950">{principal.nom_etablissement}</p><p className="text-encre-600">{principal.commune}</p><p className="text-encre-400">{principal.ips_etablissement != null ? <>IPS&nbsp;: <span className="font-mono">{principal.ips_etablissement}</span></> : "IPS non publié"}{principal.effectif_total != null && <> · {principal.effectif_total} élèves</>}</p></>
                      ) : (
                        <><p className="font-semibold text-encre-950">{site.membres.length} établissements à cette adresse</p><p className="text-encre-600">{principal.commune}</p><ul className="mt-1 list-disc pl-4">{site.membres.map((m) => <li key={m.code_uai}>{m.type_etablissement} — {m.nom_etablissement}{m.ips_etablissement != null && ` (IPS ${m.ips_etablissement})`}</li>)}</ul></>
                      )}
                    </div>
                  </Tooltip>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        )}

        <CadrageInitial bounds={boundsFrance} />
        <RecentrageSurDepartement retourVersion={retourVersion} departement={filtres.departement} sitesDuDepartement={sitesDuDepartementFiltre} />
        <RecentrageSurNavigation navigation={navigation} sites={navigation.niveau === "regions" ? sites : navigation.niveau === "departements" ? regionSites : navigation.niveau === "quartiers" ? parisSites : sitesNavigues} />
        <RecentrageSurCommune commune={filtres.commune} etablissements={etablissements} />
        <RecentrerSurSelection etablissement={etablissementSelectionne} />
        <SuiviZoom onZoomChange={setZoomActuel} />
        {!vueEnsemble && <SuiviViewport onViewportChange={handleViewportChange} marge={margeViewport} />}
      </MapContainer>

      <div className="pointer-events-none absolute inset-0 z-[900]">
        <div className="absolute inset-x-0 top-0 h-7 bg-gradient-to-b from-sable-100/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-sable-100/70 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-7 bg-gradient-to-r from-sable-100/70 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-7 bg-gradient-to-l from-sable-100/70 to-transparent" />
      </div>

      <div className="absolute bottom-12 left-3 z-[1000] flex max-w-[calc(100%-5rem)] gap-2 md:left-[340px]">
        {navigation.niveau !== "regions" && <button onClick={() => { setFiltre("departement", "Tous"); setNavigation(navigation.niveau === "etablissements" ? (navigation.parent === "Paris" ? { niveau: "quartiers", valeur: "Paris", parent: "Paris" } : { niveau: "departements", valeur: navigation.parent, parent: null }) : navigation.niveau === "quartiers" ? { niveau: "departements", valeur: "Île-de-France", parent: null } : { niveau: "regions", valeur: null, parent: null }); }} className="rounded-full bg-sable-50 px-3 py-2 text-xs font-semibold text-encre-950 shadow-panel">← Niveau précédent</button>}
        <button onClick={() => { setFiltre("departement", "Tous"); setRetourVersion(v => v + 1); }} className="rounded-full bg-sable-50 px-3 py-2 text-xs font-semibold text-encre-950 shadow-panel">Vue France</button>
        <select aria-label="Afficher un territoire ultramarin" value={["Guadeloupe", "Martinique", "Guyane", "La Réunion", "Mayotte", "Saint-Martin", "Saint-Barthélémy", "St-Pierre-et-Miquelon", "Nouvelle Calédonie"].includes(filtres.departement) ? filtres.departement : ""} onChange={e => { setFiltre("departement", e.target.value || "Tous"); setRetourVersion(v => v + 1); }} className="min-w-0 max-w-44 rounded-full bg-sable-50 px-3 py-2 text-sm text-encre-950 shadow-panel">
          <option value="">Outre-mer</option>
          {["Guadeloupe", "Martinique", "Guyane", "La Réunion", "Mayotte", "Saint-Martin", "Saint-Barthélémy", "St-Pierre-et-Miquelon", "Nouvelle Calédonie"].filter(nom => filtres.departementsDisponibles.includes(nom)).map(nom => <option key={nom} value={nom}>{nom}</option>)}
        </select>
      </div>
      <div className="absolute right-4 top-16 z-[1000] hidden rounded-xl bg-sable-50/95 px-3 py-1.5 font-mono text-xs text-encre-600 shadow-panel md:block">
        {etablissements.length} établissements
      </div>
    </div>
  );
}
