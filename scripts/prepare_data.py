"""
Prépare les données officielles data.education.gouv.fr pour l'app.

Ce script tourne UNE FOIS, en amont (build-time), pas côté client : les fichiers
sources bruts pèsent plusieurs dizaines de Mo cumulés — les envoyer tels quels au
navigateur serait absurde. On les normalise ici vers le schéma métier de l'app.

Sources attendues dans data-source/ :
  - fr-en-adresse-et-geolocalisation-etablissements-premier-et-second-degre.csv
    (identite : localisation. CSV ';' officiel data.gouv.fr — UAI, nom, type,
    secteur, adresse, coordonnees WGS84, etat de l'etablissement.)
  - fr-en-ips-ecoles-ap2022.csv, fr-en-ips_ecoles_v2.csv
  - fr-en-ips-colleges-ap2022.csv, fr-en-ips-colleges-ap2023.csv, fr-en-ips_colleges.csv
  - fr-en-ips-lycees-ap2023.csv, fr-en-ips_lycees.csv
    (IPS multi-annees, empiles ici pour constituer un historique par UAI)
  - fr-en-indicateurs-valeur-ajoutee-colleges.csv (IVAC multi-annees)
  - fr-en-indicateurs-de-resultat-des-lycees-gt_v2.csv (IVAL GT multi-annees)
  - fr-en-indicateurs-de-resultat-des-lycees-pro_v2.json (IVAL Pro)
  - fr-en-ecoles-effectifs-nb_classes.json
  - fr-en-college-effectifs-niveau-sexe-lv.json
  - fr-en-lycee_gt-effectifs-niveau-sexe-lv.json

La jointure `code_uai` reste la meme qu'avant :
  - ce script fusionne les indicateurs (IPS + effectifs + historique)
  - l'app, elle, joint côté client ces indicateurs avec la localisation
    (`identite.json`), qui reste une source distincte (cf. `src/utils/joinData.js`).

Points cles de cette version :
  - `indicateurs.json` ne garde que la donnee la plus RECENTE par etablissement,
    et EXCLUT tout etablissement dont la derniere donnee IPS connue est
    anterieure a ANNEE_MIN_REFERENTIEL (etablissement considere ferme/obsolete).
  - `historique_ips.json` (charge a la demande cote app, PAS au demarrage de la
    carte) contient l'historique IPS complet par UAI, au format compact
    {code_uai: [[annee, ips], ...]}, restreint aux UAI retenus dans identite.json.

Sorties : public/data/identite.json, public/data/indicateurs.json,
          public/data/resultats.json, public/data/historique_ips.json
"""

import csv
import json
import re
import unicodedata
from pathlib import Path
from collections import defaultdict

SRC = Path(__file__).parent.parent / "data-source"
OUT = Path(__file__).parent.parent / "public" / "data"

# Annee de reference pour les donnees "courantes" (indicateurs.json)
ANNEE_REFERENCE = 2025
# Un etablissement est EXCLU du referentiel si sa donnee IPS la plus recente
# est strictement anterieure a cette annee.
ANNEE_MIN_REFERENTIEL = 2024

# Fichiers sources CSV multi-annees, par famille. Chaque famille peut contenir
# plusieurs fichiers (une annee peut etre couverte par plusieurs sources sans
# probleme : le dedoublonnage se fait sur UAI+annee, cf. dedupe_par_uai_annee).
SOURCES_IPS_ECOLES = [
    "fr-en-ips-ecoles-ap2022.csv",
    "fr-en-ips_ecoles_v2.csv",
]
SOURCES_IPS_COLLEGES = [
    "fr-en-ips-colleges-ap2022.csv",
    "fr-en-ips-colleges-ap2023.csv",
    "fr-en-ips_colleges.csv",
]
SOURCES_IPS_LYCEES = [
    "fr-en-ips-lycees-ap2023.csv",
    "fr-en-ips_lycees.csv",
]
SOURCE_IVAC_COLLEGES = "fr-en-indicateurs-valeur-ajoutee-colleges.csv"
SOURCE_IVAL_LYCEES_GT = "fr-en-indicateurs-de-resultat-des-lycees-gt_v2.csv"
SOURCE_IVAL_LYCEES_PRO = "fr-en-indicateurs-de-resultat-des-lycees-pro_v2.json"
SOURCE_IDENTITE = "fr-en-adresse-et-geolocalisation-etablissements-premier-et-second-degre.csv"

