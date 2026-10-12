# Parcours utilisateur — tracking v2 (Umami Cloud Free)

## Objectif

Comprendre où les visiteurs passent de la recherche à une consultation puis à une exploration approfondie et à une comparaison. Les événements `journey_*` sont **additionnels** aux anciens événements pour éviter de casser les séries historiques.

## Événements et règles

| Événement | Déclenchement | Fréquence | Propriétés |
| --- | --- | --- | --- |
| `journey_app_opened` | Chargement de l'app | une fois par onglet via sessionStorage | `entry_point=map` |
| `journey_app_ready` | Catalogue chargé ou erreur | une fois par onglet; la première issue est conservée | `result=success/error` |
| `journey_search_focused` | Premier focus de recherche | une fois par onglet | `entry_point=main_search` |
| `journey_search_started` | Première saisie non vide | une fois par onglet | `entry_point=main_search` |
| `journey_search_submitted` | Entrée sans suggestion active | à chaque validation | `has_suggestions`, `search_length_bucket` |
| `journey_search_result_selected` | Clic ou validation d'une suggestion | à chaque sélection | `result_type`, `suggestion_count_bucket` |
| `journey_search_selected` | Suggestion acceptée dans le store | à chaque sélection | `search_type` |
| `journey_school_opened` | Sélection d'une fiche différente de celle ouverte | à chaque changement | `school_type`, `source` |
| `journey_first_school_opened` | Première fiche distincte | une fois par onglet | `school_type` |
| `journey_exploration_qualified` | Deuxième UAI distinct consulté | une fois par onglet | `rule=two_distinct_schools` |
| `journey_comparison_started` | Premier établissement ajouté | une fois par type et onglet | `school_type` |
| `journey_comparison_pair_ready` | Deuxième établissement ajouté | une fois par type et onglet | `school_type` |
| `journey_comparison_completed` | Paire effectivement affichée avec données chargées | une fois par type et onglet | `school_type`, `school_count=2` |

**Important** : une session d'onglet n'est pas identique à une session Umami. Les jalons dédupliqués sont des *proxys* d'étapes, pas des cohortes de personnes. Le funnel Umami doit être interprété avec cette réserve. L'export événementiel peut permettre des analyses plus fines si les données de session nécessaires sont présentes.

## Indicateurs de pilotage

- **Activation** : sessions avec `journey_first_school_opened` / sessions avec `journey_app_ready` (succès). Dénominateur à harmoniser avec Umami.
- **Exploration qualifiée** : sessions avec `journey_exploration_qualified` / sessions activées.
- **Comparaison** : sessions avec `journey_comparison_completed` / sessions ayant commencé une comparaison.
- **Friction de recherche** : validation sans suggestion, puis absence de fiche ouverte dans la même session. Ce n'est pas une preuve de recherche infructueuse ; instrumenter une vraie liste de résultats si l'UX évolue.
- **Segments** : appareil (dimension Umami), type d'école, entrée par recherche ou carte.

## Protection de la vie privée

Ne jamais envoyer de nom, UAI, commune recherchée, adresse, texte tapé ni email dans Umami/GoatCounter. Les codes UAI restent seulement en mémoire d'onglet pour compter les établissements distincts. Les propriétés envoyées sont catégorielles (types et classes de longueur, jamais contenu). Pas d'ID utilisateur persistant ni de tracking inter-onglets : une rétention individuelle fiable n'est **pas** mesurable.

## Recette manuelle

1. Ouvrir l'app avec sessionStorage vide; confirmer `journey_app_opened` puis `journey_app_ready`.
2. Focus et saisie de recherche; confirmer une seule émission des événements de début et l'absence du texte saisi.
3. Choisir une suggestion commune et une suggestion établissement; contrôler les types catégoriels.
4. Ouvrir puis rouvrir la même fiche; `journey_school_opened` doit suivre les changements de sélection, `journey_first_school_opened` ne doit arriver qu'une fois.
5. Ouvrir une deuxième fiche différente; confirmer `journey_exploration_qualified` une fois.
6. Ajouter deux établissements de même niveau et attendre les données : vérifier `journey_comparison_started`, `journey_comparison_pair_ready`, `journey_comparison_completed`.
7. Recharger : les jalons dédupliqués ne doivent pas être rejoués; test séparé en sessionStorage vierge.
8. Vérifier tablette/mobile, scripts analytiques bloqués et navigation en mode privé : aucune panne de l'app.

## Analyse et limites

Un test navigateur et un contrôle d'événements réels dans Umami restent nécessaires. Les événements générés avant déploiement ne sont pas rétroactifs. Les anciens événements restent en place et représentent une métrique différente.
