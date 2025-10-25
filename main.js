console.log("Début du main.js");

const map = L.map('map').setView([48.85, 2.35], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap',
  maxZoom: 18
}).addTo(map);

const sidebar = L.control.sidebar({ container: 'sidebar' }).addTo(map);
sidebar.open('filters');

const markers = L.markerClusterGroup({ maxClusterRadius: 10 });
map.addLayer(markers);

function getColorByIps(ips) {
  if (ips === undefined || ips === null || isNaN(ips)) return 'gray';
  const v = Number(ips);
  if (v < 90) return 'red';
  if (v < 105) return 'orange';
  if (v < 120) return 'yellow';
  if (v < 130) return 'lightgreen';
  return 'darkgreen';
}

function getShapeByType(type) {
  switch ((type || '').toLowerCase()) {
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
    iconSize: [18, 18]
  });
}

let ecoles = [];

Promise.all([
  fetch('data/ips-ecoles.json')
    .then(r => { console.log("Chargement ips-ecoles.json", r.status); return r.json(); }),
  fetch('data/ips-colleges.json')
    .then(r => { console.log("Chargement ips-colleges.json", r.status); return r.json(); }),
  fetch('data/ips-lycees.json')
    .then(r => { console.log("Chargement ips-lycees.json", r.status); return r.json(); }),
  fetch('data/localisations.json')
    .then(r => { console.log("Chargement localisations.json", r.status); return r.json(); }),
  fetch('data/effectifs.json')
    .then(r => { console.log("Chargement effectifs.json", r.status); return r.json(); })
]).then(
  ([ipsEcoles, ipsColleges, ipsLycees, localisations, effectifs]) => {

    console.log("Données IPS Ecoles reçues", ipsEcoles.length);
    console.log("Données IPS Collèges reçues", ipsColleges.length);
    console.log("Données IPS Lycées reçues", ipsLycees.length);
    console.log("Localisations reçues", localisations.length);
    console.log("Effectifs reçus", effectifs.length);

    const locMap = new Map(localisations.map(l => [l.numero_uai.toUpperCase(), l]));
    const effMap = new Map(effectifs.map(e => [e.numero_ecole.toUpperCase(), e]));

    ecoles = [];

    ipsEcoles.forEach(e => {
      let uai = (e.uai || e.numero_uai || '').toUpperCase();
      if (!e.ips_etab) return;
      let ipsValue = parseFloat(e.ips_etab);
      if (isNaN(ipsValue)) return;
      let loc = locMap.get(uai);
      if (!loc) {
        console.warn("Localisation manquante pour école UAI:", uai);
        return;
      }
      let eff = effMap.get(uai);
      ecoles.push({
        numero_uai: uai,
        type: 'école',
        ips: ipsValue,
        latitude: loc.latitude,
        longitude: loc.longitude,
        denom: loc.denomination_principale || e.denomination_principale || '',
        nombre
