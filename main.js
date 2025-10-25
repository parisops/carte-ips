const map = L.map('map').setView([48.85, 2.35], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap',
  maxZoom: 18,
}).addTo(map);

const sidebar = L.control.sidebar({ container: 'sidebar' }).addTo(map);
sidebar.open('filters');

const markers = L.markerClusterGroup({ maxClusterRadius: 15 });
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

function createIcon(type, ips) {
  return L.divIcon({
    className: `custom-marker ${shapeByType(type)}`,
    iconSize: [14, 14],
    html: `<div style="background-color: ${colorByIps(ips)}; width: 14px; height: 14px; border-radius:${shapeByType(type)==='circle'?'50%':'0px'}; transform: ${shapeByType(type)==='diamond'?'rotate(45deg)':'none'};"></div>`
  });
}

let etabs = [];

Promise.all([
  fetch('data/ips-ecoles.json').then(r => r.json()),
  fetch('data/ips-colleges.json').then(r => r.json()),
  fetch('data/ips-lycees.json').then(r => r.json()),
  fetch('data/localisations.json').then(r => r.json()),
  fetch('data/effectifs.json').then(r => r.json())
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
  data.forEach(e => {
    const marker = L.marker([e.latitude, e.longitude], {
      icon: createIcon(e.type, e.ips)
    }).bindPopup(`
    <div class="popup-title">${e.appellation || e.denom}</div>
    <div class="popup-info">${e.type.charAt(0).toUpperCase() + e.type.slice(1)} • ${e.secteur}</div>
    <div class="popup-info">${e.commune}, ${e.departement}</div>
    <div class="popup-divider"></div>
    <div class="popup-main-ips" style="background-color:${colorByIps(e.ips)}33; border:1px solid ${colorByIps(e.ips)}99;">
      IPS : ${e.ips.toFixed(1)}
    </div>
    <div class="popup-compact-row"><span>Élèves :</span><span>${e.nombre_total_eleves ?? 'NC'}</span></div>
    <div class="popup-compact-row"><span>Classes :</span><span>${e.nombre_total_classes ?? 'NC'}</span></div>
  `);
    markers.addLayer(marker);
  });
}

document.getElementById('filtrer').onclick = () => {
  const types = [...document.querySelectorAll('.type-filter:checked')].map(cb => cb.value);
  const minIps = parseFloat(document.getElementById('ips-min').value) || 0;
  const maxIps = parseFloat(document.getElementById('ips-max').value) || 200;

  const filtered = etabs.filter(e =>
    types.includes(e.type) && e.ips >= minIps && e.ips <= maxIps
  );
  afficherPoints(filtered);
};
