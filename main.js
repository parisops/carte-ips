const map = L.map('map').setView([48.85, 2.35], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

const sidebar = L.control.sidebar({ container: 'sidebar' }).addTo(map);
sidebar.open('filters');

let markers = L.markerClusterGroup();
map.addLayer(markers);

// Fonctions pour couleur IPS
function iconColor(ips) {
  if (ips === undefined || ips === null) return "gray";
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

// Charger et fusionner les 3 jeux de données
let ecoles = [];
Promise.all([
  fetch('data/localisations.json').then(r => r.json()),
  fetch('data/ips.json').then(r => r.json()),
  fetch('data/effectifs.json').then(r => r.json())
]).then(([localisations, ips, effectifs]) => {
  // Fusionne sur le code UAI / numero_uai
  ecoles = localisations.map(loc => {
    const uai = loc.numero_uai;
    const ecole_ips = ips.find(i => i.uai === uai);
    const ecole_effectif = effectifs.find(e => e.numero_ecole === uai || e.numero_uai === uai);
    return {
      ...loc,
      ips: (ecole_ips && ecole_ips.ips) ? parseFloat(ecole_ips.ips) : null,
      denomination_principale: loc.denomination_principale || (ecole_effectif && ecole_effectif.denomination_principale),
      libelle_departement: loc.libelle_departement,
      nombre_total_eleves: ecole_effectif ? ecole_effectif.nombre_total_eleves : null
      // Ajoute d’autres attributs utiles ici
    };
  });
  populateDepartements(ecoles);
  afficherEcoles(ecoles);
});

function afficherEcoles(liste) {
  markers.clearLayers();
  liste.forEach(ecole => {
    if (ecole.latitude && ecole.longitude) {
      let popup = `<b>${ecole.appellation_officielle || ecole.denomination_principale}</b>`
      popup += `<br>UAI: ${ecole.numero_uai}`;
      popup += `<br>Département: ${ecole.libelle_departement || ""}`;
      if (ecole.ips !== null) popup += `<br>IPS: ${ecole.ips}`;
      if (ecole.nombre_total_eleves) popup += `<br>Élèves: ${ecole.nombre_total_eleves}`;
      let marker = L.marker([ecole.latitude, ecole.longitude], {
        icon: iconByIps(ecole.ips)
      }).bindPopup(popup);
      markers.addLayer(marker);
    }
  });
}

function populateDepartements(data) {
  const select = document.getElementById('departement-select');
  let departs = [...new Set(data.map(e => e.libelle_departement).filter(Boolean))].sort();
  select.innerHTML = '<option value="">Tous</option>' + departs.map(d => `<option>${d}</option>`).join('');
}

document.getElementById('filtrer').onclick = function () {
  let dep = document.getElementById('departement-select').value;
  let type = document.getElementById('type-select').value;
  let minIps = Number(document.getElementById('ips-min').value);
  let maxIps = Number(document.getElementById('ips-max').value);
  let filtres = ecoles.filter(e =>
    (!dep || e.libelle_departement === dep) &&
    (!type || e.denomination_principale === type) &&
    (e.ips === null || (e.ips >= minIps && e.ips <= maxIps))
  );
  afficherEcoles(filtres);
};
