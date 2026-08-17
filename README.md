# Trajectoires — IPS, IVAC, IVAL des établissements scolaires de France

Application React + Leaflet + Zustand + Recharts pour explorer les écoles, collèges et
lycées de France sur une carte interactive avec filtres combinables et
tableau de bord par établissement.

Données réelles : établissements scolaires de France (data.education.gouv.fr —
adresses/géoloc, IPS écoles/collèges/lycées, effectifs par niveau/sexe/langue,
indicateurs de résultat IVAC/IVAL).

## Démarrage

```bash
npm install
npm run dev
```

Les données servies par l'app vivent dans `public/data/` (`identite.json`,
`indicateurs.json`, `resultats.json`, `historique_ips.json`). Elles sont déjà
générées et prêtes à l'emploi. Pour les régénérer à partir des fichiers sources
bruts (dans `data-source/`) :

```bash
python3 scripts/prepare_data.py
```

## Architecture

```
data-source/                                # fichiers bruts data.education.gouv.fr (non utilisés au runtime)
scripts/
└── prepare_data.py                         # normalise les sources brutes → public/data/*.json
public/data/
├── identite.json                           # code_uai, nom, type, statut, localisation, GPS
├── indicateurs.json                        # code_uai, IPS, effectifs, inclusivité, pédagogie
├── resultats.json                          # code_uai, IVAC (collèges) / IVAL (lycées)
└── historique_ips.json                     # historique IPS par UAI, chargé à la demande
src/
├── utils/
│   └── joinData.js                       # joinByUai() — fusion des sources sur code_uai
├── hooks/
│   └── useEtablissementsStore.js         # store Zustand : jointure, filtres, sélection
├── components/
│   ├── CarteEtablissements.jsx           # carte Leaflet + clustering + tooltip + clic
│   ├── FiltresPanel.jsx                  # checkboxes + sliders + recherche
│   ├── PanneauDetail.jsx                 # tableau de bord (panneau latéral / modale mobile)
│   ├── GaugeIPS.jsx                      # bullet graph IPS vs moyennes dép./nationale
│   ├── DonutParite.jsx                   # anneau filles/garçons (recharts)
│   └── Badge.jsx                         # badge statut/type/REP
├── App.jsx
└── main.jsx
```

## D'où viennent les données, et pourquoi plusieurs fichiers ?

Le principe central de l'app est de **consolider les données côté client via
`code_uai`**. Les fichiers sources officiels (dossier `data-source/`) sont
hétérogènes : un référentiel de géolocalisation (adresses et coordonnées des
établissements), et plusieurs jeux de données statistiques (IPS et effectifs,
séparés par type d'établissement, avec de nombreuses colonnes par ligne pour
les lycées — une par niveau × filière × langue).

Les envoyer tels quels au navigateur serait déraisonnable (plusieurs dizaines de
Mo cumulés, colonnes redondantes). `scripts/prepare_data.py` les normalise donc
en amont vers des sources cohérentes avec le schéma métier de l'app :

- `public/data/identite.json` : identité + géolocalisation.
- `public/data/indicateurs.json` : IPS + démographie + inclusivité + pédagogie
  (fusion normalisée des fichiers statistiques, eux-mêmes déjà réconciliés par
  `code_uai` au sein du script).
- `public/data/resultats.json` : indicateurs de résultat (IVAC pour les
  collèges, IVAL pour les lycées).

C'est la jointure **entre ces sources**, à l'exécution dans le navigateur, que
`joinByUai()` (`src/utils/joinData.js`) réalise réellement — et elle a un intérêt
concret : les sources ne couvrent pas exactement les mêmes établissements (le
référentiel de géolocalisation référence des établissements fermés récemment,
hors périmètre statistique ; inversement certains établissements très petits ou
tout juste créés manquent parfois côté IPS/effectifs).

La fonction est tolérante : un établissement présent dans une seule source est
quand même renvoyé, les champs manquants restant `undefined` — à chaque composant
de gérer l'affichage conditionnel (ex: pas de bloc "Offre pédagogique" si aucune
langue/filière connue ; pas d'anneau de parité pour les écoles, dont la source ne
ventile pas les effectifs par sexe).

## Deux vrais problèmes remontés en test, et comment ils sont traités

**"J'ai des points dédoublés, c'est le même établissement en 2 points"** — en
creusant, ce ne sont pas des doublons de données : de nombreux établissements
partagent des coordonnées GPS *strictement identiques* avec un autre
établissement bien réel et distinct (le cas le plus fréquent : une école
maternelle et une école élémentaire du même groupe scolaire ; ou une cité
scolaire collège + lycée). La source de géolocalisation donne des coordonnées au
niveau du *bâtiment*, pas de l'entité administrative.

