import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useEtablissementsStore as store, filtrerEtablissements } from '../hooks/useEtablissementsStore';
import { etatLePlusProche } from './bottomSheet';
import { preparerHistoriqueIPS } from './historiqueIPS';
import { construireRuntime } from '../../scripts/runtime-data.mjs';
const initial = store.getState();
const ecole = (code_uai, commune, departement = 'Hauts-de-Seine') => ({ code_uai, commune, departement, nom_etablissement: 'École du Centre', type_etablissement: 'École', statut: 'Public', latitude: 48.8, longitude: 2.2 });
const etablissements = [ecole('0920001A', 'Saint-Cloud'), ecole('0780002B', 'La Celle-Saint-Cloud', 'Yvelines'), ecole('0790003C', 'Saint-Aubin-le-Cloud', 'Deux-Sèvres'), ecole('0010004D', 'Saint-Cloud', 'Ain')];
beforeEach(() => store.setState({ ...initial, etablissements }, true));
afterEach(() => vi.unstubAllGlobals());
const filtres = () => filtrerEtablissements(store.getState().etablissements, store.getState().filtres);

describe('recherche de commune', () => {
  it('limite la sélection à la commune et au département sans ouvrir de fiche ni charger de détails', () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    store.getState().selectionnerSuggestion({ type: 'commune', label: 'Saint-Cloud', departement: 'Hauts-de-Seine' });
    expect(filtres().map(e => e.code_uai)).toEqual(['0920001A']);
    expect(store.getState().etablissementSelectionneId).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('libère la commune exacte lorsqu’on modifie ou efface la recherche', () => {
    store.getState().selectionnerSuggestion({ type: 'commune', label: 'Saint-Cloud', departement: 'Hauts-de-Seine' });
    store.getState().setFiltre('recherche', '');
    expect(filtres()).toHaveLength(4);
  });
  it('réinitialise commune et sélection après un changement de département', () => {
    store.getState().selectionnerSuggestion({ type: 'commune', label: 'Saint-Cloud', departement: 'Hauts-de-Seine' });
    store.getState().setFiltre('departement', 'Yvelines');
    expect(filtres().map(e => e.code_uai)).toEqual(['0780002B']);
  });
  it('conserve la recherche textuelle sans accents', () => {
    store.getState().setFiltre('recherche', 'ecole celle saint cloud');
    expect(filtres().map(e => e.code_uai)).toEqual(['0780002B']);
  });
});

describe('panneau tactile', () => {
  it('ne se replie pas lorsqu’on tire légèrement vers le haut depuis la mi-hauteur', () => {
    expect(etatLePlusProche(61.5)).toBe('mi');
    expect(etatLePlusProche(80)).toBe('plein');
  });
  it('permet de réduire et de rouvrir le panneau', () => {
    expect(etatLePlusProche(30)).toBe('peek');
    expect(etatLePlusProche(50)).toBe('mi');
  });
});

describe('rupture IPS', () => {
  it('ne relie pas les deux méthodes et ne calcule que la variation comparable', () => {
    const resultat = preparerHistoriqueIPS([{ annee: 2019, ips: 100 }, { annee: 2021, ips: 101 }, { annee: 2022, ips: 120 }, { annee: 2025, ips: 124 }]);
    expect(resultat.rupture).toBe(true);
    expect(resultat.ecart).toBe(4);
    expect(resultat.points[1].depuis).toBeNull();
    expect(resultat.points[2].avant).toBeNull();
    expect(resultat.debutComparaison).toBe(2022);
  });
  it('omet la variation quand il n’existe qu’un point après 2022', () => {
    expect(preparerHistoriqueIPS([{ annee: 2021, ips: 100 }, { annee: 2022, ips: 120 }]).ecart).toBeNull();
  });
});

describe('données progressives', () => {
  const bloc = { etablissements: [{ ...etablissements[0], taux_reussite: 90 }], historique: { '0920001A': [[2025, 120]] }, historiqueResultats: {} };
  it('ne duplique pas les chargements concurrents et conserve les autres établissements', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => bloc }); vi.stubGlobal('fetch', fetch);
    await Promise.all([store.getState().chargerDetailsSiBesoin('0920001A'), store.getState().chargerDetailsSiBesoin('0920002B')]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(store.getState().etablissements).toHaveLength(4);
    expect(store.getState().etablissements[0].taux_reussite).toBe(90);
    expect(store.getState().historique['0920001A']).toEqual([[2025, 120]]);
  });
  it('autorise une nouvelle tentative après un échec HTTP', async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 503 }).mockResolvedValueOnce({ ok: true, json: async () => bloc }); vi.stubGlobal('fetch', fetch);
    await store.getState().chargerDetailsSiBesoin('0920001A');
    expect(store.getState().zonesEnErreur['092']).toBe(true);
    await store.getState().chargerDetailsSiBesoin('0920001A');
    expect(store.getState().zonesChargees['092']).toBe(true);
    expect(store.getState().zonesEnErreur['092']).toBe(false);
  });
  it('reconstitue le catalogue sans perte des champs de filtrage et garde les détails et historiques dans leur zone', () => {
    const { catalogue, zones } = construireRuntime(etablissements, [{ code_uai: '0920001A', ips_etablissement: 130, langues_lv1_lv2: ['Anglais'] }], [], { '0920001A': [[2025, 130]] }, {});
    const record = Object.fromEntries(catalogue.champs.map((champ, i) => [champ, catalogue.lignes[0][i]]));
    expect(record.ips_etablissement).toBe(130);
    expect(record).not.toHaveProperty('langues_lv1_lv2');
    expect(zones['092'].etablissements[0].langues_lv1_lv2).toEqual(['Anglais']);
    expect(zones['092'].historique['0920001A']).toEqual([[2025, 130]]);
    expect(zones['078'].etablissements).toHaveLength(1);
  });
});
