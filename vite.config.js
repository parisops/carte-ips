import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ⚠️ GitHub Pages (project page) sert le site sous
// https://TON-PSEUDO.github.io/NOM-DU-REPO/ — le `base` doit correspondre
// EXACTEMENT au nom du repo, sinon les assets et les fetch de /data/*.json
// pointent au mauvais endroit une fois déployé.
const REPO_NAME = "carte-ips";

export default defineConfig({
  plugins: [react()],
  base: `/${REPO_NAME}/`,
  build: {
    // AJOUT PERF — relève légèrement le seuil d'avertissement de taille de
    // chunk (défaut 500 kB) : Leaflet + react-leaflet-cluster dépassent déjà
    // cette limite à eux seuls, ce qui générait un warning systématique sans
    // action possible dessus (dépendance tierce). Documente explicitement
    // que ce chunk est volontairement isolé (cf. manualChunks ci-dessous)
    // plutôt que de laisser un warning silencieusement ignoré.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Sépare les grosses libs dans des chunks dédiés : le navigateur les
        // met en cache indépendamment du code de l'app (qui change plus
        // souvent), et ça permet de télécharger plusieurs chunks en
        // parallèle plutôt qu'un seul gros fichier.
        manualChunks: {
          leaflet: ["leaflet", "react-leaflet", "react-leaflet-cluster"],
          // AJOUT PERF — recharts n'est utilisé que dans PanneauDetail.jsx,
          // déjà chargé en lazy() depuis App.jsx. L'isoler dans son propre
          // chunk (plutôt que de le laisser fusionner avec le bundle
          // principal) garantit qu'il n'est téléchargé qu'au premier clic
          // sur un établissement, jamais avant.
          charts: ["recharts"],
        },
      },
    },
  },
});
