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
  map = L.map('map').setView([48.7, 2.5], 6); // Zoom initial sur IDF, plus large pour voir tous les points
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
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
  map.on('zoomend', updateDynamicZoomClasses);
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
      region: loc.code_region ? loc.libelle_region : "",
      departement: loc.libelle_departement || "",
      ips: ipsVal,
      latitude: loc.latitude,
      longitude: loc.longitude,
      denomination: loc.denomination_principale || e.denomination_principale || '',
      appellation: loc.appellation_officielle || '',
      patronyme: loc.patronyme_uai || loc.denomination_principale || '',
      sector: loc.secteur_public_prive_libe || 'Public',
      commune: loc.libelle_commune || "",
      nombre_total_eleves: eff.nombre_total_eleves || null,
      nombre_total_classes: eff.nombre_total_classes || null,
      ipsdepartemental: e.ips_departemental || null,
      type_long: type
    }];
  });
}

function setupEventListeners() {
  ['ecoles', 'colleges', 'lyceesLEGT', 'lyceesLPO', 'lyceesLP', 'lyceesAutres'].forEach(type => {
    document.getElementById(type + 'Check').addEventListener('change', e => {
      currentFilters.types[type] = e.target.checked;
      applyFilters();
    });
  });
  document.getElementById('publicCheck').addEventListener('change', e => { currentFilters.sectors.public = e.target.checked; applyFilters(); });
  document.getElementById('privateCheck').addEventListener('change', e => { currentFilters.sectors.private = e.target.checked; applyFilters(); });
  document.getElementById('regionFilter').addEventListener('change', e => { currentFilters.region = e.target.value; updateDepartmentFilter(); applyFilters(); });
  document.getElementById('departmentFilter').addEventListener('change', e => { currentFilters.department = e.target.value; applyFilters(); });
  document.getElementById('ipsMin').addEventListener('input', e => { currentFilters.ipsMin = parseInt(e.target.value); updateIpsRangeLabel(); applyFilters(); });
  document.getElementById('ipsMax').addEventListener('input', e => { currentFilters.ipsMax = parseInt(e.target.value); updateIpsRangeLabel(); applyFilters(); });
  document.getElementById('resetFilters').addEventListener('click', resetFilters);
}

function updateDepartmentFilter() {
  const departmentSelect = document.getElementById('departmentFilter');
  const selectedRegion = currentFilters.region;
  departmentSelect.innerHTML = `<option value="">Tous les départements</option>`;
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
}

function populateFilters() {
  const regions = [...new Set(allSchools.map(s => s.region))].filter(r => r).sort();
  const regionSelect = document.getElementById('regionFilter');
  regionSelect.innerHTML = `<option value="">Toutes les régions</option>`;
  regions.forEach(region => {
    const option = document.createElement('option');
    option.value = region;
    option.textContent = region;
    regionSelect.appendChild(option);
  });
  updateDepartmentFilter();
}

function updateIpsRangeLabel() {
  document.getElementById('ipsRangeLabel').textContent = `${currentFilters.ipsMin} - ${currentFilters.ipsMax}`;
}

function resetFilters() {
  currentFilters = {
    region: '',
    department: '',
    sectors: { public: true, private: true },
    types: { ecoles: true, colleges: true, lyceesLEGT: true, lyceesLPO: true, lyceesLP: true, lyceesAutres: true },
    ipsMin: 45,
    ipsMax: 185
  };
  ['ecoles', 'colleges', 'lyceesLEGT', 'lyceesLPO', 'lyceesLP', 'lyceesAutres'].forEach(type =>
    document.getElementById(type + 'Check').checked = true
  );
  document.getElementById('regionFilter').value = "";
  updateDepartmentFilter();
  document.getElementById('departmentFilter').value = "";
  document.getElementById('publicCheck').checked = true;
  document.getElementById('privateCheck').checked = true;
  document.getElementById('ipsMin').value = 45;
  document.getElementById('ipsMax').value = 185;
  updateIpsRangeLabel();
  map.setView([48.7, 2.5], 6);
  applyFilters();
}