LANGUES_LABELS = {
    "allemand": "Allemand",
    "anglais": "Anglais",
    "espagnol": "Espagnol",
    "italien": "Italien",
    "autres_langues": "Autres langues",
}

FILIERES_TECHNO = ["sti2d", "stl", "stmg", "st2s", "std2a", "sthr", "tmd", "bt"]

FILIERES_RESULTATS_GT = ["sti2d", "std2a", "stmg", "stl", "st2s", "s2tmd", "sthr", "l", "es", "s"]
LABEL_FILIERE_GT = {
    "gnle": "Générale", "sti2d": "STI2D", "std2a": "STD2A", "stmg": "STMG",
    "stl": "STL", "st2s": "ST2S", "s2tmd": "S2TMD", "sthr": "STHR",
    "l": "L", "es": "ES", "s": "S",
}

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
        return float(str(v).replace(",", "."))
    except (TypeError, ValueError):
        return None


def to_int(v):
    f = to_float(v)
    return int(f) if f is not None else None


# ---------------------------------------------------------------------------
# UTILITAIRES CSV MULTI-ANNEES / GENERIQUES
# ---------------------------------------------------------------------------

_ENCODAGES = ["utf-8-sig", "utf-8", "latin-1", "cp1252"]
_ANNEE_RE = re.compile(r"(20\d{2})")


def _normaliser_colonne(nom):
    nom = nom.strip().replace("\ufeff", "")
    nom = unicodedata.normalize("NFKD", nom)
    nom = "".join(c for c in nom if not unicodedata.combining(c))
    nom = nom.lower()
    nom = re.sub(r"[^a-z0-9]+", "_", nom)
    return re.sub(r"_+", "_", nom).strip("_")


def _detecter_encodage_delimiteur(chemin):
    for enc in _ENCODAGES:
        try:
            with open(chemin, "r", encoding=enc, newline="") as f:
                echantillon = f.read(65536)
            break
        except (UnicodeDecodeError, LookupError):
            continue
    else:
        raise ValueError(f"Impossible de decoder {chemin}")
    try:
        dialecte = csv.Sniffer().sniff(echantillon, delimiters=[",", ";", "\t"])
        delimiteur = dialecte.delimiter
    except csv.Error:
        premiere_ligne = echantillon.splitlines()[0] if echantillon else ""
        compte = {d: premiere_ligne.count(d) for d in [",", ";", "\t"]}
        delimiteur = max(compte, key=compte.get) if compte else ","
    return enc, delimiteur


def _extraire_annee(valeur):
    if valeur is None:
        return None
    m = _ANNEE_RE.search(str(valeur))
    return int(m.group(1)) if m else None


def _premiere_valeur(ligne, alias):
    for a in alias:
        if a in ligne and ligne[a] not in (None, ""):
            return ligne[a]
    return None


def charger_csv_multi_annees(nom_fichier, colonnes_annee, colonnes_uai=("uai",)):
    """Charge un CSV source et retourne une liste de dicts {colonne_normalisee: valeur},
    en ajoutant systematiquement les cles 'uai' et 'annee' resolues. Ignore
    silencieusement les fichiers absents (permet a une famille d'avoir des
    sources optionnelles)."""
    chemin = SRC / nom_fichier
    if not chemin.exists():
        print(f"  (absent, ignore) {nom_fichier}")
        return []

    encodage, delimiteur = _detecter_encodage_delimiteur(chemin)
    lignes = []
    with open(chemin, "r", encoding=encodage, newline="") as f:
        lecteur = csv.reader(f, delimiter=delimiteur)
        try:
            entete = next(lecteur)
        except StopIteration:
            return lignes
        entete_norm = [_normaliser_colonne(h) for h in entete]

        for brute in lecteur:
            if len(brute) != len(entete_norm):
                continue
            ligne = dict(zip(entete_norm, brute))
            uai = _premiere_valeur(ligne, colonnes_uai)
            if not uai:
                continue
            annee = _extraire_annee(_premiere_valeur(ligne, colonnes_annee))
            if not annee:
                continue
            ligne["uai"] = uai.strip()
            ligne["annee"] = annee
            lignes.append(ligne)

    print(f"  {nom_fichier} : {len(lignes)} lignes utilisables")
    return lignes


