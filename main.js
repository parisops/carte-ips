// Configuration du cluster plus fin
const clusterOptions = {
  maxClusterRadius: 5,  // clusters serrés, presque invisibles
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
};

const markers = L.markerClusterGroup(clusterOptions);
map.addLayer(markers);

// Fonction pour créer icône avec taille dynamique selon zoom
function createIcon(type, ips, zoom) {
  const baseSizeMin = 8;  // taille min au zoom minimal
  const baseSizeMax = 18; // taille max au zoom max
  const zoomMin = 5; // zoom min de la carte
  const zoomMax = 18; // zoom max de la carte

  // Calcul taille proportionnelle au zoom
  let size = baseSizeMin;
  if (zoom > zoomMin) {
    size = baseSizeMin + ((zoom - zoomMin) / (zoomMax - zoomMin)) * (baseSizeMax - baseSizeMin);
  }
  size = Math.round(size);

  const color = colorByIps(ips);
  const shape = shapeByType(type);

  return L.divIcon({
    className: `custom-marker ${shape}`,
    iconSize: [size, size],
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: ${shape === 'circle' ? '50%' : '0'}; transform: ${shape === 'diamond' ? 'rotate(45deg)' : 'none'};"></div>`,
  });
}

// Variable globale pour stocker les markers
let markerList = [];

function afficherPoints(data) {
  markers.clearLayers();
  markerList = [];
  const zoom = map.getZoom();

  data.forEach((e) => {
    const icon = createIcon(e.type, e.ips, zoom);
    const marker = L.marker([e.latitude, e.longitude], { icon }).bindPopup(`
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
    markerList.push(marker);
  });
}

// Réajustement taille icônes au zoom sur la carte
map.on('zoomend', function () {
  const zoom = map.getZoom();
  markers.clearLayers();
  markerList.forEach((m) => {
    const latlng = m.getLatLng();
    // On récupère les infos originales de l'établissement stockées dans m.options ou popup ?
    // Adapter si besoin : ici on réutilise la popup pour retrouver type et ips
    const popupContent = m.getPopup().getContent();
    // Regex simple pour extraire type et ips
    const typeMatch = popupContent.match(/<div class="popup-info">([^<]+) •/);
    const ipsMatch = popupContent.match(/IPS\s*:\s*(\d+\.?\d*)/);
    if (!typeMatch || !ipsMatch) return;
    const type = typeMatch[1].toLowerCase();
    const ips = parseFloat(ipsMatch[1]);
    const newIcon = createIcon(type, ips, zoom);
    m.setIcon(newIcon);
  });
  markers.addLayers(markerList);
});
