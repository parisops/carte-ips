import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { joinByUai } from '../src/utils/joinData.js';

// A compact national index for search/map; full records and histories by UAI zone.
export const CATALOGUE_FIELDS = ['code_uai', 'nom_etablissement', 'type_etablissement', 'statut', 'commune', 'code_postal', 'departement', 'latitude', 'longitude', 'site_key', 'ips_etablissement', 'effectif_total', 'label_rep', 'effectif_ulis', 'effectif_segpa'];
export function construireRuntime(identite, indicateurs, resultats, historique, historiqueResultats) {
  const records = joinByUai(identite, indicateurs, resultats).filter(e => e.nom_etablissement && e.type_etablissement);
  const catalogue = records.map(e => CATALOGUE_FIELDS.map(key => e[key] ?? null));
  const zones = {};
  for (const e of records) {
    const zone = e.code_uai.slice(0, 3);
    const bloc = zones[zone] ??= { etablissements: [], historique: {}, historiqueResultats: {} };
    bloc.etablissements.push(e);
    if (historique[e.code_uai]) bloc.historique[e.code_uai] = historique[e.code_uai];
    if (historiqueResultats[e.code_uai]) bloc.historiqueResultats[e.code_uai] = historiqueResultats[e.code_uai];
  }
  return { catalogue: { champs: CATALOGUE_FIELDS, lignes: catalogue }, zones };
}
export function runtimeDataPlugin() {
  let assets;
  let base;
  return {
    name: 'trajectoires-runtime-data',
    configResolved(config) {
      base = config.base;
      const lire = name => JSON.parse(readFileSync(resolve(config.root, 'public/data', `${name}.json`), 'utf8'));
      const data = construireRuntime(...['identite', 'indicateurs', 'resultats', 'historique_ips', 'historique_resultats'].map(lire));
      assets = new Map([['data/runtime/catalogue.json', JSON.stringify(data.catalogue)], ...Object.entries(data.zones).map(([zone, bloc]) => [`data/runtime/${zone}.json`, JSON.stringify(bloc)])]);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        let path = req.url.split('?')[0];
        if (path.startsWith(base)) path = path.slice(base.length);
        else path = path.replace(/^\//, '');
        const body = assets.get(path);
        if (!body) return next();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(body);
      });
    },
    generateBundle() {
      for (const [fileName, source] of assets) this.emitFile({ type: 'asset', fileName, source });
    },
  };
}
