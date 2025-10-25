const map = L.map('map').setView([48.85, 2.35], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap',
  maxZoom: 18
}).addTo(map);

const sidebar = L.control.sidebar({ container: 'sidebar' }).addTo(map);
sidebar.open('filters');

const markers = L.markerClusterGroup({
  maxClusterRadius: 15,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false
});
map.addLayer(markers);

function getColorByIps(ips) {
  if (!ips || isNaN(ips)) return 'gray';
  const v = Number(ips);
  if (v < 90) return 'red';
  if (v < 105) return 'orange';
  if (v < 120) return 'yellow';
  if (v < 130) return 'lightgreen';
  return 'darkgreen';
}

function getShapeByType(type) {
  switch ((type || '').toLowerCase()) {
    case 'école':
    case 'ecole':
      return 'circle';
    case 'collège':
    case 'college':
      return 'square';
    case 'lycée':
    case 'lycee':
      return 'diamond';
    default:
      return 'circle';
  }
}

function createIcon(type, ips) {
  return L.divIcon({
    className: `custom-marker ${getShapeByType(type)} ${getColorByIps(ips)}`,
    iconSize: [16, 16],
  });
}

let etablissements = [];

Promise.all([
  fetch('data/ips-ecoles.json').then(r => r.json()),
  fetch('data/ips-colleges.json').then(r => r.json()),
  fetch('data/ips-lycees.json').then(r => r.json()),
  fetch('data/localisations.json').then(r => r.json()),
  fetch('data/effectifs.json').then(r => r.json())
])
.then(([ipsEcoles, ipsColleges, ipsLycees, localisations, effectifs]) => {
  const locMap = new Map(localisations.map(l => [l.numero_uai.trim().toUpperCase(), l]));
  const effMap = new Map(effectifs.map(e => [(e.numero_ecole || e.numero_uai).trim().toUpperCase(), e]));

  const mergeData = (data, type) => {
    return data.flatMap(item => {
      const uai = (item.uai || item.numero_uai || '').trim().toUpperCase();
      const loc = locMap.get(uai);
      if (!loc || !loc.latitude || !loc.longitude) return [];
      const ips = parseFloat(item.ips_etab);
      if (isNaN(ips)) return [];

      const eff = effMap.get(uai) || {};
      return [{
        numero_uai: uai,
        type,
        ips,
        latitude: loc.latitude,
        longitude: loc.longitude,
        denom: loc.denomination_principale || item.denomination_principale || '',
        appellation: loc.appellation_officielle || '',
        secteur: loc.secteur_public_prive_libe || 'Public',
        commune: loc.libelle_commune || '',
        departement: loc.libelle_departement || '',
        nombre_total_eleves: eff.nombre_total_eleves || null,
        nombre_total_classes: eff.nombre_total_classes || null,
        ips_national: item.ips_national || null,
        ips_academique: item.ips_academique || null,
        ips_departemental: item.ips_departemental || null
      }];
    });
  };

  etablissements = [
    ...mergeData(ipsEcoles, 'école'),
    ...mergeData(ipsColleges, 'collège'),
    ...mergeData(ipsLycees, 'lycée')
  ];

  afficherPoints(etablissements);
});

function afficherPoints(data) {
  markers.clearLayers();
  data.forEach(e => {
    const marker = L.marker([e.latitude, e.longitude], {
      icon: createIcon(e.type, e.ips)
    }).bindPopup(`
      <div class="popup-title">${e.appellation || e.denom}</div>
      <div class="popup-info">${e.type.charAt(0).toUpperCase() + e.type.slice(1)} • ${e.secteur}</div>
      <div class="popup-info">${e.commune}, ${e.departement}</div>
      <div class="popup-divider"></div>
      <div class="popup-main-ips" style="background-color:${getColorByIps(e.ips)}20; border:1px solid ${getColorByIps(e.ips)}75">
        IPS : ${e.ips.toFixed(1)}
      </div>
      <div class="popup-compact-row"><span class="popup-compact-label">Élèves :</span><span class="popup-compact-value">${e.nombre_total_eleves || 'NC'}</span></div>
      <div class="popup-compact-row"><span class="popup-compact-label">Classes :</span><span class="popup-compact-value">${e.nombre_total_classes || 'NC'}</span></div>
    `);
    markers.addLayer(marker);
  });
}

document.getElementById('filtrer').onclick = () => {
  const types = [...document.querySelectorAll('.type-filter:checked')].map(cb => cb.value);
  const minIps = parseFloat(document.getElementById('ips-min').value) || 0;
  const maxIps = parseFloat(document.getElementById('ips-max').value) || 200;
  const filtres = etablissements.filter(e =>
    types.includes(e.type) && e.ips >= minIps && e.ips <= maxIps
  );
  afficherPoints(filtres);
};
