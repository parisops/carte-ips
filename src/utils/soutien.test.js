import { afterEach, describe, expect, it, vi } from 'vitest';
import { CLE_RAPPEL_SOUTIEN, JOUR, animationSoutienAutorisee, useSoutienStore } from './soutien';
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); useSoutienStore.setState({ rappel: null }); });
describe('rappels du bouton café', () => {
  it('anime sans rappel ou après son expiration', () => {
    expect(animationSoutienAutorisee(null, 100000)).toBe(true);
    expect(animationSoutienAutorisee('100000', 100000)).toBe(true);
    expect(animationSoutienAutorisee('invalide', 100000)).toBe(true);
  });
  it('suspend les animations tant que le rappel est actif', () => {
    expect(animationSoutienAutorisee('100001', 100000)).toBe(false);
  });
  it('enregistre les délais de 30 et 90 jours', () => {
    const enregistrer = vi.fn();
    vi.stubGlobal('window', { localStorage: { setItem: enregistrer } });
    vi.spyOn(Date, 'now').mockReturnValue(100000);
    for (const jours of [30, 90]) {
      useSoutienStore.getState().reporter(jours);
      expect(enregistrer).toHaveBeenLastCalledWith(CLE_RAPPEL_SOUTIEN, String(100000 + jours * JOUR));
      expect(useSoutienStore.getState().rappel).toBe(100000 + jours * JOUR);
    }
  });
  it('reste fonctionnel quand le stockage est bloqué', () => {
    vi.stubGlobal('window', { get localStorage() { throw new Error('bloqué'); } });
    expect(() => useSoutienStore.getState().reporter(30)).not.toThrow();
    expect(useSoutienStore.getState().rappel).toBeGreaterThan(Date.now());
  });
});
