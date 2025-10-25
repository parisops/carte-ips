const map = L.map('map').setView([48.85, 2.35], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

const sidebar = L.control.sidebar({ container: 'sidebar' }).addTo(map);
sidebar.open('filters');

// Clustering avec rayon max réduit pour regroupements plus fins
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
  fetch('data/ips.json').then(r => r.json()),
  fetch('data/localisations.json').then(r => r.json()),
  fetch('data/effectifs.json').then(r => r.json())
]).then(([ipsData, localisations, effectifs]) => {
  // Mapper localisations et effectifs par UAI pour accès rapide
  const locMap = new Map(localisations.map(e => [e.numero_uai, e]));
  const effMap = new Map(effectifs.map(e => [e.numero_ecole || e.numero_uai, e]));

  // Ne garder que les écoles présentes dans ips.json
  ecoles = ipsData.map(ip => {
    const uai = ip.uai || ip.numero_uai;
    const loc = locMap.get(uai) || {};
    const eff = effMap.get(uai) || {};
    return {
      numero_uai: uai,
      ips: ip.ips ? parseFloat(ip.ips) : null,
      latitude: loc.latitude,
      longitude: loc.longitude,
      denomination_principale: loc.denomination_principale || eff.denomination_principale || "",
      nombre_total_eleves: eff.nombre_total_eleves || null,
      appellation_officielle: loc.appellation_officielle || "",
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
        `<b>${ecole.appellation_officielle || ecole.denomination_principale}</b><br>UAI: ${ecole.numero_uai}<br>IPS: ${ecole.ips !== null ? ecole.ips : "NC"}<br>Élèves: ${ecole.nombre_total_eleves || "NC"}`
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
