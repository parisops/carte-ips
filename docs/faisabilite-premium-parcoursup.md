# Faisabilité du Premium Parcoursup de Trajectoires

Étude réalisée le 8 septembre 2026. Sources officielles, lecture des schémas d’API et essais sur les exports récents. Aucun changement du fonctionnement de l’application ni déploiement dans le cadre de cette étude.

## Décision proposée

Un MVP utile aux parents est réalisable : explorer les parcours associés aux spécialités, comparer les formations et préparer une sélection personnelle. En revanche, les sources examinées ne permettent pas de reconstituer les destinations de tous les bacheliers de chaque lycée ni de mesurer un « bonus Parcoursup » lié au lycée d’origine.

La promesse recommandée est « Du lycée aux études supérieures : comprendre les possibilités et préparer ses choix ». Le lycée apporte le contexte scolaire ; les spécialités et les préférences de la famille guident l’exploration ; les chiffres d’admission décrivent les formations d’accueil. Ces trois niveaux restent identifiés à l’écran.

Le trio le plus utile pour démarrer est : spécialités de terminale par lycée + Parcoursup par combinaison de spécialités + admissions Parcoursup par formation. IVAL et IPS, déjà présents dans Trajectoires, enrichissent le contexte. Le catalogue courant des formations est nécessaire pour vérifier que les formations historiques existent encore.

## Les données disponibles