def dedupe_par_uai_annee(lignes):
    """En cas de doublon UAI+annee entre plusieurs fichiers d'une meme famille,
    garde la ligne la plus complete (le plus de champs non vides)."""
    meilleur = {}
    for l in lignes:
        cle = (l["uai"], l["annee"])
        if cle not in meilleur:
            meilleur[cle] = l
        else:
            score_nouveau = sum(1 for v in l.values() if v not in (None, ""))
            score_actuel = sum(1 for v in meilleur[cle].values() if v not in (None, ""))
            if score_nouveau > score_actuel:
                meilleur[cle] = l
    return list(meilleur.values())


def _load_optionnel(nom):
    chemin = SRC / nom
    if not chemin.exists():
        print(f"  (absent, ignore) {nom}")
        return []
    return load(nom)


# ---------------------------------------------------------------------------
# 1. IDENTITÉ — localisation, une ligne par établissement (CSV data.gouv.fr)
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
    chemin = SRC / SOURCE_IDENTITE
    encodage, delimiteur = _detecter_encodage_delimiteur(chemin)

    resultat = []
    n_lues = 0
    n_fermees = 0
    n_type_inconnu = 0
    n_sans_coord = 0

    with open(chemin, "r", encoding=encodage, newline="") as f:
        lecteur = csv.reader(f, delimiter=delimiteur)
        entete = next(lecteur)
        entete_norm = [_normaliser_colonne(h) for h in entete]

        for brute in lecteur:
            if len(brute) != len(entete_norm):
                continue
            n_lues += 1
            e = dict(zip(entete_norm, brute))

            if e.get("libelle_de_l_etat_de_l_etablissement") != "OUVERT":
                n_fermees += 1
                continue

            type_etab = type_depuis_nature(e.get("libelle_de_la_nature_de_l_uai"))
            if type_etab is None:
                n_type_inconnu += 1
                continue

            lat_str = e.get("latitude_wgs84")
            lon_str = e.get("longitude_wgs84")
            if not lat_str or not lon_str:
                n_sans_coord += 1
                continue
            try:
                lat = round(float(lat_str), 5)
                lon = round(float(lon_str), 5)
            except ValueError:
                n_sans_coord += 1
                continue

            nom = (e.get("appellation_officielle") or "").strip()
            if not nom:
                principale = (e.get("denomination_principale") or "").strip()
                patronyme = (e.get("denomination_complementaire_ou_patronyme") or "").strip()
                nom = f"{principale} {patronyme}".strip() or principale or patronyme

            resultat.append({
                "code_uai": e["numero_d_uai"],
                "nom_etablissement": nom,
                "type_etablissement": type_etab,
                "statut": e.get("secteur"),
                "adresse": e.get("adresse_designation_de_la_voie"),
                "commune": e.get("libelle_de_la_commune"),
                "code_postal": e.get("adresse_code_postal"),
                "departement": e.get("libelle_du_departement_ou_de_la_collectivite"),
                "latitude": lat,
                "longitude": lon,
                "site_key": f"{lat}_{lon}",
            })

    print(f"  identite : {n_lues} lignes lues, {len(resultat)} retenues "
          f"({n_fermees} fermees/a_ouvrir, {n_type_inconnu} type non reconnu, "
          f"{n_sans_coord} sans coordonnees)")

    return resultat


# ---------------------------------------------------------------------------
# 2. IPS — historique multi-annees empile depuis les CSV, par famille
# ---------------------------------------------------------------------------

def _ips_ecoles_empile():
    lignes = []
    for f in SOURCES_IPS_ECOLES:
        lignes += charger_csv_multi_annees(f, colonnes_annee=["rentree_scolaire"])
    return dedupe_par_uai_annee(lignes)


def _ips_colleges_empile():
    lignes = []
    for f in SOURCES_IPS_COLLEGES:
        lignes += charger_csv_multi_annees(f, colonnes_annee=["annee_scolaire", "rentree_scolaire"])
    return dedupe_par_uai_annee(lignes)


def _ips_lycees_empile():
    lignes = []
    for f in SOURCES_IPS_LYCEES:
        lignes += charger_csv_multi_annees(f, colonnes_annee=["rentree_scolaire"])
    return dedupe_par_uai_annee(lignes)


def _ivac_colleges_empile():
    return dedupe_par_uai_annee(
        charger_csv_multi_annees(SOURCE_IVAC_COLLEGES, colonnes_annee=["session"])
    )


