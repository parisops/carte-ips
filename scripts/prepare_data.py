"""
Prépare les données officielles data.education.gouv.fr pour l'app.

Ce script tourne UNE FOIS, en amont (build-time), pas côté client : les fichiers
sources bruts pèsent ~28 Mo cumulés et comptent jusqu'à 500 colonnes (une par
niveau × filière × langue pour les lycées) — les envoyer tels quels au navigateur
serait absurde. On les normalise ici vers le schéma métier de l'app.

La jointure `code_uai` reste néanmoins bien présente et bien réelle :
- ce script fusionne les indicateurs (IPS + effectifs, 6 fichiers sources)
- l'app, elle, joint côté client ces indicateurs avec la localisation
  (`identite.json`), qui reste une source distincte (cf. `src/utils/joinData.js`).
  C'est cette jointure identité ↔ indicateurs qui est la vraie question
  "un établissement peut être connu d'une source et pas de l'autre" que le
  brief voulait illustrer.

Sorties : public/data/identite.json, public/data/indicateurs.json
"""

import json
import re
from pathlib import Path
from collections import defaultdict

SRC = Path(__file__).parent.parent / "data-source"
OUT = Path(__file__).parent.parent / "public" / "data"

LANGUES_LABELS = {
    "allemand": "Allemand",
    "anglais": "Anglais",
    "espagnol": "Espagnol",
    "italien": "Italien",
    "autres_langues": "Autres langues",
}

FILIERES_TECHNO = ["sti2d", "stl", "stmg", "st2s", "std2a", "sthr", "tmd", "bt"]

# Filières du bac général/techno telles que nommées dans le fichier de RÉSULTATS
# (indicateurs-de-resultat-des-lycees-gt) — nommage légèrement différent du
# fichier EFFECTIFS ("s2tmd" au lieu de "tmd", pas de "bt" qui est un lycée pro).
FILIERES_RESULTATS_GT = ["sti2d", "std2a", "stmg", "stl", "st2s", "s2tmd", "sthr", "l", "es", "s"]
LABEL_FILIERE_GT = {
    "gnle": "Générale", "sti2d": "STI2D", "std2a": "STD2A", "stmg": "STMG",
    "stl": "STL", "st2s": "ST2S", "s2tmd": "S2TMD", "sthr": "STHR",
    "l": "L", "es": "ES", "s": "S",
}

# Filières du bac pro, telles que nommées dans le fichier de résultats. NB:
# "services" semble être un regroupement de "pluri_services"+"echanges"
# (présents_services = présents_pluri_services + présents_echanges dans
# l'échantillon) — exclu ici pour éviter un double-comptage dans les graphiques.
FILIERES_PRO = [
    "pluri_techno", "transfo", "genie_civil", "mat_souples", "meca_elec",
    "production", "pluri_services", "echanges", "communication",
    "serv_personnes", "serv_collec",
]
LABEL_FILIERE_PRO = {
    "pluri_techno": "Pluritechnologique", "transfo": "Transformation",
    "genie_civil": "Génie civil", "mat_souples": "Matériaux souples",
    "meca_elec": "Mécanique-électricité", "production": "Production",
    "pluri_services": "Pluriservices", "echanges": "Échanges & gestion",
    "communication": "Communication", "serv_personnes": "Services aux personnes",
    "serv_collec": "Services aux collectivités",
}


def load(name):
    with open(SRC / name, encoding="utf-8") as f:
        return json.load(f)


def to_float(v):
    if v is None or v == "":
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def to_int(v):
    f = to_float(v)
    return int(f) if f is not None else None


# ---------------------------------------------------------------------------
# 1. IDENTITÉ — localisation, une ligne par établissement
# ---------------------------------------------------------------------------

def type_depuis_nature(libelle):
    libelle = (libelle or "").upper()
    if "LYCEE" in libelle:
        return "Lycée"
    if "COLLEGE" in libelle:
        return "Collège"
    if "ECOLE" in libelle:
        return "École"
    return None


