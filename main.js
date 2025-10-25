const map = L.map('map').setView([48.85, 2.35], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

const sidebar = L.control.sidebar({ container: 'sidebar' }).addTo(map);
sidebar.open('filters');

// Clustering: groupe plus "fin"
let markers = L.markerClusterGroup({ maxClusterRadius: 30 });
map.addLayer(markers);

function iconColor(ips) {
  if (ips === undefined || ips === null || isNaN(ips)) return "gray";
  let v = Number(ips);
  if (v > 120) return "green";
  if (v >= 100) return "orange";
  return "red";
}
function iconByIps(ips) {
  return L.divIcon({
    className: 'custom-marker ' + iconColor(ips),
    iconSize: [24, 24]
  });
}

let ecoles = [];
Promise.all([
  fetch('data/localisations.json').then(r => r.json()),
  fetch('data/ips.json').then(r => r.json()),
  fetch('data/effectifs.json').then(r => r.json())
]).then(([localisations, ips, effectifs]) => {
  ecoles = localisations.map(loc => {
    const uai = loc.numero_uai;
    const ecole_ips = ips.find(i => (i.uai || i.numero_uai) === uai);
    const ecole_effectif = effectifs.find(e => (e.numero_ecole || e.numero_uai) === uai);
    return {
      ...loc,
      ips: ecole_ips && ecole_ips.ips ? parseFloat(ecole_ips.ips) : null,
      denomination_principale: loc.denomination_principale || (ecole_effectif && ecole_effectif.denomination_principale),
      nombre_total_eleves: ecole_effectif ? ecole_effectif.nombre_total_eleves : null
    };
  });
  afficherEcoles(ecoles);
});

function afficherEcoles(objets) {
  markers.clearLayers();
  objets.forEach(ecole => {
    if (ecole.latitude && ecole.longitude) {
      let marker = L.marker([ecole.latitude, ecole.longitude], {
        icon: iconByIps(ecole.ips)
      }).bindPopup(
        `<b>${ecole.appellation_officielle || ecole.denomination_principale}</b><br>UAI: ${ecole.numero_uai || ""}<br>IPS: ${ecole.ips !== null ? ecole.ips : "NC"}<br>Élèves: ${ecole.nombre_total_eleves || "NC"}`
      );
      markers.addLayer(marker);
    }
  });
}

document.getElementById('filtrer').onclick = function () {
  let checkedTypes = Array.from(document.querySelectorAll('.type-ecole:checked')).map(cb => cb.value);
  let minIps = Number(document.getElementById('ips-min').value);
  let maxIps = Number(document.getElementById('ips-max').value);
  let filtres = ecoles.filter(e =>
    (checkedTypes.length === 0 || checkedTypes.includes(e.denomination_principale)) &&
    (e.ips === null || (e.ips >= minIps && e.ips <= maxIps))
  );
  afficherEcoles(filtres);
};