def construire_ips_et_historique():
    """
    Empile toutes les annees disponibles par famille (ecoles/colleges/lycees),
    exclut les etablissements dont la derniere donnee est trop ancienne, et
    retourne :
      - ips_courant : {uai: {...donnees de l'annee la plus recente <= ANNEE_REFERENCE}}
      - historique  : {uai: [[annee, ips], ...]} restreint aux uai retenus
    """
    print("Empilement IPS écoles :")
    lignes_ecoles = _ips_ecoles_empile()
    print("Empilement IPS collèges :")
    lignes_colleges = _ips_colleges_empile()
    print("Empilement IPS lycées :")
    lignes_lycees = _ips_lycees_empile()
    print("Empilement IVAC collèges :")
    lignes_ivac = _ivac_colleges_empile()

    ivac_par_cle = {(l["uai"], l["annee"]): l for l in lignes_ivac}
    for l in lignes_colleges:
        ivac = ivac_par_cle.get((l["uai"], l["annee"]))
        if ivac:
            l["taux_de_reussite_g"] = ivac.get("taux_de_reussite_g")
            l["va_du_taux_de_reussite_g"] = ivac.get("va_du_taux_de_reussite_g")

    ips_courant = {}
    historique = {}

    # --- Écoles ---
    par_uai = defaultdict(list)
    for l in lignes_ecoles:
        par_uai[l["uai"]].append(l)
    for uai, lignes_uai in par_uai.items():
        lignes_uai.sort(key=lambda l: l["annee"])
        derniere_annee = lignes_uai[-1]["annee"]
        if derniere_annee < ANNEE_MIN_REFERENTIEL:
            continue
        candidats = [l for l in lignes_uai if l["annee"] <= ANNEE_REFERENCE]
        ref = candidats[-1] if candidats else lignes_uai[-1]
        ips_courant[uai] = {
            "ips_etablissement": to_float(ref.get("ips")),
            "ips_moy_departement": to_float(ref.get("ips_departemental")),
            "ips_moy_academie": to_float(ref.get("ips_academique")),
            "ips_moy_national": to_float(ref.get("ips_national")),
            "ips_millesime": ref["annee"],
        }
        historique[uai] = [[l["annee"], to_float(l.get("ips"))] for l in lignes_uai]

    # --- Collèges ---
    par_uai = defaultdict(list)
    for l in lignes_colleges:
        par_uai[l["uai"]].append(l)
    for uai, lignes_uai in par_uai.items():
        lignes_uai.sort(key=lambda l: l["annee"])
        derniere_annee = lignes_uai[-1]["annee"]
        if derniere_annee < ANNEE_MIN_REFERENTIEL:
            continue
        candidats = [l for l in lignes_uai if l["annee"] <= ANNEE_REFERENCE]
        ref = candidats[-1] if candidats else lignes_uai[-1]
        ips_courant[uai] = {
            "ips_etablissement": to_float(ref.get("ips")),
            "ips_moy_departement": to_float(ref.get("ips_departemental")),
            "ips_moy_academie": to_float(ref.get("ips_academique")),
            "ips_moy_national": to_float(ref.get("ips_national")),
            "ips_millesime": ref["annee"],
        }
        historique[uai] = [
            [l["annee"], to_float(l.get("ips")), to_float(l.get("taux_de_reussite_g"))]
            if l.get("taux_de_reussite_g") is not None
            else [l["annee"], to_float(l.get("ips"))]
            for l in lignes_uai
        ]

    # --- Lycées (IPS ventilé par voie GT / PRO) ---
    par_uai = defaultdict(list)
    for l in lignes_lycees:
        par_uai[l["uai"]].append(l)
    for uai, lignes_uai in par_uai.items():
        lignes_uai.sort(key=lambda l: l["annee"])
        derniere_annee = lignes_uai[-1]["annee"]
        if derniere_annee < ANNEE_MIN_REFERENTIEL:
            continue
        candidats = [l for l in lignes_uai if l["annee"] <= ANNEE_REFERENCE]
        ref = candidats[-1] if candidats else lignes_uai[-1]
        suffixe = (ref.get("type_de_lycee") or "legt").lower()
        ips_etab = to_float(ref.get("ips_de_l_etablissement") or ref.get("ips_ensemble_gt_pro"))
        ips_courant[uai] = {
            "ips_etablissement": ips_etab,
            "ips_moy_departement": to_float(ref.get(f"ips_departemental_{suffixe}")),
            "ips_moy_academie": to_float(ref.get(f"ips_academique_{suffixe}")),
            "ips_moy_national": to_float(ref.get(f"ips_national_{suffixe}")),
            "ips_millesime": ref["annee"],
        }
        historique[uai] = [
            [l["annee"], to_float(l.get("ips_de_l_etablissement") or l.get("ips_ensemble_gt_pro"))]
            for l in lignes_uai
        ]

    return ips_courant, historique


