import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ⚠️ GitHub Pages (project page) sert le site sous
// https://TON-PSEUDO.github.io/NOM-DU-REPO/ — le `base` doit correspondre
// EXACTEMENT au nom du repo, sinon les assets et les fetch de /data/*.json
// pointent au mauvais endroit une fois déployé. Change "edu-idf-map"
// ci-dessous si ton repo s'appelle autrement.
const REPO_NAME = "carte-ips";

export default defineConfig({
  plugins: [react()],
  base: `/${REPO_NAME}/`,
  build: {
    rollupOptions: {
      output: {
        // Sépare les grosses libs dans des chunks dédiés : le navigateur les
        // met en cache indépendamment du code de l'app (qui change plus
        // souvent), et ça permet de télécharger plusieurs chunks en
        // parallèle plutôt qu'un seul gros fichier de 770 Ko.
        manualChunks: {
          leaflet: ["leaflet", "react-leaflet", "react-leaflet-cluster"],
          charts: ["recharts"],
        },
      },
    },
  },
});