def construire_identite():
    brut = load("fr-en-adresse-et-geolocalisation-etablissements-premier-et-second-degre.json")
    resultat = []
    for e in brut:
        if e.get("etat_etablissement_libe") != "OUVERT":
            continue
        type_etab = type_depuis_nature(e.get("nature_uai_libe"))
        if type_etab is None:
            continue  # sections spécialisées / MFR hors périmètre école-collège-lycée
        lat, lon = e.get("latitude"), e.get("longitude")
        if lat is None or lon is None:
            continue
        resultat.append({
            "code_uai": e["numero_uai"],
            "nom_etablissement": (e.get("appellation_officielle") or e.get("patronyme_uai") or "").strip(),
            "type_etablissement": type_etab,
            "statut": e.get("secteur_public_prive_libe"),
            "adresse": e.get("adresse_uai"),
            "commune": e.get("libelle_commune"),
            "code_postal": e.get("code_postal_uai"),
            "departement": e.get("libelle_departement"),
            "latitude": lat,
            "longitude": lon,
            # Regroupe les établissements strictement co-localisés (école
            # maternelle + élémentaire d'un même groupe scolaire, cité
            # scolaire collège + lycée...) : ce sont de VRAIS établissements
            # distincts, pas des doublons, mais ils se superposent
            # exactement sur la carte. `site_key` sert à les afficher comme
            # un seul marqueur groupé côté client (cf. utils/joinData.js).
            "site_key": f"{round(lat, 5)}_{round(lon, 5)}",
        })
    return resultat


# ---------------------------------------------------------------------------
# 2. IPS — un enregistrement normalisé par établissement, 3 sources fusionnées
# ---------------------------------------------------------------------------

def construire_ips():
    ips_par_uai = {}

    for e in load("fr-en-ips-ecoles-ap2022.json"):
        ips_par_uai[e["uai"]] = {
            "ips_etablissement": to_float(e.get("ips")),
            "ips_moy_departement": to_float(e.get("ips_departemental")),
            "ips_moy_academie": to_float(e.get("ips_academique")),
            "ips_moy_national": to_float(e.get("ips_national")),
            "ips_millesime": e.get("rentree_scolaire"),
        }

    for e in load("fr-en-ips-colleges-ap2023.json"):
        ips_par_uai[e["uai"]] = {
            "ips_etablissement": to_float(e.get("ips")),
            "ips_moy_departement": to_float(e.get("ips_departemental")),
            "ips_moy_academie": to_float(e.get("ips_academique")),
            "ips_moy_national": to_float(e.get("ips_national")),
            "ips_millesime": e.get("rentree_scolaire"),
        }

    for e in load("fr-en-ips-lycees-ap2023.json"):
        # Les lycées n'ont pas de moyenne dép./acad./nationale "toutes voies" unique :
        # elles sont ventilées par type de lycée (LEGT / LPO / LP). On prend le
        # triplet correspondant au type réel de l'établissement.
        suffixe = (e.get("type_de_lycee") or "legt").lower()
        ips_par_uai[e["uai"]] = {
            "ips_etablissement": to_float(e.get("ips_etab")),
            "ips_moy_departement": to_float(e.get(f"ips_departemental_{suffixe}")),
            "ips_moy_academie": to_float(e.get(f"ips_academique_{suffixe}")),
            "ips_moy_national": to_float(e.get(f"ips_national_{suffixe}")),
            "ips_millesime": e.get("rentree_scolaire"),
        }

    return ips_par_uai


# ---------------------------------------------------------------------------
# 3. EFFECTIFS — démographie, parité, inclusivité, langues, filières
# ---------------------------------------------------------------------------

def extraire_langues(record):
    langues = set()
    for cle, valeur in record.items():
        if "_lv1_" not in cle and "_lv2_" not in cle:
            continue
        if not (isinstance(valeur, (int, float)) and valeur > 0):
            continue
        for slug, label in LANGUES_LABELS.items():
            if cle.endswith(slug):
                langues.add(label)
                break
    return sorted(langues)


