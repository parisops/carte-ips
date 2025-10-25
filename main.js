let map = L.map('map').setView([48.85, 2.35], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

// Exemple de chargement d’un fichier JSON statique
fetch('data/localisations.json')
  .then(r => r.json())
  .then(localisations => {
    localisations.forEach(ecole => {
      L.marker([ecole.lat, ecole.lon])
        .addTo(map)
        .bindPopup(`${ecole.nom} <br/>UAI: ${ecole.uai}`);
    });
  });
