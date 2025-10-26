let map = null;
let markersCluster = null;
let allSchools = [];
let filteredSchools = [];
let currentFilters = {
  region: "",
  department: "",
  sectors: { public: true, private: true },
  types: {
    ecoles: true,
    colleges: true,
    lyceesLEGT: true,
    lyceesLPO: true,
    lyceesLP: true,
    lyceesAutres: true
  },
  ipsMin: 45,
  ipsMax: 185
};

const ESTABLISHMENTTYPES = {
  ecoles: ["ECOLE MATERNELLE", "ECOLE DE NIVEAU ELEMENTAIRE", "ECOLE PRIMAIRE"],
  colleges: ["COLLEGE"],
  lycees: [
    "LYCEE ENSEIGNT GENERAL ET TECHNOLOGIQUE",
    "LYCEE POLYVALENT",
    "LYCEE PROFESSIONNEL",
    "LYCEE D ENSEIGNEMENT GENERAL"
  ]
};

const IPSCOLORS = {
  getColor(ips) {
    if (ips < 90) return "#d32f2f";
    if (ips < 105) return "#f57c00";
    if (ips < 120) return "#fbc02d";
    if (ips < 130) return "#7cb342";
    return "#388e3c";
  }
};

async function init() {
  initMap();
  await loadData();
  setupEventListeners();
  populateFilters();
  applyFilters();
}

function initMap() {
  map = L.map("map");
  // Zoom initial sur Île-de-France
  map.setView([48.7, 2.5], 9);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 18
  }).addTo(map);

  markersCluster = L.markerClusterGroup({
    maxClusterRadius: 10,
    chunkedLoading: true,
    disableClusteringAtZoom: 14,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false
  });
  map.addLayer(markersCluster);
}

async function loadData() {
  // Chargement simultané des données
  const [ipsEcoles, ipsColleges, ipsLycees, localisations, effectifs] = await Promise.all([
    fetch("data/ips-ecoles.json").then(r => r.json()),
    fetch("data/ips-colleges.json").then(r => r.json()),
    fetch("data/ips-lycees.json").then(r => r.json()),
    fetch("data/localisations.json").then(r => r.json()),
    fetch("data/effectifs.json").then(r => r.json())
  ]);

  const locMap = new Map(localisations.map(l => [l.numero_uai.trim().toUpperCase(), l]));
  const effMap = new Map(effectifs.map(e => [e.numero_ecole ? e.numero_ecole.trim().toUpperCase() : e.numerouai.trim().toUpperCase(), e]));

  // Fonction pour traiter les données IPS et combiner avec localisations et effectifs
  function processIPSData(data, type, ipsField, locMap, effMap) {
    return data.flatMap(item => {
      // Récupérer l'uai
      const uai = (item.uai || item.numerouai || item.numero_uai || "").trim().toUpperCase();
      if (!uai) return [];

      // Récupérer localisation
      const loc = locMap.get(uai);
      if (!loc || !loc.latitude || !loc.longitude) return [];

      // IPS valeur numérique
      let ipsVal = item[ipsField];
      if (ipsVal === null || ipsVal === undefined) return [];
      ipsVal = parseFloat(ipsVal);
      if (isNaN(ipsVal)) return [];

      // Effectifs
      const eff = effMap.get(uai) || {};

      return [{
        uai: uai,
        type: type,
        ips: ipsVal,
        latitude: loc.latitude,
        longitude: loc.longitude,
        denomination: item.denomination_principale || loc.denomination_principale || "",
        appellation: loc.appellation_officielle || "",
        patronyme: loc.patronyme_uai || loc.denomination_principale || "",
        sector: loc.secteur_public_prive_libe || "Public",
        commune: loc.libelle_commune || "",
        departement: loc.libelle_departement || "",
        nombretotaleleves: eff.nombre_total_eleves || null,
        nombretotalclasses: eff.nombre_total_classes || null,
        ipsdepartemental: item.ips_departemental || null
      }];
    });
  }

  allSchools = [
    ...processIPSData(ipsEcoles, "ecoles", "ips", locMap, effMap),
    ...processIPSData(ipsColleges, "colleges", "ips_etab", locMap, effMap),
    ...processIPSData(ipsLycees, "lycees", "ips_etab", locMap, effMap)
  ];

  updateMarkers();
  populateFilters();
}