function applyFilters() {
  filteredSchools = allSchools.filter(school => {
    if (!school) return false;
    const type = (school.type_long || "").toLowerCase();
    if (type === 'école' && !currentFilters.types.ecoles) return false;
    if (type === 'collège' && !currentFilters.types.colleges) return false;
    if (type === 'lycée') {
      if (school.denomination && school.denomination.includes('ENSEIGNT GENERAL ET TECHNOLOGIQUE') && !currentFilters.types.lyceesLEGT) return false;
      if (school.denomination && school.denomination.includes('POLYVALENT') && !currentFilters.types.lyceesLPO) return false;
      if (school.denomination && school.denomination.includes('PROFESSIONNEL') && !currentFilters.types.lyceesLP) return false;
      if (!(school.denomination && (school.denomination.includes('ENSEIGNT GENERAL ET TECHNOLOGIQUE') || school.denomination.includes('POLYVALENT') || school.denomination.includes('PROFESSIONNEL'))) && !currentFilters.types.lyceesAutres) return false;
    }
    if (currentFilters.region && school.region !== currentFilters.region) return false;
    if (currentFilters.department && school.departement !== currentFilters.department) return false;
    const sector = (school.sector || "").toLowerCase();
    if (sector.includes('public') && !currentFilters.sectors.public) return false;
    if (sector.includes('priv') && !currentFilters.sectors.private) return false;
    if (school.ips < currentFilters.ipsMin || school.ips > currentFilters.ipsMax) return false;
    return true;
  });
  updateMarkers();
  updateStatistics();
}

function updateMarkers() {
  markersCluster.clearLayers();
  filteredSchools.forEach(school => {
    const color = IPS_COLORS.getColor(school.ips);
    const type = school.type_long;
    let icon;
    if (type === 'école') {
      icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-circle" style="background-color:${color}"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -7]
      });
    } else if (type === 'collège') {
      icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-square" style="background-color:${color}"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -7]
      });
    } else if (type === 'lycée') {
      icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-diamond" style="background-color:${color}"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -8]
      });
    } else {
      icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-circle" style="background-color:${color}"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -7]
      });
    }
    const marker = L.marker([school.latitude, school.longitude], { icon });
    marker.bindPopup(createDetailedPopup(school));
    markersCluster.addLayer(marker);
  });
  updateDynamicZoomClasses();
}

function updateDynamicZoomClasses() {
  if (!map || !map._container) return;
  const zoom = map.getZoom();
  for (let i = 6; i <= 18; i++) map._container.classList.remove('leaflet-zoom-' + i);
  map._container.classList.add('leaflet-zoom-' + zoom);
}

function createDetailedPopup(school) {
  const color = IPS_COLORS.getColor(school.ips);
  const ipsDepartementalNum = parseFloat(school.ipsdepartemental);
  const ipsDepartementalText = !isNaN(ipsDepartementalNum) ? ipsDepartementalNum.toFixed(1) : "N/A";
  let html = `
    <div class="popup-title">${escapeHtml(school.patronyme || school.denomination || "")}</div>
    <div class="popup-info">${escapeHtml(school.denomination || school.type_long || "")} - ${escapeHtml(school.sector || '')}</div>
    <div class="popup-info">${escapeHtml(school.commune || '')}, ${escapeHtml(school.departement || '')}</div>
    <div class="popup-divider"></div>
    <div class="popup-main-ips" style="background-color: ${color}; color:#222; border: 1px solid #eee;">
      IPS: <span style="font-weight:bold;color:#222">${school.ips ? school.ips.toFixed(1) : 'N/A'}</span>
    </div>
    <div class="popup-info" style="color:#222">
      IPS départemental: <span style="font-weight:bold; color:#222">${ipsDepartementalText}</span>
    </div>
  `;
  if (school.nombre_total_eleves != null && school.nombre_total_classes != null) {
    html += `
      <div class="popup-compact-row">
        <span>Élèves:</span> <strong>${school.nombre_total_eleves}</strong>
        <span>Classes:</span> <strong>${school.nombre_total_classes}</strong>
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

function updateStatistics() {
  const total = filteredSchools.length;
  document.getElementById('statTotal').textContent = total;
  if (total === 0) {
    document.getElementById('statAvg').textContent = "-";
    document.getElementById('statMin').textContent = "-";
    document.getElementById('statMax').textContent = "-";
    document.getElementById('statPublic').textContent = 0;
    document.getElementById('statPrivate').textContent = 0;
    return;
  }
  const ipsValues = filteredSchools.map(s => s.ips);
  const avg = ipsValues.reduce((a, b) => a + b, 0) / total;
  const min = Math.min(...ipsValues);
  const max = Math.max(...ipsValues);
  const pubCount = filteredSchools.filter(s => (s.sector || "").toLowerCase().includes("public")).length;
  const privCount = filteredSchools.filter(s => (s.sector || "").toLowerCase().includes("priv")).length;
  document.getElementById('statAvg').textContent = avg.toFixed(1);
  document.getElementById('statMin').textContent = min.toFixed(1);
  document.getElementById('statMax').textContent = max.toFixed(1);
  document.getElementById('statPublic').textContent = pubCount;
  document.getElementById('statPrivate').textContent = privCount;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
