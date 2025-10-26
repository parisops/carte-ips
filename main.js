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
    fetch('/data/ips-ecoles.json').then(r => r.json()),
    fetch('/data/ips-colleges.json').then(r => r.json()),
    fetch('/data/ips-lycees.json').then(r => r.json()),
    fetch('/data/localisations.json').then(r => r.json()),
    fetch('/data/effectifs.json').then(r => r.json()),
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
      secteur: loc.secteur_public_prive_libe || 'Public',
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

// Toutes les fonctions pour filtres, mise à jour carte, statistiques, popups, événements sont gardées identiques à celles fournies précédemment.

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
