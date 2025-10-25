const map = L.map('map').setView([48.85, 2.35], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap',
  maxZoom: 18,
}).addTo(map);

const sidebar = L.control.sidebar({ container: 'sidebar' }).addTo(map);
sidebar.open('filters');

const clusterOptions = {
  maxClusterRadius: 3,  // encore plus serré
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
};
const markers = L.markerClusterGroup(clusterOptions);
map.addLayer(markers);

function colorByIps(ips) {
  if (!ips || isNaN(ips)) return '#777';
  if (ips < 90) return '#e74c3c';
  if (ips < 105) return '#e67e22';
  if (ips < 120) return '#f1c40f';
  if (ips < 130) return '#2ecc71';
  return '#27ae60';
}

function shapeByType(type) {
  if (!type) return 'circle';
  switch (type.toLowerCase()) {
    case 'école': case 'ecole': return 'circle';
    case 'collège': case 'college': return 'square';
    case 'lycée': case 'lycee': return 'diamond';
    default: return 'circle';
  }
}

function createIcon(type, ips, size) {
  return L.divIcon({
    className: `custom-marker ${shapeByType(type)}`,
    iconSize: [size, size],
    html: `<div style="background-color: ${colorByIps(ips)}; width: ${size}px; height: ${size}px; border-radius: ${shapeByType(type) === 'circle' ? '50%' : '0'}; transform: ${shapeByType(type) === 'diamond' ? 'rotate(45deg)' : 'none'};"></div>`,
  });
}

let etabs = [];
let displayedMarkers = [];

Promise.all([
  fetch('data/ips-ecoles.json').then(r => r.json()),
  fetch('data/ips-colleges.json').then(r => r.json()),
  fetch('data/ips-lycees.json').then(r => r.json()),
  fetch('data/localisations.json').then(r => r.json()),
  fetch('data/effectifs.json').then(r => r.json()),
]).then(([ipsEcoles, ipsColleges, ipsLycees, localisations, effectifs]) => {
  const locMap = new Map(localisations.map(l => [l.numero_uai.trim().toUpperCase(), l]));
  const effMap = new Map(effectifs.map(e => [((e.numero_ecole || e.numero_uai) || '').trim().toUpperCase(), e]));

  function merge(data, type, ipsField) {
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

  etabs = [
    ...merge(ipsEcoles, 'école', 'ips'),
    ...merge(ipsColleges, 'collège', 'ips'),
    ...merge(ipsLycees, 'lycée', 'ips_etab')
  ];

  afficherPoints(etabs);
});

function afficherPoints(data) {
  markers.clearLayers();
  displayedMarkers = [];
  const zoom = map.getZoom();
  const size = getSizeByZoom(zoom);
  data.forEach(e => {
    const icon = createIcon(e.type, e.ips, size);
    const marker = L.marker([e.latitude, e.longitude], { icon });
    marker.bindPopup(`
      <div class="popup-title">${e.appellation || e.denom}</div>
      <div class="popup-info">${capitalize(e.type)} • ${e.secteur}</div>
      <div class="popup-info">${e.commune}, ${e.departement}</div>
      <div class="popup-divider"></div>
      <div class="popup-main-ips" style="background-color:${colorByIps(e.ips)}33; border:1px solid ${colorByIps(e.ips)}99;">
        IPS : ${e.ips.toFixed(1)}
      </div>
      <div class="popup-compact-row"><span>Élèves :</span><span>${e.nombre_total_eleves ?? 'NC'}</span></div>
      <div class="popup-compact-row"><span>Classes :</span><span>${e.nombre_total_classes ?? 'NC'}</span></div>
    `);
    markers.addLayer(marker);
    displayedMarkers.push(marker);
  });
}

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getSizeByZoom(zoom) {
  const minZoom = 5;
  const maxZoom = 18;
  const minSize = 6;
  const maxSize = 18;
  if (zoom <= minZoom) return minSize;
  if (zoom >= maxZoom) return maxSize;
  return minSize + ((zoom - minZoom) / (maxZoom - minZoom)) * (maxSize - minSize);
}

map.on('zoomend', () => {
  const zoom = map.getZoom();
  const size = getSizeByZoom(zoom);
  displayedMarkers.forEach(marker => {
    const popupContent = marker.getPopup().getContent();
    const typeMatch = popupContent.match(/<div class="popup-info">([^<]+) •/);
    const ipsMatch = popupContent.match(/IPS\s*:\s*([\d\.]+)/);
    if (!typeMatch || !ipsMatch) return;
    const type = typeMatch[1].toLowerCase();
    const ips = parseFloat(ipsMatch[1]);
    const newIcon = createIcon(type, ips, size);
    marker.setIcon(newIcon);
  });
});
