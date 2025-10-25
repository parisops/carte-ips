const map = L.map('map').setView([48.85, 2.35], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

fetch('data/localisations.json')
  .then(r => r.json())
  .then(localisations => {
    localisations.forEach(ecole => {
      if (ecole.latitude && ecole.longitude) {
        L.marker([ecole.latitude, ecole.longitude])
          .addTo(map)
          .bindPopup(`<b>${ecole.appellation_officielle}</b><br/>UAI: ${ecole.numero_uai}`);
      }
    });
  });
