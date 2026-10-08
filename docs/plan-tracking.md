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

## Soutien Ko-fi

L’invitation apparaît en fin de fiche ou de comparaison après 60 secondes actives et soit trois fiches distinctes consultées, soit une paire de comparaison affichée. Le temps actif exclut les onglets cachés, les fenêtres sans focus et les périodes sans interaction depuis plus de 30 secondes. Les noms/UAI restent uniquement en mémoire pour dédupliquer les fiches.

La visibilité d’au moins 50 % de l’encart réserve l’unique présentation de la session d’onglet (sessionStorage). Fermer ou « Plus tard » repousse la prochaine proposition de 30 jours ; cliquer vers Ko-fi la repousse de 90 jours (localStorage). Ces préférences ne suivent pas l’utilisateur entre appareils et peuvent disparaître si le stockage est effacé ou bloqué. Le clic ne prouve pas une contribution.

| Événement | Déclenchement | Propriétés |
|---|---|---|
| soutien-vu | Au moins 50 % de l’encart visible, une fois par session d’onglet | contexte : fiche/comparaison ; type_etablissement |
| soutien-clic | Ouverture du lien Ko-fi | mêmes propriétés |
| soutien-ferme | Croix ou bouton « Plus tard » | mêmes propriétés |

Observer les vues et clics par contexte et type, puis vérifier les contributions effectives dans Ko-fi. Aucun paiement ni email n’est envoyé aux outils d’analytics. Le lien externe est ouvert dans un nouvel onglet ; aucun widget tiers n’est chargé sur Trajectoires.
