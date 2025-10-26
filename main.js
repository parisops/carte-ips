let map = null;
let markersCluster = null;
let allSchools;
let filteredSchools;
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

const IPSCOLORS = new Map([
  [90, "#d32f2f"],
  [105, "#f57c00"],
  [120, "#fbc02d"],
  [130, "#7cb342"]
]);

function getColor(ips) {
  if (ips < 90) return "#d32f2f";
  if (ips < 105) return "#f57c00";
  if (ips < 120) return "#fbc02d";
  if (ips < 130) return "#7cb342";
  return "#388e3c";
}

async function init() {
  initMap();
  await loadData();
  setupEventListeners();
  populateFilters();
  applyFilters();
}

function initMap() {
  map = L.map("map");

  // Zoom initial uniquement sur Île-de-France
  // Latitude moyenne Île-de-France ~48.7, Longitude ~2.5, Zoom 9 par exemple
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
  const [ipsEcoles, ipsColleges, ipsLycees, localisations, effectifs] = await Promise.all([
    fetch("data/ips-ecoles.json").then(r => r.json()),
    fetch("data/ips-colleges.json").then(r => r.json()),
    fetch("data/ips-lycees.json").then(r => r.json()),
    fetch("data/localisations.json").then(r => r.json()),
    fetch("data/effectifs.json").then(r => r.json())
  ]);

  // Traitement simplifié des données omitted for brevity...
}

function createDetailedPopup(school) {
  let color = getColor(school.ips);

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

// Le reste du fichier main.js reste inchangé

document.addEventListener("DOMContentLoaded", init);
