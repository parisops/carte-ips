// Initialisation carte
const map = L.map('map').setView([48.85, 2.35], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 18
}).addTo(map);

const sidebar = L.control.sidebar({ container: 'sidebar' }).addTo(map);
sidebar.open('filters');

let markers = L.markerClusterGroup();
map.addLayer(markers);

// Icône personnalisée selon type+ips
function getIcon(type, ips) {
  let colorClass = '';
  let ipsVal = Number(ips);
  if (isNaN(ipsVal)) colorClass = 'gray';
  else if (ipsVal < 90) colorClass = 'red';
  else if (ipsVal < 105) colorClass = 'orange';
  else if (ipsVal < 120) colorClass = 'yellow';
  else if (ipsVal < 130) colorClass = 'lightgreen';
  else colorClass = 'darkgreen';

  let shapeClass = '';
  switch (type.toLowerCase()) {
    case 'école':
    case 'ecole':
      shapeClass = 'circle';
      break;
    case 'collège':
    case 'college':
      shapeClass = 'square';
      break;
    case 'lycée':
    case 'lycee':
      shapeClass = 'diamond';
      break;
    default:
      shapeClass = 'circle';
  }

  return L.divIcon({
    className: `custom-marker ${shapeClass} ${colorClass}`,
    iconSize: [22, 22]
  });
}

// Données fusionnées affichées
let ecoles = [];

Promise.all([
  fetch('data/localisations.json').then(r => r.json()),
  fetch('data/ips.json').then(r => r.json()),
  fetch('data/effectifs.json').then(r => r.json()),
  fetch('data/ips-colleges.csv').then(r => r.text()),
  fetch('data/ips-lycees.csv').then(r => r.text()),
]).then(([localisations, ips, effectifs, ipsCollegesCSV, ipsLyceesCSV]) => {
  // transforme CSV en tableau JS simple pour collèges et lycées
  function csvToArray(str) {
    let lines = str.trim().split('\n');
    let headers = lines.shift().split(',');
    return lines.map(line => {
      let obj = {};
      let parts = line.split(',');
      headers.forEach((h, i) => { obj[h.trim()] = parts[i].trim(); });
      return obj;
    });
  }
  let ipsColleges = csvToArray(ipsCollegesCSV);
  let ipsLycees = csvToArray(ipsLyceesCSV);

  // Map pour retrouver localisation par UAI
  let locMap = new Map(localisations.map(loc => [loc.numero_uai, loc]));

  // Structure finale
  ecoles = [];

  // Ajout écoles (IPS + localisation + effectifs)
  ips.forEach(e => {
    let uai = e.uai || e.numero_uai;
    let loc = locMap.get(uai) || {};
    let eff = effectifs.find(x => (x.numero_ecole || x.numero_uai) === uai) || {};

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

  // Ajout collèges
  ipsColleges.forEach(college => {
    let uai = college.UAI || college.uai;
    let loc = locMap.get(uai) || {};
    ecoles.push({
      numero_uai: uai,
      type: 'collège',
      ips: parseFloat(college.IPS),
      latitude: loc.latitude,
      longitude: loc.longitude,
      denom: college.Etablissement || '',
      appellation: loc.appellation_officielle || ''
    });
  });

  // Ajout lycées
  ipsLycees.forEach(lycee => {
    let uai = lycee.UAI || lycee.uai;
    let loc = locMap.get(uai) || {};
    ecoles.push({
      numero_uai: uai,
      type: 'lycée',
      ips: parseFloat(lycee.IPS),
      latitude: loc.latitude,
      longitude: loc.longitude,
      denom: lycee.Etablissement || '',
      appellation: loc.appellation_officielle || ''
    });
  });

  afficherEcoles(ecoles);
});

function afficherEcoles(data) {
  markers.clearLayers();
  data.forEach(e => {
    if (!(e.latitude && e.longitude)) return;
    let popupContent = `
      <b>${e.appellation || e.denom}</b><br/>
      UAI: ${e.numero_uai}<br/>
      Type: ${e.type}<br/>
      IPS: ${e.ips}<br/>`;

    if (e.type === 'école') {
      popupContent += `
        Élèves: ${e.nombre_total_eleves !== null ? e.nombre_total_eleves : 'NC'}<br/>
        Classes: ${e.nombre_total_classes !== null ? e.nombre_total_classes : 'NC'}<br/>
      `;
    }

    let marker = L.marker([e.latitude, e.longitude], {
      icon: getIcon(e.type, e.ips)
    }).bindPopup(popupContent);

    markers.addLayer(marker);
  });
}

document.getElementById('filtrer').onclick = function() {
  let checkedTypes = [];
  document.querySelectorAll('.type-ecole').forEach(cb => {
    if (cb.checked) checkedTypes.push(cb.value);
  });
  let ipsMin = parseFloat(document.getElementById('ips-min').value) || 0;
  let ipsMax = parseFloat(document.getElementById('ips-max').value) || 200;

  let filtered = ecoles.filter(e => checkedTypes.includes(e.type)
    && (e.ips >= ipsMin && e.ips <= ipsMax));

  afficherEcoles(filtered);
};