Fix appliqué : `regrouperParSite()` (`src/utils/joinData.js`) regroupe les
établissements filtrés par coordonnées identiques (`site_key`, calculé dans
`prepare_data.py`) et **la carte n'affiche plus qu'un seul marqueur par site**
(icône grise avec badge du nombre d'établissements). Cliquer dessus ouvre la
fiche du premier établissement du site, avec un petit sélecteur "Même site" en
haut du panneau pour basculer vers les autres.

**"Certaines fiches n'ont que le nombre d'élèves"** — ce n'est pas un bug non
plus, c'est une vraie limite des jeux de données officiels :

- L'IPS n'est publié par le ministère que pour les établissements dépassant un
  certain effectif (anonymisation) — une part significative des écoles primaires
  n'ont pas d'IPS publié, contre la quasi-totalité des collèges et des lycées.
  Le panneau affiche maintenant un message explicite plutôt qu'un bloc vide
  dans ce cas.
- Le fichier effectifs "lycée_gt" ne couvre que les lycées généraux et
  technologiques : les lycées professionnels n'ont donc pas d'effectif dans
  cette source.

## Fiches enrichies

Chaque fiche exploite maintenant beaucoup plus les données sources :

- **Répartition par niveau** (`EffectifsParNiveau.jsx`) : graphique en barres
  CP→CM2 / 6e→3e / 2nde→Terminale, calculé à partir des colonnes détaillées par
  niveau des fichiers effectifs (jusqu'ici agrégées en un seul total).
- **Positionnement IPS** : en plus de la valeur brute et du bullet-graph
  dép./national, un percentile calculé par `prepare_data.py`
  (`ips_percentile_regional`) affiche "Plus favorisé que X % des collèges" —
  répond directement au besoin de "comprendre le positionnement de
  l'établissement", pas juste lire un chiffre isolé.
- **Nombre de classes** (écoles) et **adresse complète** dans l'en-tête.
- **Sélecteur de fratrie** pour les sites multi-établissements (cf. ci-dessus).
- **Type d'établissement** : dérivé du libellé de nature d'UAI par mot-clé
  (ÉCOLE / COLLÈGE / LYCÉE). Les sections spécialisées et maisons familiales
  rurales (hors périmètre de l'app) sont exclues.
- **REP / REP+** : le fichier effectifs collèges expose deux colonnes booléennes
  mutuellement exclusives (`rep`, `rep0`) — vérifié empiriquement (aucun
  établissement n'a les deux à 1) ; `rep0=1` correspond à REP+.
- **IPS lycées** : pas de moyenne dép./nationale unique "toutes voies confondues" —
  la source les ventile par type de lycée (LEGT/LPO/LP). Le script sélectionne le
  couple correspondant au `type_de_lycee` réel de chaque établissement.
- **Parité filles/garçons** : agrégée par sommation des colonnes par niveau pour
  collèges et lycées. Absente pour les écoles (non ventilée par sexe dans la
  source des effectifs premier degré) — géré par affichage conditionnel.
- **Filières lycée** : générale = somme 1ère+terminale filière "G" ; technologique
  = somme 1ère+terminale par filière (STI2D, STL, STMG, ST2S, STD2A, STHR, TMD, BT).
- **Langues** : toute langue (LV1/LV2, tous niveaux) avec au moins un élève inscrit
  est retenue.
- **Effectifs par niveau (lycée)** : la seconde générale/techno commune (`_gt`)
  est comptée dans le total du niveau "2nde" et dans la filière "Générale" — les
  élèves de seconde n'ont pas encore choisi de filière technologique.
- **Percentile IPS** : calculé sur l'ensemble identité+indicateurs joint, par
  type d'établissement (école / collège / lycée), pas par département — un
  positionnement "toutes zones confondues" plutôt qu'un repère trop local.

## Logique de filtrage (opérateur ET)

`useEtablissementsFiltres()` applique tous les filtres actifs en `AND` et est
mémoïsé avec `useMemo`, recalculé uniquement quand `etablissements` ou `filtres`
changent réellement (le store Zustand ne déclenche pas de re-render sur des objets
qui n'ont pas changé de référence, cf. `structuredClone` dans `setFiltre`).

Un filtre par **département** permet de restreindre la vue à une zone
géographique donnée, sur l'ensemble du territoire couvert par l'app.

## Carte : clustering et logique de zoom

- **Vue d'ensemble** : au dézoom (ou tant qu'aucun département n'est
  sélectionné), la carte affiche une bulle par département avec le nombre
  d'établissements et l'IPS moyen — bien plus lisible que des milliers de
  points individuels sur une carte de France entière.
- **Vue macro (par zone)** : `react-leaflet-cluster` (wrapper de
  `Leaflet.markercluster`) regroupe les marqueurs proches avec un compteur
  dynamique (icône générée par `creerIconeCluster`), pour ne jamais monter des
  milliers de DOM nodes d'un coup.
- **Vue micro** : au zoom, les clusters "explosent" (spiderfy) en marqueurs
  individuels colorés par type (`COULEUR_PAR_TYPE`, partagé entre la carte, la
  légende et les badges — source de vérité unique).
- **Rendu limité au viewport** : à un niveau de zoom suffisant, seuls les sites
  visibles (+ marge adaptative) sont effectivement rendus, pour limiter le
  nombre de marqueurs DOM avec un jeu de données à l'échelle nationale.
- **Survol** : `<Tooltip>` react-leaflet affiche nom / commune / IPS.
- **Clic** : appelle `selectionnerEtablissement(code_uai)` dans le store, ce qui (a)
  ouvre `PanneauDetail`, et (b) déclenche `RecentrerSurSelection` qui fait un
  `flyTo` sur le point.

## Panneau latéral (tableau de bord)

Rendu conditionnel section par section (`etablissement.champ != null`), pour
s'adapter aux profils très différents des établissements sans jamais afficher de
bloc vide. Sur mobile (`< md`), le panneau devient une feuille modale ancrée en
bas d'écran avec overlay cliquable pour fermer.

## Aller plus loin

- Remplacer les fichiers statiques par de vrais appels à l'API data.education.gouv.fr
  (Opendatasoft) dans `init()` — la fonction `joinByUai` fonctionne à l'identique
  avec des données chargées de façon asynchrone ; seul `prepare_data.py` deviendrait
  inutile (ou tournerait côté serveur, en cron, plutôt qu'en one-shot local).
- Ajouter un cache de tuiles / un mode offline pour les zones rurales à faible
  connectivité.
- Étendre `COULEUR_PAR_TYPE` et les badges pour distinguer les sous-types (ex:
  lycée général vs professionnel) si la donnée source le permet.