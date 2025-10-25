// Création de la carte
const map = L.map('map').setView([48.85, 2.35], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

// Sidebar
const sidebar = L.control.sidebar({ container: 'sidebar' }).addTo(map);
sidebar.open('filters');

// Marker clustering
let markers = L.markerClusterGroup();
map.addLayer(markers);

// Couleurs IPS
function iconColor(ips) {
  if (ips === undefined || ips === null) return "gray";
  let v = Number(ips);
  if (v > 120) return "green";
  if (v >= 100) return "orange";
  return "red";
}
function iconByIps(ips) {
  return L.divIcon({
    className: 'custom-marker '+iconColor(ips),
    iconSize: [24, 24]
  });
}

// Données (exemple à remplacer par fetch)
let ecoles = [];
fetch('data/ecoles.json')
  .then(r => r.json())
  .then(data => {
    ecoles = data;
    populateDepartements(ecoles);
    afficherEcoles(ecoles);
  });

function afficherEcoles(liste) {
  markers.clearLayers();
  liste.forEach(ecole => {
    if(ecole.latitude && ecole.longitude){
      let marker = L.marker([ecole.latitude, ecole.longitude], {
        icon: iconByIps(ecole.ips)
      }).bindPopup(
        `<b>${ecole.appellation_officielle}</b><br>UAI: ${ecole.numero_uai}<br>Département: ${ecole.libelle_departement}<br>IPS : ${ecole.ips||"NON RENSEIGNÉ"}`
      );
      markers.addLayer(marker);
    }
  });
}

function populateDepartements(data) {
  const select = document.getElementById('departement-select');
  let departs = [...new Set(data.map(e=>e.libelle_departement).filter(Boolean))].sort();
  select.innerHTML = '<option value="">Tous</option>' + departs.map(d=>`<option>${d}</option>`).join('');
}

document.getElementById('filtrer').onclick = function(){
  let dep = document.getElementById('departement-select').value;
  let type = document.getElementById('type-select').value;
  let minIps = Number(document.getElementById('ips-min').value);
  let maxIps = Number(document.getElementById('ips-max').value);
  let filtres = ecoles.filter(e => (!dep || e.libelle_departement===dep) &&
                                    (!type || e.denomination_principale===type) &&
                                    (!e.ips || (Number(e.ips)>=minIps && Number(e.ips)<=maxIps))
                                  );
  afficherEcoles(filtres);
};
