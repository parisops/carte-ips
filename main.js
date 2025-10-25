const map = L.map('map').setView([48.85, 2.35], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap',
  maxZoom: 18
}).addTo(map);

const sidebar = L.control.sidebar({ container: 'sidebar' }).addTo(map);
sidebar.open('filters');

let markers = L.markerClusterGroup({ maxClusterRadius: 5 });
map.addLayer(markers);

function getColorByIps(ips) {
  if (ips === undefined || ips === null || isNaN(ips)) return 'gray';
  const v = Number(ips);
  if (v < 90) return 'red';
  else if (v < 105) return 'orange';
  else if (v < 120) return 'yellow';
  else if (v < 130) return 'lightgreen';
  else return 'darkgreen';
}

function getShapeByType(type) {
  switch (type.toLowerCase()) {
    case 'école': case 'ecole': return 'circle';
    case 'collège': case 'college': return 'square';
    case 'lycée': case 'lycee': return 'diamond';
    default: return 'circle';
  }
}

function createIcon(type, ips) {
  const color = getColorByIps(ips);
  const shape = getShapeByType(type);
  return L.divIcon({
    className: `custom-marker ${shape} ${color}`,
    iconSize: [18, 18]  // Taille réduite ici aussi
  });
}

let ecoles = [];

Promise.all([
  fetch('data/ips-ecoles.json').then(r => r.json()),
  fetch('data/ips-colleges.json').then(r => r.json()),
  fetch('data/ips-lycees.json').then(r => r.json()),
  fetch('data/localisations.json').then(r => r.json()),
  fetch('data/effectifs.json').then(r => r.json())
]).then(([ipsEcoles, ipsColleges, ipsLycees, localisations, effectifs]) => {
  const locMap = new Map(localisations.map(l => [l.numero_uai, l]));
  const effMap = new Map(effectifs.map(e => [e.numero_ecole || e.numero_uai, e]));

  ecoles = [];

  ipsEcoles.forEach(e => {
    let uai = e.uai || e.numero_uai;
    let loc = locMap.get(uai) || {};
    let eff = effMap.get(uai) || {};
    ecoles.push({
      numero_uai: uai,
      type: 'école',
      ips: parseFloat(e.ips),
      latitude: loc.latitude,
      longitude: loc.longitude,
      denom: loc.denomination_principale || e.denomination_principale || '',
      nombre_total_eleves: eff.nombre_total_eleves || null,
      nombre_total_classes: eff.nombre_total_classes || null,
      appellation: loc.appellation_officielle || ''
    });
  });

  ipsColleges.forEach(c => {
    let uai = c.uai || c.numero_uai;
    let loc = locMap.get(uai) || {};
    ecoles.push({
      numero_uai: uai,
      type: 'collège',
      ips: parseFloat(c.ips),
      latitude: loc.latitude,
      longitude: loc.longitude,
      denom: c.denomination_principale || '',
      appellation: loc.appellation_officielle || ''
    });
  });

  ipsLycees.forEach(l => {
    let uai = l.uai || l.numero_uai;
    let loc = locMap.get(uai) || {};
    ecoles.push({
      numero_uai: uai,
      type: 'lycée',
      ips: parseFloat(l.ips),
      latitude: loc.latitude,
      longitude: loc.longitude,
      denom: l.denomination_principale || '',
      appellation: loc.appellation_officielle || ''
    });
  });

  afficherEcoles(ecoles);
});

function afficherEcoles(data) {
  markers.clearLayers();
  data.forEach(e => {
    if (!(e.latitude && e.longitude)) return;
    let popup = `
      <b>${e.appellation || e.denom}</b><br/>
      UAI: ${e.numero_uai}<br/>
      Type: ${e.type}<br/>
      IPS: ${e.ips}<br/>
    `;
    if(e.type === 'école') {
      popup += `
        Élèves: ${e.nombre_total_eleves !== null ? e.nombre_total_eleves : 'NC'}<br/>
        Classes: ${e.nombre_total_classes !== null ? e.nombre_total_classes : 'NC'}<br/>`;
    }
    let marker = L.marker([e.latitude, e.longitude], {
      icon: createIcon(e.type, e.ips)
    }).bindPopup(popup);
    markers.addLayer(marker);
  });
}

document.getElementById('filtrer').onclick = () => {
  const selectedTypes = Array.from(document.querySelectorAll('.type-filter:checked')).map(cb => cb.value);
  const minIps = parseFloat(document.getElementById('ips-min').value) || 0;
  const maxIps = parseFloat(document.getElementById('ips-max').value) || 200;

  const filtered = ecoles.filter(e =>
    selectedTypes.includes(e.type) &&
    e.ips >= minIps &&
    e.ips <= maxIps);
  afficherEcoles(filtered);
};