def construire_effectifs_ecoles():
    out = {}
    for e in load("fr-en-ecoles-effectifs-nb_classes.json"):
        rep = str(e.get("rep")) == "1"
        rep_plus = str(e.get("rep_plus")) == "1"
        par_niveau = {
            "Préélémentaire": to_int(e.get("nombre_eleves_preelementaire_hors_ulis")),
            "CP": to_int(e.get("nombre_eleves_cp_hors_ulis")),
            "CE1": to_int(e.get("nombre_eleves_ce1_hors_ulis")),
            "CE2": to_int(e.get("nombre_eleves_ce2_hors_ulis")),
            "CM1": to_int(e.get("nombre_eleves_cm1_hors_ulis")),
            "CM2": to_int(e.get("nombre_eleves_cm2_hors_ulis")),
        }
        out[e["numero_ecole"]] = {
            "effectif_total": to_int(e.get("nombre_total_eleves")),
            "effectif_filles": None,  # non ventilé par sexe dans cette source
            "effectif_garcons": None,
            "nombre_classes": to_int(e.get("nombre_total_classes")),
            "effectifs_millesime": e.get("rentree_scolaire"),
            "label_rep": "REP+" if rep_plus else ("REP" if rep else None),
            "effectif_ulis": to_int(e.get("nombre_eleves_ulis")) or 0,
            "effectif_segpa": 0,
            "langues_lv1_lv2": [],
            "effectifs_par_niveau": {k: v for k, v in par_niveau.items() if v},
            "effectifs_filiere_gen": None,
            "effectifs_filiere_techno": None,
        }
    return out


def construire_effectifs_colleges():
    out = {}
    niveaux = ["6eme", "5eme", "4eme", "3eme"]
    for e in load("fr-en-college-effectifs-niveau-sexe-lv.json"):
        filles = sum(to_int(e.get(f"{n}_filles")) or 0 for n in niveaux)
        # Les clés "garçons" sont orthographiées différemment des clés "filles"
        # dans cette source ("6emes_garcons" pluriel vs "6eme_filles" singulier).
        garcons = sum(to_int(e.get(f"{n}s_garcons")) or 0 for n in niveaux)

        par_niveau = {
            "6e": to_int(e.get("nombre_total_de_6emes")),
            "5e": to_int(e.get("nombre_total_de_5emes")),
            "4e": to_int(e.get("nombre_total_de_4emes")),
            "3e": to_int(e.get("nombre_total_de_3emes")),
        }

        rep = str(e.get("rep")) == "1"
        rep_plus = str(e.get("rep0")) == "1"  # champ mal nommé côté source, confirmé = indicateur REP+

        out[e["numero_college"]] = {
            "effectif_total": to_int(e.get("nombre_eleves_total")),
            "effectif_filles": filles or None,
            "effectif_garcons": garcons or None,
            "nombre_classes": None,
            "effectifs_millesime": e.get("rentree_scolaire"),
            "label_rep": "REP+" if rep_plus else ("REP" if rep else None),
            "effectif_ulis": to_int(e.get("nombre_d_eleves_total_ulis")) or 0,
            "effectif_segpa": to_int(e.get("nombre_d_eleves_total_segpa")) or 0,
            "langues_lv1_lv2": extraire_langues(e),
            "effectifs_par_niveau": {k: v for k, v in par_niveau.items() if v},
            "effectifs_filiere_gen": None,
            "effectifs_filiere_techno": None,
        }
    return out


def construire_effectifs_lycees():
    out = {}
    pattern = re.compile(r"^(2ndes|1eres|terminales)_(g|gt|sti2d|stl|stmg|st2s|std2a|sthr|tmd|bt)$")
    label_niveau = {"2ndes": "2nde", "1eres": "1ère", "terminales": "Terminale"}

    for e in load("fr-en-lycee_gt-effectifs-niveau-sexe-lv.json"):
        filles = 0
        garcons = 0
        gen = 0
        techno = defaultdict(int)
        par_niveau = defaultdict(int)

        for cle, valeur in e.items():
            if not isinstance(valeur, (int, float)):
                continue
            m = pattern.match(cle)
            if m:
                niveau, filiere = m.groups()
                par_niveau[label_niveau[niveau]] += valeur
                if filiere in ("g", "gt"):
                    gen += valeur
                elif filiere in FILIERES_TECHNO:
                    techno[filiere.upper()] += valeur
                continue
            if cle.endswith("_filles"):
                filles += valeur
            elif cle.endswith("_garcons"):
                garcons += valeur

        out[e["numero_lycee"]] = {
            "effectif_total": to_int(e.get("nombre_d_eleves")),
            "effectif_filles": filles or None,
            "effectif_garcons": garcons or None,
            "nombre_classes": None,
            "effectifs_millesime": e.get("rentree_scolaire"),
            "label_rep": None,  # pas de suivi REP au lycée dans cette source
            "effectif_ulis": 0,
            "effectif_segpa": 0,
            "langues_lv1_lv2": extraire_langues(e),
            "effectifs_par_niveau": {k: v for k, v in par_niveau.items() if v},
            "effectifs_filiere_gen": gen or None,
            "effectifs_filiere_techno": dict(techno) if techno else None,
        }
    return out


