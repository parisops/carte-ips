# Carte interactive des écoles françaises

## Description

Cette carte affiche les écoles, leurs effectifs, leurs indices sociaux (IPS), et leur localisation. Toutes les données sont hébergées statiquement et chargées par JavaScript pour un rendu rapide via GitHub Pages.

## Déploiement sur GitHub Pages

1. Crée un nouveau dépôt GitHub et clone-le localement.
2. Copie tous les fichiers dans ton dépôt (respecte la hiérarchie).
3. Fais :
    ```
    git add .
    git commit -m "Initial commit"
    git push origin main
    ```
4. Va dans les paramètres (Settings → Pages) de ton dépôt GitHub
    - Choisis la branche `main` et le dossier racine `/` pour la publication.
5. Accède à `https://<utilisateur>.github.io/<nom-du-dépôt>/`

## Arborescence du projet

    .
    ├── data/
    │   ├── ips.json
    │   ├── localisations.json
    │   └── effectifs.json
    ├── index.html
    ├── main.js
    ├── style.css
    ├── README.md
    └── .gitignore

## Librairie recommandée

- [Leaflet.js](https://leafletjs.com/) (tu peux l’inclure via CDN dans `index.html`)

## Données

- Les fichiers sont générés une seule fois et sont lus comme ressources statiques.
- Pour filtrer ou modifier les écoles, ajuste les fichiers du dossier `data/`.

## Aide

Pour toute question, contacte l’auteur du dépôt.
