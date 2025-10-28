let map = null;
let markers = [];
let allSchools = [];
let filteredSchools = [];
let currentFilters = {
  region: '',
  department: '',
  sectors: { public: true, private: true },
  types: {
    ecoles: true,
    colleges: true,
    lycees: true
  },
  ipsMin: 45,
  ipsMax: 185
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
  map = L.map('map').setView([48.7, 2.5], 9);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  markers = [];
  map.on('zoomend', updateDynamicZoomSizes);
}

async function loadData() {
  const [ipsEcoles, ipsColleges, ipsLycees, localisations, effectifs] = await Promise.all([
    fetch('data/ips-ecoles.json').then(r => r.json()),
    fetch('data/ips-colleges.json').then(r => r.json()),
    fetch('data/ips-lycees.json').then(r => r.json()),
    fetch('data/localisations.json').then(r => r.json()),
    fetch('data/effectifs.json').then(r => r.json())
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
      patronyme: loc.patronyme_uai || loc.denomination_principale || '',
      sector: loc.secteur_public_prive_libe || 'Public',
      commune: loc.libelle_commune || "",
      ips_commune: parseFloat(e.ips_commune) || null,
      ips_departemental: parseFloat(e.ips_departemental) || null,
      ips_academique: parseFloat(e.ips_academique) || null,
      ips_national: parseFloat(e.ips_national) || null,
      nombre_total_eleves: eff.nombre_total_eleves || null,
      nombre_total_classes: eff.nombre_total_classes || null,
      type_long: type
    }];
  });
}

function setupEventListeners() {
  ['ecoles', 'colleges', 'lycees'].forEach(type => {
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
    types: { ecoles: true, colleges: true, lycees: true },
    ipsMin: 45,
    ipsMax: 185
  };
  ['ecoles', 'colleges', 'lycees'].forEach(type =>
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
  map.setView([48.7, 2.5], 9);
  applyFilters();
}

function applyFilters() {
  filteredSchools = allSchools.filter(school => {
    if (!school) return false;
    const type = (school.type_long || "").toLowerCase();
    if (type === 'école' && !currentFilters.types.ecoles) return false;
    if (type === 'collège' && !currentFilters.types.colleges) return false;
    if (type === 'lycée' && !currentFilters.types.lycees) return false;
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
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];

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
  else if (zoom >= 11) size = 14;

  markers.forEach(marker => {
    const el = marker.getElement();
    if (el) {
      const child = el.querySelector('div');
      if (child) {
        child.style.width = `${size}px`;
        child.style.height = `${size}px`;
      }
    }
  });
}

function createDetailedPopup(school) {
  const color = IPS_COLORS.getColor(school.ips);

  function diffPts(val1, val2) {
    if (val1 === null || val2 === null || val1 === undefined || val2 === undefined) return null;
    return val1 - val2; // garder signe
  }

  function formatDiff(diff, name) {
    if (diff === null) return '';
    const absDiff = Math.abs(diff).toFixed(2);
    const colorStyle = diff > 0 ? 'green' : (diff < 0 ? 'red' : 'black');
    const strongName = `<strong>${escapeHtml(name)}</strong>`;
    return `<li style="color:${colorStyle};">${absDiff} points par rapport à ${strongName}</li>`;
  }

  const diffVille = diffPts(school.ips, school.ips_commune);
  const diffDept = diffPts(school.ips, school.ips_departemental);
  const diffAcad = diffPts(school.ips, school.ips_academique);
  const diffNat = diffPts(school.ips, school.ips_national);

  const diffItems = [];
  if (diffVille !== null) diffItems.push(formatDiff(diffVille, school.commune || "ville"));
  if (diffDept !== null) diffItems.push(formatDiff(diffDept, school.departement || "département"));
  if (diffAcad !== null) diffItems.push(formatDiff(diffAcad, "l'Académie de " + (school.academie || "académie")));
  if (diffNat !== null) diffItems.push(formatDiff(diffNat, "la moyenne nationale"));

  const diffsHtml = diffItems.length > 0 
    ? `<div style="margin-top:0.8em;"><strong>Écarts IPS :</strong><ul style="padding-left:1em; margin-top:0.3em;">` +
      diffItems.join('') +
      `</ul></div>`
    : '';

  let html = `
    <div class="popup-title">${escapeHtml(school.patronyme || school.denomination || "")}</div>
    <div class="popup-info">${escapeHtml(school.denomination || school.type_long || "")} - ${escapeHtml(school.sector || '')}</div>
    <div class="popup-info">${escapeHtml(school.commune || '')}, ${escapeHtml(school.departement || '')}</div>
    <div class="popup-divider"></div>
    <div class="popup-main-ips" style="background-color: ${color}; color:#222; border: 1px solid #eee;">
      IPS: <span style="font-weight:bold;color:#222">${school.ips ? school.ips.toFixed(1) : 'N/A'}</span>
    </div>
    ${diffsHtml}
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