def construire_indicateurs(identite):
    ips = construire_ips()
    effectifs = {}
    effectifs.update(construire_effectifs_ecoles())
    effectifs.update(construire_effectifs_colleges())
    effectifs.update(construire_effectifs_lycees())

    tous_les_uai = set(ips) | set(effectifs)
    resultat = []
    for uai in tous_les_uai:
        entree = {"code_uai": uai}
        entree.update(ips.get(uai, {}))
        entree.update(effectifs.get(uai, {}))
        resultat.append(entree)

    ajouter_percentiles_ips(resultat, identite)
    return resultat


def ajouter_percentiles_ips(indicateurs, identite):
    """
    Calcule, pour chaque établissement, le pourcentage d'établissements DU MÊME
    TYPE (école / collège / lycée) en Île-de-France dont l'IPS est inférieur ou
    égal au sien. C'est ce qui permet d'afficher un vrai "positionnement" dans la
    fiche ("plus favorisé que 72% des collèges franciliens") plutôt qu'un simple
    chiffre brut sans repère.
    """
    type_par_uai = {e["code_uai"]: e["type_etablissement"] for e in identite}

    par_type = defaultdict(list)
    for e in indicateurs:
        type_etab = type_par_uai.get(e["code_uai"])
        if type_etab and e.get("ips_etablissement") is not None:
            par_type[type_etab].append(e["ips_etablissement"])

    for valeurs in par_type.values():
        valeurs.sort()

    for e in indicateurs:
        type_etab = type_par_uai.get(e["code_uai"])
        ips = e.get("ips_etablissement")
        valeurs = par_type.get(type_etab)
        if ips is None or not valeurs:
            e["ips_percentile_regional"] = None
            continue
        import bisect
        rang = bisect.bisect_right(valeurs, ips)
        e["ips_percentile_regional"] = round(100 * rang / len(valeurs))


def moyenne_ponderee(valeur_a, poids_a, valeur_b, poids_b):
    """Moyenne pondérée entre deux voies (ex: GT et Pro d'un même lycée
    polyvalent). Tolérant : si une seule valeur est connue, la renvoie telle
    quelle plutôt que d'échouer."""
    a_ok = valeur_a is not None and poids_a
    b_ok = valeur_b is not None and poids_b
    if a_ok and b_ok:
        return (valeur_a * poids_a + valeur_b * poids_b) / (poids_a + poids_b)
    if a_ok:
        return valeur_a
    if b_ok:
        return valeur_b
    return None


def extraire_lycee(e, filieres, labels):
    """Normalise une ligne de résultats lycée (GT ou Pro) vers le schéma commun."""
    presents = to_float(e.get("presents_total")) or 0

    mentions = {}
    for cle, label in [("ab", "AB"), ("b", "B")]:
        n = to_int(e.get(f"nb_mentions_{cle}_g")) or to_int(e.get(f"nb_mentions_{cle}_t")) or to_int(e.get(f"nb_mentions_{cle}_p"))
        if n:
            mentions[label] = mentions.get(label, 0) + n
    # "Très bien" : la voie GT distingue avec/sans félicitations, la voie pro non.
    tb_avecf = (to_int(e.get("nb_mentions_tb_avecf_g")) or 0) + (to_int(e.get("nb_mentions_tb_avecf_t")) or 0)
    tb_sansf = (to_int(e.get("nb_mentions_tb_sansf_g")) or 0) + (to_int(e.get("nb_mentions_tb_sansf_t")) or 0) + (to_int(e.get("nb_mentions_tb_sansf_p")) or 0)
    if tb_avecf:
        mentions["TB avec félic."] = tb_avecf
    if tb_sansf:
        mentions["TB sans félic."] = tb_sansf

    taux_acces = []
    for cle, label in [("2nde", "Accès en 2nde"), ("1ere", "Accès en 1ère"), ("term", "Accès en Terminale")]:
        valeur = to_float(e.get(f"taux_acces_{cle}"))
        if valeur is not None:
            taux_acces.append({"label": label, "valeur": valeur, "va": to_float(e.get(f"va_acces_{cle}"))})

    par_filiere = {}
    for code in filieres:
        v = to_float(e.get(f"taux_reu_{code}"))
        if v is not None:
            par_filiere[labels.get(code, code.upper())] = v

    return {
        "presents": presents,
        "taux_reussite": to_float(e.get("taux_reu_total")),
        "va_taux_reussite": to_float(e.get("va_reu_total")),
        "taux_mentions": to_float(e.get("taux_men_total")),
        "va_taux_mentions": to_float(e.get("va_men_total")),
        "mentions_detail": mentions,
        "taux_acces": taux_acces,
        "taux_reussite_par_filiere": par_filiere,
        "resultats_millesime": e.get("annee"),
    }


