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
  lycees: ['LYCEE ENSEIGNT GENERAL ET TECHNOLOGIQUE', 'LYCEE POLYVALENT', 'LYCEE PROFESSIONNEL', 'LYCEE D ENSEIGNEMENT GENERAL']
};

/*
const IPS_COLORS = {
  getColor: (ips) => {
    if (ips < 90) return '#d32f2f';
    if (ips < 105) return '#f57c00';
    if (ips < 120) return '#fbc02d';
    if (ips < 130) return '#7cb342';
    return '#388e3c';
  }
};*/

const IPS_COLORS = {
  getColor: (ips) => {
    if (ips < 90) return '#800000';        // rouge foncé très défavorisé
    if (ips < 105) return '#b22222';       // rouge moins foncé
    if (ips < 120) return '#ff6347';       // rouge clair (tomate)
    if (ips < 130) return '#4169e1';       // bleu royal, plus foncé
    return '#00008b';                      // bleu marine très foncé
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
  map = L.map('map').setView([46.8, 2.3], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
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
      denom: loc.denomination_principale || e.denomination_principale || '',
      appellation: loc.appellation_officielle || '',
      sector: loc.secteur_public_prive_libe || 'Public',
      commune: loc.libelle_commune || '',
      departement: loc.libelle_departement || '',
      nombre_total_eleves: eff.nombre_total_eleves || null,
      nombre_total_classes: eff.nombre_total_classes || null,
      ips_national: e.ips_national,
      ips_academique: e.ips_academique,
      ips_departemental: e.ips_departemental,
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
  zoomToFiltered();
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
        html: `<div class="marker-square" style="background-color:${color};"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -7],
      });
      marker = L.marker([school.latitude, school.longitude], { icon });
    } else if (type.includes('lycée')) {
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-diamond" style="background-color:${color};"></div>`,
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
  let html = `<div class="popup-title">${escapeHtml(school.denom || school.appellation || school.uai)}</div>`;
  html += `<div class="popup-info">${escapeHtml(school.type)} • ${escapeHtml(school.sector)}</div>`;
  html += `<div class="popup-info">${escapeHtml(school.commune)}, ${escapeHtml(school.departement)}</div>`;
  html += `<div class="popup-divider"></div>`;
  const color = IPS_COLORS.getColor(school.ips);
  html += `<div class="popup-main-ips" style="background-color: ${color}20; border: 1px solid ${color}50;">IPS : ${school.ips.toFixed(1)}</div>`;
  if (school.nombre_total_eleves !== null && school.nombre_total_classes !== null) {
    html += `<div class="popup-compact-row"><span>👥 Élèves | Classes :</span> <span>${school.nombre_total_eleves} | ${school.nombre_total_classes}</span></div>`;
  }
  return html;
}

function updateStatistics() {
  const total = filteredSchools.length;
  document.getElementById('statTotal').textContent = total;
  if (total === 0) {
    document.getElementById('statAvg').textContent = '-';
    document.getElementById('statMin').textContent = '-';
    document.getElementById('statMax').textContent = '-';
    document.getElementById('statPublic').textContent = '0';
    document.getElementById('statPrivate').textContent = '0';
    return;
  }
  let ipsValues = filteredSchools.map(s => s.ips);
  let avg = ipsValues.reduce((a, b) => a + b, 0) / total;
  let min = Math.min(...ipsValues);
  let max = Math.max(...ipsValues);
  let pubCount = filteredSchools.filter(s => s.sector.toLowerCase().includes('public')).length;
  let privCount = filteredSchools.filter(s => s.sector.toLowerCase().includes('privé')).length;
  document.getElementById('statAvg').textContent = avg.toFixed(1);
  document.getElementById('statMin').textContent = min.toFixed(1);
  document.getElementById('statMax').textContent = max.toFixed(1);
  document.getElementById('statPublic').textContent = pubCount;
  document.getElementById('statPrivate').textContent = privCount;
}

function zoomToFiltered() {
  if (filteredSchools.length === 0) return;
  let bounds = L.latLngBounds(filteredSchools.map(s => [s.latitude, s.longitude]));
  map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
}

function setupEventListeners() {
  document.getElementById('ecolesCheck').addEventListener('change', e => {
    currentFilters.types.ecoles = e.target.checked;
    applyFilters();
  });
  document.getElementById('collegesCheck').addEventListener('change', e => {
    currentFilters.types.colleges = e.target.checked;
    applyFilters();
  });
  document.getElementById('lyceesLEGTCheck').addEventListener('change', e => {
    currentFilters.types.lyceesLEGT = e.target.checked;
    applyFilters();
  });
  document.getElementById('lyceesLPOCheck').addEventListener('change', e => {
    currentFilters.types.lyceesLPO = e.target.checked;
    applyFilters();
  });
  document.getElementById('lyceesLPCheck').addEventListener('change', e => {
    currentFilters.types.lyceesLP = e.target.checked;
    applyFilters();
  });
  document.getElementById('lyceesAutresCheck').addEventListener('change', e => {
    currentFilters.types.lyceesAutres = e.target.checked;
    applyFilters();
  });
  document.getElementById('regionFilter').addEventListener('change', e => {
    currentFilters.region = e.target.value;
    updateDepartmentFilter();
    applyFilters();
  });
  document.getElementById('departmentFilter').addEventListener('change', e => {
    currentFilters.department = e.target.value;
    applyFilters();
  });
  document.getElementById('publicCheck').addEventListener('change', e => {
    currentFilters.sectors.public = e.target.checked;
    applyFilters();
  });
  document.getElementById('privateCheck').addEventListener('change', e => {
    currentFilters.sectors.private = e.target.checked;
    applyFilters();
  });
  document.getElementById('ipsMin').addEventListener('input', e => {
    let val = parseInt(e.target.value) || 45;
    currentFilters.ipsMin = Math.max(45, Math.min(val, currentFilters.ipsMax));
    e.target.value = currentFilters.ipsMin;
    updateIpsRangeLabel();
    applyFilters();
  });
  document.getElementById('ipsMax').addEventListener('input', e => {
    let val = parseInt(e.target.value) || 185;
    currentFilters.ipsMax = Math.min(185, Math.max(val, currentFilters.ipsMin));
    e.target.value = currentFilters.ipsMax;
    updateIpsRangeLabel();
    applyFilters();
  });
  document.getElementById('resetFilters').addEventListener('click', () => {
    resetFilters();
  });
}

function updateDepartmentFilter() {
  const departmentSelect = document.getElementById('departmentFilter');
  const selectedRegion = currentFilters.region;
  departmentSelect.innerHTML = '<option value="">Tous les départements</option>';

  let departments = [];
  if (selectedRegion) {
    departments = [...new Set(allSchools.filter(s => s.region === selectedRegion).map(s => s.departement))];
  } else {
    departments = [...new Set(allSchools.map(s => s.departement))];
  }

  departments.filter(d => d).sort().forEach(dept => {
    const option = document.createElement('option');
    option.value = dept;
    option.textContent = dept;
    departmentSelect.appendChild(option);
  });

  currentFilters.department = '';
}

function updateIpsRangeLabel() {
  document.getElementById('ipsRangeLabel').textContent = `${currentFilters.ipsMin} - ${currentFilters.ipsMax}`;
}

function resetFilters() {
  currentFilters = {
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

  document.getElementById('ecolesCheck').checked = true;
  document.getElementById('collegesCheck').checked = true;
  document.getElementById('lyceesLEGTCheck').checked = true;
  document.getElementById('lyceesLPOCheck').checked = true;
  document.getElementById('lyceesLPCheck').checked = true;
  document.getElementById('lyceesAutresCheck').checked = true;
  document.getElementById('regionFilter').value = '';
  document.getElementById('departmentFilter').value = '';
  document.getElementById('publicCheck').checked = true;
  document.getElementById('privateCheck').checked = true;
  document.getElementById('ipsMin').value = 45;
  document.getElementById('ipsMax').value = 185;
  updateIpsRangeLabel();
  updateDepartmentFilter();
  map.setView([46.8, 2.3], 6);
  applyFilters();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