# ---------------------------------------------------------------------------
# 3. EFFECTIFS — INCHANGÉ (JSON dédiés, optionnels)
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
    for e in _load_optionnel("fr-en-ecoles-effectifs-nb_classes.json"):
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
            "effectif_filles": None,
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
    for e in _load_optionnel("fr-en-college-effectifs-niveau-sexe-lv.json"):
        filles = sum(to_int(e.get(f"{n}_filles")) or 0 for n in niveaux)
        garcons = sum(to_int(e.get(f"{n}s_garcons")) or 0 for n in niveaux)
        par_niveau = {
            "6e": to_int(e.get("nombre_total_de_6emes")),
            "5e": to_int(e.get("nombre_total_de_5emes")),
            "4e": to_int(e.get("nombre_total_de_4emes")),
            "3e": to_int(e.get("nombre_total_de_3emes")),
        }
        rep = str(e.get("rep")) == "1"
        rep_plus = str(e.get("rep0")) == "1"
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
    for e in _load_optionnel("fr-en-lycee_gt-effectifs-niveau-sexe-lv.json"):
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
            "label_rep": None,
            "effectif_ulis": 0,
            "effectif_segpa": 0,
            "langues_lv1_lv2": extraire_langues(e),
            "effectifs_par_niveau": {k: v for k, v in par_niveau.items() if v},
            "effectifs_filiere_gen": gen or None,
            "effectifs_filiere_techno": dict(techno) if techno else None,
        }
    return out


def construire_indicateurs(identite, ips_courant):
    effectifs = {}
    effectifs.update(construire_effectifs_ecoles())
    effectifs.update(construire_effectifs_colleges())
    effectifs.update(construire_effectifs_lycees())

    tous_les_uai = set(ips_courant) | set(effectifs)
    resultat = []
    for uai in tous_les_uai:
        entree = {"code_uai": uai}
        entree.update(ips_courant.get(uai, {}))
        entree.update(effectifs.get(uai, {}))
        resultat.append(entree)

    ajouter_percentiles_ips(resultat, identite)
    return resultat


def ajouter_percentiles_ips(indicateurs, identite):
    type_par_uai = {e["code_uai"]: e["type_etablissement"] for e in identite}
    par_type = defaultdict(list)
    for e in indicateurs:
        type_etab = type_par_uai.get(e["code_uai"])
        if type_etab and e.get("ips_etablissement") is not None:
            par_type[type_etab].append(e["ips_etablissement"])
    for valeurs in par_type.values():
        valeurs.sort()
    import bisect
    for e in indicateurs:
        type_etab = type_par_uai.get(e["code_uai"])
        ips = e.get("ips_etablissement")
        valeurs = par_type.get(type_etab)
        if ips is None or not valeurs:
            e["ips_percentile_regional"] = None
            continue
        rang = bisect.bisect_right(valeurs, ips)
        e["ips_percentile_regional"] = round(100 * rang / len(valeurs))


# ---------------------------------------------------------------------------
# 4. RÉSULTATS (IVAC/IVAL) — année courante uniquement
# ---------------------------------------------------------------------------

def moyenne_ponderee(valeur_a, poids_a, valeur_b, poids_b):
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
    presents = to_float(e.get("presents_total")) or 0
    mentions = {}
    for cle, label in [("ab", "AB"), ("b", "B")]:
        n = to_int(e.get(f"nb_mentions_{cle}_g")) or to_int(e.get(f"nb_mentions_{cle}_t")) or to_int(e.get(f"nb_mentions_{cle}_p"))
        if n:
            mentions[label] = mentions.get(label, 0) + n
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
    fusion = dict(a)
    for cle, valeur in b.items():
        fusion[cle] = fusion.get(cle, 0) + valeur
    return fusion


def fusionner_voies(gt, pro):
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
        "taux_acces": gt["taux_acces"] + [{**a, "label": a["label"] + " (pro)"} for a in pro["taux_acces"]],
        "taux_reussite_par_filiere": {**gt["taux_reussite_par_filiere"], **pro["taux_reussite_par_filiere"]},
        "resultats_millesime": gt.get("resultats_millesime") or pro.get("resultats_millesime"),
    }
    return fusion