def fusionner_dicts_somme(a, b):
    """Fusionne deux dicts {label: nombre} en additionnant les valeurs des clés
    communes (au lieu de les écraser comme le ferait un simple spread)."""
    fusion = dict(a)
    for cle, valeur in b.items():
        fusion[cle] = fusion.get(cle, 0) + valeur
    return fusion


def fusionner_voies(gt, pro):
    """Fusionne les résultats GT et Pro d'un même lycée polyvalent (163 cas en
    IDF) : moyenne pondérée par effectif présenté pour les taux globaux,
    sommation pour les mentions (mêmes libellés AB/B dans les 2 voies),
    concaténation pour les accès et les filières (libellés disjoints entre
    voies) — aucune des deux voies n'est ignorée."""
    if gt and not pro:
        return gt
    if pro and not gt:
        return pro

    fusion = {
        "presents": gt["presents"] + pro["presents"],
        "taux_reussite": moyenne_ponderee(gt["taux_reussite"], gt["presents"], pro["taux_reussite"], pro["presents"]),
        "va_taux_reussite": moyenne_ponderee(gt["va_taux_reussite"], gt["presents"], pro["va_taux_reussite"], pro["presents"]),
        "taux_mentions": moyenne_ponderee(gt["taux_mentions"], gt["presents"], pro["taux_mentions"], pro["presents"]),
        "va_taux_mentions": moyenne_ponderee(gt["va_taux_mentions"], gt["presents"], pro["va_taux_mentions"], pro["presents"]),
        "mentions_detail": fusionner_dicts_somme(gt["mentions_detail"], pro["mentions_detail"]),
        "taux_acces": gt["taux_acces"] + [
            {**a, "label": a["label"] + " (pro)"} for a in pro["taux_acces"]
        ],
        "taux_reussite_par_filiere": {**gt["taux_reussite_par_filiere"], **pro["taux_reussite_par_filiere"]},
        "resultats_millesime": gt.get("resultats_millesime") or pro.get("resultats_millesime"),
    }
    return fusion