| Source officielle | Millésime vérifié | Apport au produit | Jointure et limite |
|---|---|---|---|
| [Spécialités de terminale générale](https://data.education.gouv.fr/explore/dataset/fr-en-effectifs-specialites-doublettes-terminale-generale/) | Rentrée 2025 ; 2 273 établissements | Spécialités suivies, 15 principales combinaisons publiées, effectifs | `numero_etablissement` → `code_uai`. Des effectifs observés ne garantissent pas l’offre de la rentrée suivante. Données ventilées par sexe ; petites cellules masquées. |
| [Spécialités de première générale](https://data.education.gouv.fr/explore/dataset/fr-en-effectifs-specialites-triplettes-1ere-generale/) | Dernière observation annoncée : octobre 2025 | Exploration des choix de trois spécialités en première | Même jointure UAI ; seules les principales combinaisons sont détaillées. Utile pour les familles de seconde. |
| [Parcoursup 2025 par spécialités — nouvelle base](https://data.enseignementsup-recherche.gouv.fr/explore/dataset/fr-esr-parcoursup-enseignements-de-specialite-bacheliers-generaux-3/) | Bac 2025 ; 17 211 lignes ; traitement du 26 mai 2026 | Candidats, propositions et acceptations par combinaison et famille de formation, avec un niveau plus fin dont MPSI/PCSI | `doublette`, `formation`, `niveau_d_agregation`, `annee_du_bac`. Statistiques nationales, sans UAI de lycée d’origine ni identifiant de formation locale. |
| [Admissions Parcoursup](https://data.enseignementsup-recherche.gouv.fr/explore/dataset/fr-esr-parcoursup/) | Session 2025 ; 14 252 formations hors apprentissage ; traitement du 9 mars 2026 | Capacité, candidatures, propositions, acceptations, taux d’accès publié, profils des admis | `cod_aff_form` identifie la formation ; `cod_uai` désigne son établissement d’accueil. |
| [Catalogue des formations Parcoursup](https://data.enseignementsup-recherche.gouv.fr/explore/dataset/fr-esr-cartographie_formations_parcoursup/) | 25 828 lignes pour 2026 lors du test ; traitement quotidien observé le 8 septembre 2026 | Formations actuellement référencées, localisation, internat, apprentissage, liens officiels | `gta` correspond à l’identifiant Parcoursup ; conserver l’année et vérifier les changements de libellé, d’établissement ou de périmètre. |
| [IVAL des lycées généraux et technologiques](https://data.education.gouv.fr/explore/dataset/fr-en-indicateurs-de-resultat-des-lycees-gt_v2/) | Session 2025 ; 2 346 établissements ; traitement du 3 avril 2026 | Réussite et accompagnement au bac, valeurs ajoutées | `uai` → `code_uai`. Décrit le parcours au lycée et les résultats au bac, pas la réussite aux admissions du supérieur. |
| [Parcoursup apprentissage](https://data.enseignementsup-recherche.gouv.fr/explore/dataset/fr-esr-parcoursup-apprentissage/) | Sessions 2022 à 2025 ; 11 536 lignes pour 2025 | Extension aux formations en apprentissage | Modèle et indicateurs à traiter séparément ; l’admission dépend aussi de la situation contractuelle avec l’employeur. |
| [InserJeunes par établissement et formation](https://data.education.gouv.fr/explore/dataset/fr-en-inserjeunes-lycee_pro-formation-fine/) | Dernier cumul annoncé : 2023–2024 ; 132 124 lignes tous millésimes | Poursuite d’études et emploi après CAP, bac professionnel, BTS et autres formations couvertes | `uai` + `code_formation_mefstat11` + période. Le code MEF n’est pas le code Parcoursup. Pas de liste des établissements où se poursuivent les études. |
| [InserSup](https://data.enseignementsup-recherche.gouv.fr/explore/dataset/fr-esr-insersup/) | Diffusion 2026 ; structure modifiée en juillet 2026 ; plus d’un million de lignes | Insertion et salaires après certains diplômes du supérieur | UAI/Paysage + diplôme SISE + promotion + population. Pas de correspondance automatique entre une entrée Parcoursup et un diplôme de sortie. À réserver à une extension. |

Les nombres de lignes couvrant plusieurs années ne sont pas des nombres d’établissements uniques. Le champ « modifié » d’un catalogue peut être ancien malgré des traitements récents : conserver séparément session, date d’observation, date de traitement et date de téléchargement.

Les [IPS des lycées](https://data.education.gouv.fr/explore/dataset/fr-en-ips-lycees-ap2023/) restent des indicateurs de contexte social. Ils ne constituent ni une probabilité d’admission ni une mesure de la préférence des formations pour un lycée. Il n’est pas nécessaire d’en faire un facteur de recommandation.

## Essais effectués sur les données

Exports JSON téléchargés depuis les API publiques `api/explore/v2.1/catalog/datasets/.../exports/json`. Le référentiel local examiné est `public/data/identite.json`, avec 4 689 lignes de type « Lycée ». Les résultats portent sur ce référentiel, avant les éventuels filtres d’affichage de la carte.

| Vérification | Résultat | Interprétation |
|---|---:|---|
| UAI des spécialités terminale 2025 retrouvés localement | 2 230 / 2 273, soit 98,1 % | Très bonne correspondance pour cette source de voie générale ; ce n’est pas une couverture de tous les lycées professionnels et technologiques. |
| UAI IVAL GT 2025 retrouvés localement | 2 316 / 2 346 | La jointure scolaire est directement exploitable. |
| Lycées communs au référentiel, aux spécialités 2025 et aux IVAL 2025 | 2 169 | Base initiale possible pour des fiches enrichies ; la complétude de chaque indicateur reste à vérifier. |
| Taux d’accès manquants dans Parcoursup 2025 | 15 / 14 252 | Prévoir « non disponible », jamais remplacer par zéro. |
| Formations 2025 retrouvées par identifiant dans le catalogue 2026 | 13 536 / 14 252, soit environ 95 % | Bon point de départ pour les historiques, à compléter par une vérification de continuité de la formation. |
| Identifiants du catalogue 2026 sans correspondance dans la base 2025 hors apprentissage | 12 292 | Ce nombre inclut notamment l’apprentissage et les nouvelles formations : il ne mesure pas seulement des pertes de données. |
| Correspondances textuelles exactes entre `fil_lib_voe_acc` et les formations fines de la base spécialités | 8 405 / 14 252 lignes | Simple test de chaînes, pas une validation sémantique. Une table de correspondance contrôlée est indispensable. |
| Doublons dans la base spécialités 2025 sur année + combinaison triée + niveau + regroupement + formation | 0 | Clé composite exploitable sur cet export. |

Les libellés changent : « Mathématiques Spécialité » dans Parcoursup 2025 contre des noms de colonnes codifiés côté DEPP ; certaines licences portent un préfixe dans une base et pas dans l’autre. Prévoir une nomenclature interne explicite et conserver les valeurs sources.

## Exemple réel : ce que l’on peut dire

Dans les données nationales 2025, parmi les bacheliers généraux ayant suivi mathématiques et physique-chimie et ayant confirmé au moins un vœu en MPSI, 20 279 sur 34 887 ont reçu au moins une proposition en MPSI, soit **58,1 %**. 7 110 ont accepté une proposition dans cette filière. Il s’agit d’une observation nationale sur des candidats qui ont choisi de postuler, sans ajustement sur leur dossier. [Source : spécialités Parcoursup 2025](https://data.enseignementsup-recherche.gouv.fr/explore/dataset/fr-esr-parcoursup-enseignements-de-specialite-bacheliers-generaux-3/).

La MPSI d’Henri-IV, identifiant Parcoursup `8964`, affiche pour 2025 : 96 places, 8 117 candidatures, 367 propositions, 96 acceptations et un taux d’accès officiel de 6 %. Parmi les 96 néobacheliers admis, 13 viennent du même établissement ; la source publie 14 % après arrondi. Ces chiffres décrivent **le recrutement de cette MPSI**. Ils ne donnent pas le devenir global des terminales d’Henri-IV, ni les chances d’un candidat qui y est scolarisé. [Source : admissions Parcoursup](https://data.enseignementsup-recherche.gouv.fr/explore/dataset/fr-esr-parcoursup/).

Le taux national par spécialités et le taux d’accès de cette MPSI ont des populations et des définitions différentes. Les multiplier, les substituer ou en déduire une probabilité personnalisée serait incorrect.

## Règles de calcul à respecter

1. **Trois entités distinctes.** Le lycée d’origine, une famille nationale de formations et une formation dans un établissement d’accueil ne sont pas interchangeables. Le lien géographique signifie « à proximité », jamais « destination des élèves du lycée ».
2. **Des années identifiées.** La terminale à la rentrée 2024 correspond généralement au bac et à Parcoursup 2025. Les spécialités observées à la rentrée 2025 décrivent une autre cohorte. Vérifier les calendriers particuliers ultramarins. Pour un conseil actuel, afficher explicitement que les admissions sont historiques.
3. **Des niveaux d’agrégation séparés.** La base spécialités 2025 a trois niveaux. Ne pas additionner les lignes détaillées, leurs sous-totaux et les ensembles ; un même candidat peut apparaître dans plusieurs familles pour les vœux ou les propositions. Une visualisation de répartition exige un niveau exhaustif et mutuellement exclusif vérifié.
4. **Le taux d’accès publié est une donnée spécifique.** Il n’est ni `admis / candidats`, ni `places / candidats`, ni une chance individuelle. Utiliser le champ officiel. Les mentions au bac des admis ne donnent pas une moyenne minimale exigée à la candidature. [Méthodologie Parcoursup 2025](https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-esr-parcoursup/attachments/methodologie_opendata_2025pdf).
5. **Pas de faux zéros.** Les spécialités avec de petits effectifs sont masquées. Un total filles + garçons n’est exact que si les deux cellules sont disponibles ; une absence de donnée ne démontre pas l’absence d’une spécialité. Ne pas reconstituer des petits effectifs masqués par soustraction. [Source DEPP](https://data.education.gouv.fr/explore/dataset/fr-en-effectifs-specialites-doublettes-terminale-generale/).
6. **Pas de note synthétique de “prestige Parcoursup”.** IPS, mentions au bac, présence d’une CPGE et recrutement interne mesurent des objets différents. Une combinaison pondérée ne prouve pas un effet du lycée sur l’admission.
7. **Insertion : garder le bon dénominateur.** Distinguer les diplômés, les sortants d’études, les poursuivants et les situations d’emploi couvertes ; ne pas comparer des taux issus de populations ou de temporalités différentes. [InserJeunes](https://data.education.gouv.fr/explore/dataset/fr-en-inserjeunes-lycee_pro-formation-fine/), [InserSup](https://data.enseignementsup-recherche.gouv.fr/explore/dataset/fr-esr-insersup/).

## MVP recommandé

Commencer par la voie générale, pour laquelle le lien avec les spécialités est directement documenté. Les autres voies auront des parcours et sources adaptés, plutôt qu’un formulaire de spécialités qui ne leur correspond pas.

Le parent ouvre une fiche lycée, choisit les deux spécialités de son enfant puis ses domaines d’intérêt et sa zone de recherche. Le service présente les repères nationaux pertinents, permet de comparer quelques formations locales, de conserver une sélection et de préparer les questions pour les journées portes ouvertes. La sélection reste ouverte : une spécialité rarement observée parmi les admis ne doit pas exclure automatiquement une formation.

Valeur Premium à tester : comparaison côte à côte de 3 à 5 formations, sélection sauvegardée, explication claire des chiffres, synthèse partageable en famille. Les sources, dates, absences de données et liens vers les fiches officielles doivent rester visibles. Une règle de correspondance éditoriale vérifiable suffit au départ ; aucun modèle prédictif n’est nécessaire.

L’interface [Parcoursup propose déjà des indicateurs et un simulateur selon le profil scolaire](https://www.parcoursup.gouv.fr/faq/thematiques/formations-disponibles/formations-sur-parcoursup). Les données du simulateur affichées sur ses pages ne sont pas toutes présentes dans les exports examinés : notamment, la base de 14 252 formations ne fournit pas le croisement détaillé moyenne de terminale × spécialités × formation. Ne pas promettre de reproduire ce simulateur avec les seules bases retenues. Un lien vers la fiche officielle est préférable à une dépendance à des appels internes non documentés.

Mon appréciation produit : faire payer uniquement des statistiques gratuites présentées autrement sera difficile. Le potentiel est dans le travail économisé aux parents et la préparation des décisions. Cette appréciation est une hypothèse à tester, pas une demande commerciale démontrée.

## Intégration dans le projet

L’application dispose déjà d’un référentiel UAI, d’un traitement des données avant publication, de fichiers détaillés chargés à la demande et d’une interface React. Ces éléments conviennent au prototype.

Modèle proposé :

| Table logique | Clé | Rôle |
|---|---|---|
| Lycée / contexte scolaire | UAI + rentrée ou session | IPS, IVAL et spécialités observées |
| Statistique nationale de parcours | Session + combinaison + niveau + famille | Indicateurs par spécialités |
| Formation et admissions | Session + identifiant Parcoursup | Chiffres de recrutement |
| Catalogue courant | Année + identifiant Parcoursup | Offre actuelle et liens officiels |
| Correspondance des nomenclatures | Version + identifiant interne | Lien contrôlé entre familles et libellés des différentes bases |

La préparation des données devrait produire des fichiers compacts dédiés au parcours Premium, chargés à l’ouverture. Les exports bruts de l’essai représentent plusieurs dizaines de Mo et n’ont pas à alourdir le chargement de la carte mobile. L’import doit conserver les sources et dates, détecter les changements de schéma, contrôler les identifiants et signaler les données manquantes.

Un véritable accès payant nécessite ensuite comptes, paiement et contrôle des droits côté serveur. Un bouton masqué en React ou un indicateur stocké dans le navigateur ne protège pas un service Premium ; tout fichier servi publiquement demeure accessible.

L’hébergement courant est GitHub Pages, confirmé dans le déploiement du dépôt. Ses [conditions excluent les sites principalement destinés à des transactions commerciales ou à un SaaS commercial](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features#pages). Prévoir un hébergement adapté pour l’offre payante. Cela n’impose pas de changer immédiatement le code de la carte pour réaliser l’étude.

Les métadonnées des bases examinées indiquent la Licence Ouverte 2.0. Elle autorise l’exploitation commerciale avec attribution de la source et de la dernière mise à jour, sans laisser entendre une caution officielle. [Licence Etalab](https://www.etalab.gouv.fr/wp-content/uploads/2017/04/ETALAB-Licence-Ouverte-v2.0.pdf).

## Ordre de réalisation proposé

| Étape | Travail | Critère de sortie |
|---|---|---|
| Prototype de données | Normaliser les spécialités et familles, contrôler les jointures sur un petit ensemble varié de lycées et de formations | Chaque chiffre et chaque rapprochement sont explicables et sourcés ; les cas non couverts restent signalés |
| Prototype parents | Choix des spécialités, exploration et comparaison mobile/ordinateur | Des parents comprennent les chiffres et peuvent constituer leur sélection sans aide |
| Validation commerciale | Liste d’attente puis démonstration à des parents intéressés, avec offre et prix explicites | Preuve d’intérêt pour l’offre précise ; une inscription seule ne prouve pas l’intention de payer |
| Première version payante | Hébergement, comptes, droits, paiement, sauvegarde et gestion des données | Parcours achat → accès → retour utilisateur vérifié |

Ordre de grandeur de planification, non devis : environ 1 à 2 semaines de travail dédié pour un prototype de données et d’interface restreint ; puis plusieurs semaines pour un produit payant exploitable. Les inconnues principales sont la qualité des correspondances entre formations, le périmètre choisi et la validation de la proposition de valeur.

Avec environ 35 visiteurs uniques par jour, raisonner sur les visiteurs réellement exposés à l’offre lycée plutôt que sur toutes les visites. Une centaine d’expositions qualifiées et quelques entretiens peuvent donner des premiers retours, sans constituer une validation statistique. Ne pas fractionner cette audience en de nombreux tests simultanés.

## Ce qui reste à valider

- Les trois bases initialement envisagées par le porteur du projet n’ont pas été précisées ; le trio proposé ici résulte de l’étude.
- La correspondance nationale entre toutes les familles de formations et tous les libellés Parcoursup n’est pas encore construite. Les correspondances textuelles mesurées ne la remplacent pas.
- L’offre effective de spécialités pour la prochaine rentrée doit être vérifiée via un référentiel d’offre ou les établissements ; les effectifs historiques ne suffisent pas.
- L’appariement InserJeunes / InserSup avec chaque formation Parcoursup reste à étudier sur des cas représentatifs avant de promettre des débouchés professionnels dans le MVP.
- Aucun fichier public national donnant un tableau exhaustif lycée d’origine → formations acceptées n’a été identifié parmi les sources examinées. Un partenariat ou une nouvelle publication pourrait changer cette limite ; aucun accès privilégié n’a été supposé.
