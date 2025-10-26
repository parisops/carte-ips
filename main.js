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
    if (ips < 90) return '#d32f2f';         // rouge foncé
    if (ips < 105) return '#f57c00';        // orange
    if (ips < 120) return '#fbc02d';        // jaune
    if (ips < 130) return '#3f51b5';        // bleu plus marqué (plus foncé que avant)
    return '#1a237e';                       // bleu très foncé, différencié
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

// ... le reste du code processIPSData, filtres, markers etc. demeure identique ...

function applyFilters() {
  filteredSchools = allSchools.filter(school => {
    const type = school.type ? school.type.toLowerCase() : '';
    const sector = school.sector ? school.sector.toLowerCase() : '';
    if(type.includes('école') && !currentFilters.types.ecoles) return false;
    if(type.includes('collège') && !currentFilters.types.colleges) return false;
    if(type.includes('lycée')) {
      if(school.type.includes('LEGT') && !currentFilters.types.lyceesLEGT) return false;
      if(school.type.includes('LPO') && !currentFilters.types.lyceesLPO) return false;
      if(school.type.includes('LP') && !school.type.includes('LPO') && !currentFilters.types.lyceesLP) return false;
      if(!school.type.includes('LEGT') && !school.type.includes('LPO') && !school.type.includes('LP') && !currentFilters.types.lyceesAutres) return false;
    }
    if(currentFilters.region && school.region !== currentFilters.region) return false;
    if(currentFilters.department && school.departement !== currentFilters.department) return false;
    if(sector.includes('public') && !currentFilters.sectors.public) return false;
    if(sector.includes('privé') && !currentFilters.sectors.private) return false;
    if(school.ips < currentFilters.ipsMin || school.ips > currentFilters.ipsMax) return false;
    return true;
  });

  updateMarkers();
  updateStatistics();
  // Ne pas appeler zoomToFiltered pour ne pas dézoomer
}

function zoomToFiltered() {
  // Désactivé pour éviter dézoom sur filtres
}

if(document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
