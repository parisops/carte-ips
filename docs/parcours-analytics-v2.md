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

## Extensions du parcours (octobre 2026)

| Événement | Déclenchement | Propriétés |
| --- | --- | --- |
| `journey_search_completed` | Sélection d'une suggestion | `result_type`, `result=selected` |
| `journey_search_no_suggestions` | Première absence de suggestions | `entry_point` |
| `journey_search_list_school_selected` | Sélection d'une école dans la liste des résultats d'une commune | `school_type` |
| `journey_filter_changed` | Modification d'un filtre hors saisie libre | `filter_name`, `action` |
| `journey_filters_reset` | Réinitialisation des filtres | — |
| `journey_filters_opened` | Ouverture du panneau de filtres | `surface` |
| `journey_school_details_loaded` | Première fiche chargée par niveau | `school_type` |
| `journey_school_section_opened` | Expansion de la démographie | `section`, `school_type` |
| `journey_comparison_dialog_opened` | Ouverture de la comparaison | `school_type`, `school_count` |
| `journey_comparison_result_viewed` | Résultat de comparaison affiché | `school_type`, `school_count` |
| `journey_onboarding_completed` | Validation de l'accueil | — |
| `journey_onboarding_opened` | Consultation volontaire de l'accueil | `source` |
| `journey_legal_opened` | Affichage des mentions légales | — |
| `journey_support_opened` | Ouverture du module de soutien | `source` |
| `journey_support_outbound` | Clic vers Ko-fi | `source` |

Les jalons de détail et comparaison conservent une définition précise : un panneau chargé ou un comparatif affiché n'attestent pas d'une lecture attentive. `journey_search_no_suggestions` est un signal initial dédupliqué, et non un taux exhaustif d'échec de recherche. Les événements historiques Premium ne sont pas supprimés de la base Umami; l'encart Premium des fiches Lycée est retiré de l'interface.

## Décisions produit mensuelles

1. Comparer les appareils pour les conversions `app_ready → first_school_opened → exploration_qualified`.
2. Étudier les utilisateurs ayant focalisé la recherche sans sélectionner de suggestion.
3. Examiner combien explorent deux établissements et combien commencent puis aboutissent à une comparaison.
4. Analyser par `school_type` les détails consultés, et la fréquence d'ouverture de la démographie.
5. Mesurer les taux `support_opened → support_outbound` sans confondre clic sortant et don réalisé.

## Recette complémentaire

- Tester les filtres de type, statut, dispositif, IPS, département et leur réinitialisation; aucune recherche libre n'est transmise.
- Tester une fiche Lycée sur ordinateur et mobile : **aucun encart Premium**; conserver tous les indicateurs et le bouton de comparaison.
- Vérifier les fiches École/Collège : aucun changement involontaire d'affichage.
- Vérifier les jalons d'ouverture de comparaison et de consultation détaillée.
- Vérifier qu'un clic Ko-fi n'enregistre pas une conversion financière.