def construire_resultats():
    resultats = {}
    lignes_ivac = _ivac_colleges_empile()
    plus_recentes = {}
    for l in lignes_ivac:
        cle = l["uai"]
        if cle not in plus_recentes or l["annee"] > plus_recentes[cle]["annee"]:
            plus_recentes[cle] = l

    for uai, e in plus_recentes.items():
        candidats = to_float(e.get("nb_candidats_g"))
        global_mentions = to_int(e.get("nb_mentions_global_g"))
        taux_mentions = round(100 * global_mentions / candidats, 1) if candidats and global_mentions is not None else None
        mentions = {}
        for cle, label in [("ab", "AB"), ("b", "B"), ("tb", "TB")]:
            n = to_int(e.get(f"nb_mentions_{cle}_g"))
            if n:
                mentions[label] = n
        taux_acces = []
        acces = to_float(e.get("taux_d_acces_6eme_3eme"))
        if acces is not None:
            taux_acces.append({"label": "Accès 6e → 3e", "valeur": acces, "va": None})
        resultats[uai] = {
            "taux_reussite": to_float(e.get("taux_de_reussite_g")),
            "va_taux_reussite": to_float(e.get("va_du_taux_de_reussite_g")),
            "taux_mentions": taux_mentions,
            "va_taux_mentions": None,
            "mentions_detail": mentions,
            "taux_acces": taux_acces,
            "taux_reussite_par_filiere": {},
            "resultats_millesime": e.get("annee"),
        }

    lycees_gt_rows = charger_csv_multi_annees(SOURCE_IVAL_LYCEES_GT, colonnes_annee=["annee"])
    plus_recentes_gt = {}
    for l in lycees_gt_rows:
        if l["uai"] not in plus_recentes_gt or l["annee"] > plus_recentes_gt[l["uai"]]["annee"]:
            plus_recentes_gt[l["uai"]] = l
    lycees_gt_source = list(plus_recentes_gt.values())

    lycees_gt = {e["uai"]: extraire_lycee(e, FILIERES_RESULTATS_GT, LABEL_FILIERE_GT) for e in lycees_gt_source}
    for e in lycees_gt_source:
        gnle = to_float(e.get("taux_reu_gnle") or e.get("taux_reussite_gnle"))
        if gnle is not None and e["uai"] in lycees_gt:
            lycees_gt[e["uai"]]["taux_reussite_par_filiere"]["Générale"] = gnle

    lycees_pro_source = _load_optionnel(SOURCE_IVAL_LYCEES_PRO)
    lycees_pro = {e["uai"]: extraire_lycee(e, FILIERES_PRO, LABEL_FILIERE_PRO) for e in lycees_pro_source}

    for uai in set(lycees_gt) | set(lycees_pro):
        resultats[uai] = fusionner_voies(lycees_gt.get(uai), lycees_pro.get(uai))
        resultats[uai].pop("presents", None)

    for uai, r in resultats.items():
        r["code_uai"] = uai
    return list(resultats.values())


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    print("--- Construction identité (localisation) ---")
    identite = construire_identite()

    print("\n--- Construction IPS + historique (multi-annees, CSV) ---")
    ips_courant, historique = construire_ips_et_historique()

    indicateurs = construire_indicateurs(identite, ips_courant)

    uai_identite = {e["code_uai"] for e in identite}
    historique_final = {uai: pts for uai, pts in historique.items() if uai in uai_identite}

    print("\n--- Construction résultats (IVAC/IVAL) ---")
    resultats = construire_resultats()

    with open(OUT / "identite.json", "w", encoding="utf-8") as f:
        json.dump(identite, f, ensure_ascii=False, separators=(",", ":"))
    with open(OUT / "indicateurs.json", "w", encoding="utf-8") as f:
        json.dump(indicateurs, f, ensure_ascii=False, separators=(",", ":"))
    with open(OUT / "resultats.json", "w", encoding="utf-8") as f:
        json.dump(resultats, f, ensure_ascii=False, separators=(",", ":"))
    with open(OUT / "historique_ips.json", "w", encoding="utf-8") as f:
        json.dump(historique_final, f, ensure_ascii=False, separators=(",", ":"))

    print(f"\nidentite.json       : {len(identite)} établissements")
    print(f"indicateurs.json    : {len(indicateurs)} établissements (filtre >= {ANNEE_MIN_REFERENTIEL})")
    print(f"resultats.json      : {len(resultats)} établissements (collèges + lycées)")
    print(f"historique_ips.json : {len(historique_final)} établissements avec historique")

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