def construire_resultats():
    """
    Indicateurs de résultat (IVAC pour les collèges, IVAL pour les lycées) :
    taux de réussite/mentions/rétention BRUTS, et surtout leur VALEUR AJOUTÉE
    (l'écart à ce qu'on attendrait d'un établissement au profil d'élèves
    comparable) — un indicateur officiel de performance nettement plus
    rigoureux qu'un simple percentile IPS, car il neutralise l'effet du
    profil social/scolaire d'entrée. N'existe pas pour les écoles (pas
    d'examen en primaire).
    """
    resultats = {}

    for e in load("fr-en-indicateurs-valeur-ajoutee-colleges.json"):
        taux_mentions = None
        candidats = to_float(e.get("nb_candidats_g"))
        global_mentions = to_int(e.get("nb_mentions_global_g"))
        if candidats and global_mentions is not None:
            taux_mentions = round(100 * global_mentions / candidats, 1)

        mentions = {}
        for cle, label in [("ab", "AB"), ("b", "B"), ("tb", "TB")]:
            n = to_int(e.get(f"nb_mentions_{cle}_g"))
            if n:
                mentions[label] = n

        taux_acces = []
        acces = to_float(e.get("taux_d_acces_6eme_3eme"))
        if acces is not None:
            taux_acces.append({"label": "Accès 6e → 3e", "valeur": acces, "va": None})

        resultats[e["uai"]] = {
            "taux_reussite": to_float(e.get("taux_de_reussite_g")),
            "va_taux_reussite": to_float(e.get("va_du_taux_de_reussite_g")),
            "taux_mentions": taux_mentions,
            "va_taux_mentions": None,  # non publié pour les collèges dans cette source
            "mentions_detail": mentions,
            "taux_acces": taux_acces,
            "taux_reussite_par_filiere": {},
            "resultats_millesime": e.get("session"),
        }

    lycees_gt = {e["uai"]: extraire_lycee(e, FILIERES_RESULTATS_GT, LABEL_FILIERE_GT) for e in load("fr-en-indicateurs-de-resultat-des-lycees-gt_v2.json")}
    # GNLE ("générale", non ventilée par série) traité à part : ajouté après coup
    # à par_filiere pour ne pas polluer la boucle générique ci-dessus.
    for e in load("fr-en-indicateurs-de-resultat-des-lycees-gt_v2.json"):
        gnle = to_float(e.get("taux_reu_gnle"))
        if gnle is not None:
            lycees_gt[e["uai"]]["taux_reussite_par_filiere"]["Générale"] = gnle

    lycees_pro = {e["uai"]: extraire_lycee(e, FILIERES_PRO, LABEL_FILIERE_PRO) for e in load("fr-en-indicateurs-de-resultat-des-lycees-pro_v2.json")}

    for uai in set(lycees_gt) | set(lycees_pro):
        resultats[uai] = fusionner_voies(lycees_gt.get(uai), lycees_pro.get(uai))
        resultats[uai].pop("presents", None)

    for uai, r in resultats.items():
        r["code_uai"] = uai
    return list(resultats.values())


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    identite = construire_identite()
    indicateurs = construire_indicateurs(identite)
    resultats = construire_resultats()

    with open(OUT / "identite.json", "w", encoding="utf-8") as f:
        json.dump(identite, f, ensure_ascii=False)
    with open(OUT / "indicateurs.json", "w", encoding="utf-8") as f:
        json.dump(indicateurs, f, ensure_ascii=False)
    with open(OUT / "resultats.json", "w", encoding="utf-8") as f:
        json.dump(resultats, f, ensure_ascii=False)

    print(f"identite.json     : {len(identite)} établissements")
    print(f"indicateurs.json  : {len(indicateurs)} établissements")
    print(f"resultats.json    : {len(resultats)} établissements (collèges + lycées uniquement)")

    uai_identite = {e["code_uai"] for e in identite}
    uai_indicateurs = {e["code_uai"] for e in indicateurs}
    print(f"→ jointure : {len(uai_identite & uai_indicateurs)} établissements présents dans les deux sources")
    print(f"→ identité sans indicateurs : {len(uai_identite - uai_indicateurs)}")
    print(f"→ indicateurs sans identité : {len(uai_indicateurs - uai_identite)}")

    sites = defaultdict(int)
    for e in identite:
        sites[e["site_key"]] += 1
    multi = [n for n in sites.values() if n > 1]
    print(f"→ sites (coordonnées uniques) : {len(sites)}, dont {len(multi)} regroupant plusieurs établissements ({sum(multi)} établissements concernés)")

    print()
    print("Complétude par type (sur la jointure identité + indicateurs) :")
    type_par_uai = {e["code_uai"]: e["type_etablissement"] for e in identite}
    ind_par_uai = {e["code_uai"]: e for e in indicateurs}
    for t in ["École", "Collège", "Lycée"]:
        uais = [u for u, ty in type_par_uai.items() if ty == t and u in ind_par_uai]
        has_ips = sum(1 for u in uais if ind_par_uai[u].get("ips_etablissement") is not None)
        has_eff = sum(1 for u in uais if ind_par_uai[u].get("effectif_total") is not None)
        n = len(uais) or 1
        print(f"  {t:8s} {len(uais):5d} ét. | IPS connu {has_ips:5d} ({100*has_ips//n:3d}%) | effectif connu {has_eff:5d} ({100*has_eff//n:3d}%)")


if __name__ == "__main__":
    main()
