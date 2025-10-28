let map = null;
let markers = [];
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

const IPSCOLORS = {
  getColor: function (ips) {
    if (ips < 90) return "#d32f2f";
    if (ips < 105) return "#f57c00";
    if (ips < 120) return "#fbc02d";
    if (ips < 130) return "#7cb342";
    return "#388e3c";
  }
};

async function init() {
  await initMap();
  await loadData();
  setupEventListeners();
  populateFilters();
  applyFilters();
}

async function initMap() {
  // Initialisation de la carte centrée sur l'Ile-de-France avec zoom 6
  map = L.map('map').setView([48.7, 2.5], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: 'OpenStreetMap contributors'
  }).addTo(map);

  // Ajout d'événement pour mise à jour taille markers au zoom
  map.on('zoomend', updateDynamicZoomSizes);
}

// Exemple simplifié : charger des données (à remplacer selon votre logique)
async function loadData() {
  // Placeholders : adapter ces lignes pour charger les données réelles
  // allSchools = await fetch(...).then(r => r.json());
}

function setupEventListeners() {
  // Ajouter gestion des filtres ici
}

function populateFilters() {
  // Remplir listes déroulantes filtres
}

function applyFilters() {
  // Appliquer les filtres et afficher les markers mis à jour
}

function updateMarkers() {
  // Enlever anciens markers
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];

  filteredSchools.forEach(school => {
    const color = IPSCOLORS.getColor(school.ips);
    let icon;
    
    // Styles avec bordures fines pour les différents types
    if (school.typelong.toLowerCase() === "ecole") {
      icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-circle" style="background-color:${color}; border: 1px solid #555;"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -7]
      });
    } else if (school.typelong.toLowerCase() === "college") {
      icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-square" style="background-color:${color}; border: 1px solid #555;"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -7]
      });
    } else if (school.typelong.toLowerCase().includes("lycee")) {
      icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-diamond" style="background-color:${color}; border: 1px solid #555;"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -8]
      });
    } else {
      icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-circle" style="background-color:${color}; border: 1px solid #555;"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -7]
      });
    }

    const marker = L.marker([school.latitude, school.longitude], { icon });
    marker.bindPopup(createDetailedPopup(school));
    marker.addTo(map);
    markers.push(marker);
  });

  updateDynamicZoomSizes();
}

function updateDynamicZoomSizes() {
  const zoom = map.getZoom();
  let size;
  if (zoom <= 6) size = 4;
  else if (zoom === 7) size = 6;
  else if (zoom === 8) size = 8;
  else if (zoom === 9) size = 10;
  else if (zoom === 10) size = 12;
  else size = 14;

  markers.forEach(marker => {
    const el = marker.getElement();
    if (el) {
      const child = el.querySelector('div');
      if (child) {
        child.style.width = size + 'px';
        child.style.height = size + 'px';
      }
    }
  });
}

function createDetailedPopup(school) {
  const color = IPSCOLORS.getColor(school.ips);
  // Construire contenu popup selon données school
  return `<div>
    <strong>${school.denomination}</strong><br />
    Type: ${school.typelong}<br />
    IPS: <span style="color:${color}">${school.ips ? school.ips.toFixed(1) : "N/A"}</span>
  </div>`;
}

// Au chargement DOM, lancer init
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
