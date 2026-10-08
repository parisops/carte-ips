# Mesure des usages et de la comparaison

## Convention

Les anciens noms d’événements sont conservés. `etablissement-selectionne` reçoit désormais une propriété Umami `type_etablissement` (École, Collège, Lycée), en plus du `title` existant. Une consultation correspond à une sélection de fiche, pas à une preuve de lecture complète.

Les événements de parcours ci-dessous portent uniquement sur le type et, pour les ajouts, le nombre d’établissements (1 ou 2). Aucun nom, UAI, email ou texte de recherche n’est envoyé. Le format mobile/ordinateur est disponible dans les dimensions habituelles d’Umami.

Une « session d’onglet » est dédupliquée via sessionStorage : les rechargements ne recommencent pas les étapes. Ce n’est pas la définition de visite propre à Umami ; fermeture d’onglet et stockage bloqué peuvent modifier le comptage. Les événements dédupliqués offrent un repère de parcours, pas un nombre de personnes uniques. Si l’analytics n’est pas chargé ou est bloqué, certaines étapes peuvent manquer.

## Événements ajoutés

| Événement | Déclenchement | Fréquence |
|---|---|---|
| fiche-type-consultee | Première sélection d’une fiche de chaque type | Une fois par type et session d’onglet |
| plusieurs-fiches-consultees | Deuxième établissement distinct consulté, identité conservée uniquement en mémoire locale | Une fois par session d’onglet |
| premium-formulaire-commence | Premier texte saisi dans le champ email, sans envoyer ce texte | Une fois par session d’onglet |
| comparaison-proposee | Au moins 50 % du bouton Comparer visible | Une fois par type et session d’onglet |
| comparaison-ajout | Ajout ou remplacement dans la sélection | Chaque action, avec nombre 1 ou 2 |
| comparaison-commencee | Premier établissement ajouté | Une fois par type et session d’onglet |
| comparaison-paire-constituee | Deux établissements du même type sélectionnés | Une fois par type et session d’onglet |
| comparaison-ouverte | Ouverture du dialogue | Chaque ouverture |
| comparaison-affichee | Paire affichée après chargement des deux blocs de données | Chaque nouvelle paire ou réouverture |
| comparaison-utilisee | Première paire affichée | Une fois par type et session d’onglet |
| comparaison-retrait | Retrait pour remplacer un établissement | Chaque action |

## Lecture dans Umami

1. Répartition de `fiche-type-consultee` par `type_etablissement` : audience concernée. Une session peut explorer plusieurs types ; les parts ne sont pas exclusives.
2. Tunnel, filtré sur un même type : comparaison-proposee → comparaison-commencee → comparaison-paire-constituee → comparaison-utilisee.
3. Comparer ce tunnel sur mobile et ordinateur : abandon au choix du deuxième établissement, puis au chargement de la comparaison.
4. Consulter `comparaison-affichee` et `comparaison-retrait` pour mesurer l’exploration répétée, séparément des étapes dédupliquées.
5. Conserver le tunnel Premium séparé : premium-vu → premium-ouvert → premium-formulaire-commence → premium-inscription. Son ancienne exposition est dédupliquée par chargement de page, donc les dénominateurs diffèrent.

Relever chaque semaine les volumes, les rapports entre étapes et leur répartition par type/appareil. Éviter de confondre compte d’événements, visiteurs uniques et intention de payer. La comparaison gratuite valide un usage ; elle ne valide pas encore une offre payante.

## Prochain test commercial

Après observation de l’usage, proposer un aperçu de dossier et un prix précis aux utilisateurs de comparaison. Ajouter alors dossier-offre-vue, dossier-offre-ouverte et dossier-interet-confirme, avec les mêmes conventions. Ne pas compter un achat avant confirmation serveur du paiement.

## Périmètre du MVP

Deux établissements de même type, sélection conservée pendant le chargement de l’application, recherche indépendante des filtres de la carte, données détaillées chargées par zone et états de reprise en cas d’échec. Pas de persistance après rechargement, paiement, compte ni dossier PDF à ce stade.

## Soutien Ko-fi — bouton café

Le bouton café flottant remplace la bulle de contact. Il apparaît dès une première interaction et reste accessible dans les fiches et dans la comparaison. Il ouvre le message uniquement au clic, dans un dialogue avec focus géré et fermeture par croix, « Plus tard », Échap ou clic extérieur.

Une agitation de 850 ms intervient après 10 secondes puis toutes les 45 secondes. Elle est suspendue pendant l’ouverture, dans un onglet caché et avec la préférence système de réduction des animations. Fermer le message suspend les animations pendant 30 jours ; cliquer sur Ko-fi pendant 90 jours. Le bouton reste cliquable, sans ouverture automatique. Le rappel est stocké localement, sans compte.

| Événement | Déclenchement | Propriétés |
|---|---|---|
| soutien-bouton-vu | Bouton proposé | contexte carte/comparaison, une fois par session d’onglet |
| soutien-ouvert | Clic sur le bouton café | contexte et type_etablissement si disponible |
| soutien-vu | Message ouvert et affiché | mêmes propriétés |
| soutien-clic | Clic vers Ko-fi | mêmes propriétés |
| soutien-ferme | Croix, Plus tard, Échap ou clic extérieur | mêmes propriétés |

Le sens de soutien-vu change : jusqu’à cette évolution il mesurait la visibilité de l’encart inline, désormais il mesure l’affichage du message après clic. Comparer les périodes séparément.

Vérifier les contributions effectives dans Ko-fi : un clic ne prouve pas un paiement. Aucun widget tiers n’est chargé. Le contact reste disponible dans les mentions légales.
