let map = null;
let markersCluster = null;
let allSchools = [];
let filteredSchools = [];
let currentFilters = {
  region: '',
  department: '',
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

const ESTABLISHMENT_TYPES = {
  ecoles: ['ECOLE MATERNELLE', 'ECOLE DE NIVEAU ELEMENTAIRE', 'ECOLE PRIMAIRE'],
  colleges: ['COLLEGE'],
  lycees: [
    'LYCEE ENSEIGNT GENERAL ET TECHNOLOGIQUE',
    'LYCEE POLYVALENT',
    'LYCEE PROFESSIONNEL',
    'LYCEE D ENSEIGNEMENT GENERAL'
  ]
};

const IPS_COLORS = {
  getColor: (ips) => {
    if (ips < 90) return '#d32f2f';
    if (ips < 105) return '#f57c00';
    if (ips < 120) return '#fbc02d';
    if (ips < 130) return '#7cb342';
    return '#388e3c';
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
  map = L.map('map').setView([48.7, 2.5], 9); // Zoom initial centré sur Île-de-France
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(map);
  markersCluster = L.markerClusterGroup({
    maxClusterRadius: 10,
    chunkedLoading: true,
    disableClusteringAtZoom: 14,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
  });
  map.addLayer(markersCluster);
}

async function loadData() {
  const [ipsEcoles, ipsColleges, ipsLycees, localisations, effectifs] = await Promise.all([
    fetch('data/ips-ecoles.json').then(r => r.json()),
    fetch('data/ips-colleges.json').then(r => r.json()),
    fetch('data/ips-lycees.json').then(r => r.json()),
    fetch('data/localisations.json').then(r => r.json()),
    fetch('data/effectifs.json').then(r => r.json()),
  ]);

  const locMap = new Map(localisations.map(l => [l.numero_uai.trim().toUpperCase(), l]));
  const effMap = new Map(effectifs.map(e => [((e.numero_ecole || e.numero_uai) || '').trim().toUpperCase(), e]));

  allSchools = [
    ...processIPSData(ipsEcoles, 'école', 'ips', locMap, effMap),
    ...processIPSData(ipsColleges, 'collège', 'ips', locMap, effMap),
    ...processIPSData(ipsLycees, 'lycée', 'ips_etab', locMap, effMap)
  ];
}

function processIPSData(data, type, ipsField, locMap, effMap) {
  return data.flatMap(e => {
    const uai = (e.uai || e.numero_uai || '').trim().toUpperCase();
    const loc = locMap.get(uai);
    if (!loc || !loc.latitude || !loc.longitude) return [];
    let ipsVal = e[ipsField];
    if (ipsVal === null || ipsVal === undefined || ipsVal === '') return [];
    ipsVal = parseFloat(ipsVal);
    if (isNaN(ipsVal)) return [];
    const eff = effMap.get(uai) || {};
    return [{
      uai,
      type,
      ips: ipsVal,
      latitude: loc.latitude,
      longitude: loc.longitude,
      denomination: loc.denomination_principale || e.denomination_principale || '',
      appellation: loc.appellation_officielle || '',
      patronyme: loc.patronyme_uai || loc.denomination_principale || '',
      sector: loc.secteur_public_prive_libe || 'Public',
      commune: loc.libelle_commune || '',
      departement: loc.libelle_departement || '',
      nombre_total_eleves: eff.nombre_total_eleves || null,
      nombre_total_classes: eff.nombre_total_classes || null,
      ipsdepartemental: e.ips_departemental || null
    }];
  });
}

function populateFilters() {
  const regions = [...new Set(allSchools.map(s => s.region))].filter(r => r).sort();
  const regionSelect = document.getElementById('regionFilter');
  regions.forEach(region => {
    const option = document.createElement('option');
    option.value = region;
    option.textContent = region;
    regionSelect.appendChild(option);
  });
}

function applyFilters() {
  filteredSchools = allSchools.filter(school => {
    const type = school.type ? school.type.toLowerCase() : '';
    const sector = school.sector ? school.sector.toLowerCase() : '';
    if (type.includes('école') && !currentFilters.types.ecoles) return false;
    if (type.includes('collège') && !currentFilters.types.colleges) return false;
    if (type.includes('lycée')) {
      if (school.type.includes('LEGT') && !currentFilters.types.lyceesLEGT) return false;
      if (school.type.includes('LPO') && !currentFilters.types.lyceesLPO) return false;
      if (school.type.includes('LP') && !school.type.includes('LPO') && !currentFilters.types.lyceesLP) return false;
      if (!school.type.includes('LEGT') && !school.type.includes('LPO') && !school.type.includes('LP') && !currentFilters.types.lyceesAutres) return false;
    }
    if (currentFilters.region && school.region !== currentFilters.region) return false;
    if (currentFilters.department && school.departement !== currentFilters.department) return false;
    if (sector.includes('public') && !currentFilters.sectors.public) return false;
    if (sector.includes('privé') && !currentFilters.sectors.private) return false;
    if (school.ips < currentFilters.ipsMin || school.ips > currentFilters.ipsMax) return false;
    return true;
  });
  updateMarkers();
  updateStatistics();
}

function updateMarkers() {
  markersCluster.clearLayers();
  filteredSchools.forEach(school => {
    let marker;
    const color = IPS_COLORS.getColor(school.ips);
    const type = school.type ? school.type.toLowerCase() : '';
    if (type.includes('école')) {
      marker = L.circleMarker([school.latitude, school.longitude], {
        radius: 8,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      });
    } else if (type.includes('collège')) {
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-square" style="background-color:${color}"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -7],
      });
      marker = L.marker([school.latitude, school.longitude], { icon });
    } else if (type.includes('lycée')) {
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-diamond" style="background-color:${color}"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -8],
      });
      marker = L.marker([school.latitude, school.longitude], { icon });
    } else {
      marker = L.circleMarker([school.latitude, school.longitude], {
        radius: 8,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      });
    }
    marker.bindPopup(createDetailedPopup(school));
    markersCluster.addLayer(marker);
  });
}

function createDetailedPopup(school) {
  const color = IPS_COLORS.getColor(school.ips);
  let html = `
    <div class="popup-title">${escapeHtml(school.patronyme || school.denomination)}</div>
    <div class="popup-info">${escapeHtml(school.type || '')} - ${escapeHtml(school.sector || '')}</div>
    <div class="popup-info">${escapeHtml(school.commune || '')}, ${escapeHtml(school.departement || '')}</div>
    <div class="popup-divider"></div>
    <div class="popup-main-ips" style="background-color: ${color}; border: 1px solid ${color}50;">
      IPS: ${school.ips ? school.ips.toFixed(1) : 'N/A'}
    </div>
    <div class="popup-info">
      IPS départemental: ${school.ipsdepartemental ? school.ipsdepartemental.toFixed(1) : 'N/A'}
    </div>
  `;
  if (school.nombre_total_eleves != null && school.nombre_total_classes != null) {
    html += `
      <div class="popup-compact-row">
        <span>Élèves:</span> ${school.nombre_total_eleves}
        <span>Classes:</span> ${school.nombre_total_classes}
      </div>
    `;
  }
  return html;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function setupEventListeners() {
  // Ajoutez ici vos écouteurs d'événements ou filtres
}

function updateStatistics() {
  // Implémentation de la mise à jour des statistiques si nécessaire
}

document.addEventListener('DOMContentLoaded', init);
