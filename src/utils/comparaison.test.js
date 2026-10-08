import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEtablissementsStore as store } from '../hooks/useEtablissementsStore';
const initial = store.getState();
const etablissements = [
  { code_uai: '0750001A', type_etablissement: 'Lycée' },
  { code_uai: '0750002A', type_etablissement: 'Lycée' },
  { code_uai: '0750003A', type_etablissement: 'Lycée' },
  { code_uai: '0750004A', type_etablissement: 'Collège' },
];
beforeEach(() => store.setState({ ...initial, etablissements, chargerDetailsSiBesoin: vi.fn() }, true));
describe('sélection de comparaison', () => {
  it('conserve deux établissements distincts et charge leurs détails', () => {
    const s = store.getState();
    s.comparerEtablissement('0750001A');
    s.comparerEtablissement('0750001A');
    s.comparerEtablissement('0750002A');
    expect(store.getState().comparaisonIds).toEqual(['0750001A', '0750002A']);
    expect(store.getState().comparaisonOuverte).toBe(true);
    expect(s.chargerDetailsSiBesoin).toHaveBeenCalledWith('0750002A');
  });
  it('remplace le second établissement si la paire est complète', () => {
    etablissements.slice(0, 3).forEach(e => store.getState().comparerEtablissement(e.code_uai));
    expect(store.getState().comparaisonIds).toEqual(['0750001A', '0750003A']);
  });
  it('recommence une sélection quand le type change', () => {
    store.getState().comparerEtablissement('0750001A');
    store.getState().comparerEtablissement('0750004A');
    expect(store.getState().comparaisonIds).toEqual(['0750004A']);
  });
  it('garde la sélection à la fermeture et permet de remplacer le premier', () => {
    store.getState().comparerEtablissement('0750001A');
    store.getState().comparerEtablissement('0750002A');
    store.getState().fermerComparaison();
    expect(store.getState().comparaisonIds).toHaveLength(2);
    store.getState().retirerComparaison('0750001A');
    expect(store.getState().comparaisonIds).toEqual(['0750002A']);
  });
});