function updateMarkers() {
  markersCluster.clearLayers();

  filteredSchools.forEach(school => {
    const color = IPSCOLORS.getColor(school.ips);
    const type = (school.type || "").toLowerCase();

    let marker;
    if (type.includes("ecole")) {
      marker = L.circleMarker([school.latitude, school.longitude], {
        radius: 8,
        fillColor: color,
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
      });
    } else if (type.includes("college")) {
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-square" style="background-color:${color}"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -7]
      });
      marker = L.marker([school.latitude, school.longitude], { icon });
    } else if (type.includes("lycee")) {
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-diamond" style="background-color:${color}"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -8]
      });
      marker = L.marker([school.latitude, school.longitude], { icon });
    } else {
      marker = L.circleMarker([school.latitude, school.longitude], {
        radius: 8,
        fillColor: color,
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
      });
    }

    marker.bindPopup(createDetailedPopup(school));
    markersCluster.addLayer(marker);
  });

  // Mise à jour du centre de la carte sur filtre (optionnel)
  // map.fitBounds(markersCluster.getBounds());
}

function createDetailedPopup(school) {
  const color = IPSCOLORS.getColor(school.ips);

  let html = `
    <div class="popup-title">${escapeHtml(school.patronyme || school.denomination)}</div>
    <div class="popup-info">${escapeHtml(school.type || "")} - ${escapeHtml(school.sector || "")}</div>
    <div class="popup-info">${escapeHtml(school.commune || "")}, ${escapeHtml(school.departement || "")}</div>
    <div class="popup-divider"></div>
    <div class="popup-main-ips" style="background-color: ${color}; border: 1px solid ${color}50;">
      IPS: ${school.ips ? school.ips.toFixed(1) : "N/A"}
    </div>
    <div class="popup-info">
      IPS départemental: ${school.ipsdepartemental ? school.ipsdepartemental.toFixed(1) : "N/A"}
    </div>
  `;

  if (school.nombretotaleleves != null && school.nombretotalclasses != null) {
    html += `
      <div class="popup-compact-row">
        <span>Élèves:</span> ${school.nombretotaleleves} 
        <span>Classes:</span> ${school.nombretotalclasses}
      </div>
    `;
  }
  return html;
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function setupEventListeners() {
  // Ajoutez ici vos écouteurs d'événements ou filtres
  // ...
}

function populateFilters() {
  // Exemple simplifié d'affichage des régions pour un filtre
  const regionSelect = document.getElementById("regionFilter");
  if (!regionSelect) return;
  const regions = [...new Set(allSchools.map(s => s.region))].sort();
  regions.forEach(region => {
    const option = document.createElement("option");
    option.value = region;
    option.textContent = region;
    regionSelect.appendChild(option);
  });
}

function applyFilters() {
  filteredSchools = allSchools.filter(school => {
    if (!school) return false;

    // Filtrage par type
    const type = (school.type || "").toLowerCase();
    if (type.includes("ecole") && !currentFilters.types.ecoles) return false;
    if (type.includes("college") && !currentFilters.types.colleges) return false;
    if (type.includes("lycee")) {
      if (school.type.includes("LEGT") && !currentFilters.types.lyceesLEGT) return false;
      if (school.type.includes("LPO") && !currentFilters.types.lyceesLPO) return false;
      if (school.type.includes("LP") && !currentFilters.types.lyceesLP) return false;
    }

    // Filtrage géographique
    if (currentFilters.region && school.region !== currentFilters.region) return false;
    if (currentFilters.department && school.departement !== currentFilters.department) return false;

    // Secteur public/privé
    const sector = (school.sector || "").toLowerCase();
    if (sector.includes("public") && !currentFilters.sectors.public) return false;
    if (sector.includes("priv") && !currentFilters.sectors.private) return false;

    // Filtrage IPS
    if (school.ips < currentFilters.ipsMin || school.ips > currentFilters.ipsMax) return false;

    return true;
  });

  updateMarkers();
  updateStatistics();
}

function updateStatistics() {
  const total = filteredSchools.length;
  document.getElementById("statTotal").textContent = total;
  if (total === 0) {
    document.getElementById("statAvg").textContent = "-";
    document.getElementById("statMin").textContent = "-";
    document.getElementById("statMax").textContent = "-";
    document.getElementById("statPublic").textContent = 0;
    document.getElementById("statPrivate").textContent = 0;
    return;
  }

  const ipsValues = filteredSchools.map(s => s.ips);
  const avg = ipsValues.reduce((a,b) => a + b, 0) / total;
  const min = Math.min(...ipsValues);
  const max = Math.max(...ipsValues);
  const pubCount = filteredSchools.filter(s => (s.sector || "").toLowerCase().includes("public")).length;
  const privCount = filteredSchools.filter(s => (s.sector || "").toLowerCase().includes("priv")).length;

  document.getElementById("statAvg").textContent = avg.toFixed(1);
  document.getElementById("statMin").textContent = min.toFixed(1);
  document.getElementById("statMax").textContent = max.toFixed(1);
  document.getElementById("statPublic").textContent = pubCount;
  document.getElementById("statPrivate").textContent = privCount;
}

document.addEventListener("DOMContentLoaded", init);
