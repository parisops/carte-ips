// Initialisation de la carte et de la vue
const map = L.map('map').setView([48.85, 2.35], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap',
  maxZoom: 18
}).addTo(map);

const sidebar = L.control.sidebar({ container: 'sidebar' }).addTo(map);
sidebar.open('filters');

const clusterOptions = {
  maxClusterRadius: 15,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false
};
const markers = L.markerClusterGroup(clusterOptions);
map.addLayer(markers);

// Styles de couleurs en fonction de l'IPS
function colorByIps(ips) {
  if (!ips || isNaN(ips)) return '#999';
  if (ips < 90) return '#e74c3c';       // rouge
  if (ips < 105) return '#f39c12';      // orange
  if (ips < 120) return '#f1c40f';      // jaune
  if (ips < 130) return '#27ae60';      // vert clair
  return '#2c3e50';                     // vert foncé
}

// Forme du marqueur selon le type
function shapeByType(type) {
  switch ((type || '').toLowerCase()) {
    case 'école': return 'circle';
    case 'collège': return 'square';
    case 'lycée': return 'diamond';
    default: return 'circle';
  }
}

// Création d'une icône personnalisée
function createIcon(type, ips) {
  const color = colorByIps(ips);
  const shape = shapeByType(type);
  return L.divIcon({
    className: `custom-marker ${shape}`,
    html: `<div style="background:${color};"></div>`,
    iconSize: [14,14],
    className: `marker-${shape} color-${color}`
  });
}

// Fonction principale pour charger et fusionner les données
async function loadData() {
  const [ipsEcoles, ipsColleges, ipsLycees, localisations, effectifs] = await Promise.all([
    fetch('data/ips-ecoles.json').then(r => r.json()),
    fetch('data/ips-colleges.json').then(r => r.json()),
    fetch('data/ips-lycees.json').then(r => r.json()),
    fetch('data/localisations.json').then(r => r.json()),
    fetch('data/effectifs.json').then(r => r.json())
  ]);
  const locMap = new Map(localisations.map(l => [l.numero_uai.trim().toUpperCase(), l]));
  const effMap = new Map(effectifs.map(e => [e.numero_uai.trim().toUpperCase() || e.numero_uai.trim().toUpperCase(), e]));

  // Fusion des données
  const etablissements = [];

  // Fonction de fusion
  function mergeData(data, type, ipsField) {
    data.forEach(e => {
      const uai = (e.uai || e.numero_uai || '').trim().toUpperCase();
      const loc = locMap.get(uai);
      if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') return;
      let ipsVal = e[ipsField];
      if (ipsVal === undefined || ipsVal === null || ipsVal === "") return;
      ipsVal = parseFloat(ipsVal);
      if (isNaN(ipsVal)) return; // skip si pas IPS
      const eff = effMap.get(uai) || {};
      etablissements.push({
        uai,
        type,
        ips: ipsVal,
        lat: loc.latitude,
        lon: loc.longitude,
        denom: loc.denomination_principale || e.denomination_principale || '',
        effEleves: eff.nombre_total_eleves,
        effClasses: eff.nombre_total_classes,
        commune: loc.libelle_commune,
        dept: loc.libelle_departement
      });
    });
  }

  // Charger données
  mergeData(ipsEcoles, 'école', 'ips');
  mergeData(ipsColleges, 'collège', 'ips');
  mergeData(ipsLycees, 'lycée', 'ips_etab');

  return etablissements;
}

// Affichage des points
async function display() {
  const etablissements = await loadData();
  markers.clearLayers();
  etablissements.forEach(e => {
    const icon = createIcon(e.type, e.ips);
    const marker = L.marker([e.lat, e.lon], { icon }).bindPopup(
      `<div style="font-family:Arial;font-size:13px;">
        <div style="font-weight:700;font-size:14px;">${e.denom}</div>
        <div style="font-size:13px;">${e.type} - ${e.commune}</div>
        <div style="font-size:13px;">IPS: ${e.ips.toFixed(1)}</div>
        <div>Élèves: ${e.effEleves || 'N/A'}, Classes: ${e.effClasses || 'N/A'}</div>
      </div>`
    );
    markers.addLayer(marker);
  });
}
display();

document.getElementById('filtrer').onclick = () => {
  const types = [...document.querySelectorAll('.type-filter:checked')].map(cb => cb.value);
  const minIps = parseFloat(document.getElementById('ips-min').value) || 0;
  const maxIps = parseFloat(document.getElementById('ips-max').value) || 200;
  markers.clearLayers();
  loadData().then(effects => {
    const filtered = effects.filter(e => 
      types.includes(e.type) &&
      e.ips >= minIps && e.ips <= maxIps
    );
    filtered.forEach(e => {
      const icon = createIcon(e.type, e.ips);
      const marker = L.marker([e.lat, e.lon], { icon }).bindPopup(
        `<div style="font-family:Arial;font-size:13px;">
          <div style="font-weight:700;font-size:14px;">${e.denom}</div>
          <div style="font-size:13px;">${e.type} - ${e.commune}</div>
          <div style="font-size:13px;">IPS: ${e.ips.toFixed(1)}</div>
          <div>Élèves: ${e.effEleves || 'N/A'}, Classes: ${e.effClasses || 'N/A'}</div>
        </div>`
      );
      markers.addLayer(marker);
    });
  });
};
