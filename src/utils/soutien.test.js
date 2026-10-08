import { afterEach, describe, expect, it, vi } from 'vitest';
import { CLE_RAPPEL_SOUTIEN, CLE_VU_SOUTIEN, JOUR, soutienEligible, useSoutienStore } from './soutien';
const base = { tempsActif: 60000, nombreFiches: 3, comparaisonVue: false, rappel: null, dejaVu: false, maintenant: 100000 };
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); useSoutienStore.setState({ tempsActif: 0, comparaisonVue: false, proprietaire: null, dejaVu: false, rappel: null }); });
describe('invitation à soutenir le projet', () => {
  it('attend une minute et trois fiches distinctes ou une comparaison affichée', () => {
    expect(soutienEligible(base)).toBe(true);
    expect(soutienEligible({ ...base, tempsActif: 59999 })).toBe(false);
    expect(soutienEligible({ ...base, nombreFiches: 2 })).toBe(false);
    expect(soutienEligible({ ...base, nombreFiches: 0, comparaisonVue: true })).toBe(true);
  });
  it('respecte la session et la date de rappel, avec reprise après expiration', () => {
    expect(soutienEligible({ ...base, dejaVu: true })).toBe(false);
    expect(soutienEligible({ ...base, rappel: '100001' })).toBe(false);
    expect(soutienEligible({ ...base, rappel: '100000' })).toBe(true);
    expect(soutienEligible({ ...base, rappel: 'invalide' })).toBe(true);
  });
  it('réserve une seule présentation et enregistre les délais 30 et 90 jours', () => {
    const local = vi.fn(); const session = vi.fn();
    vi.stubGlobal('window', { localStorage: { setItem: local }, sessionStorage: { setItem: session } });
    vi.spyOn(Date, 'now').mockReturnValue(100000);
    useSoutienStore.getState().marquerVu('fiche');
    expect(session).toHaveBeenCalledWith(CLE_VU_SOUTIEN, '1');
    expect(useSoutienStore.getState().proprietaire).toBe('fiche');
    for (const jours of [30, 90]) {
      useSoutienStore.getState().reporter(jours);
      expect(local).toHaveBeenLastCalledWith(CLE_RAPPEL_SOUTIEN, String(100000 + jours * JOUR));
      expect(useSoutienStore.getState().proprietaire).toBeNull();
    }
  });
  it('reste fonctionnel lorsque le stockage local est bloqué', () => {
    vi.stubGlobal('window', { get localStorage() { throw new Error('bloqué'); }, get sessionStorage() { throw new Error('bloqué'); } });
    expect(() => useSoutienStore.getState().marquerVu('comparaison')).not.toThrow();
    expect(() => useSoutienStore.getState().reporter(30)).not.toThrow();
    expect(useSoutienStore.getState().dejaVu).toBe(true);
  });
});
