import { create } from "zustand";

export const CLE_RAPPEL_SOUTIEN = "trajectoires:soutien-rappel";
export const CLE_VU_SOUTIEN = "trajectoires:soutien-vu";
export const JOUR = 24 * 60 * 60 * 1000;
export function soutienEligible({ tempsActif, nombreFiches, comparaisonVue, rappel, dejaVu, maintenant = Date.now() }) {
  return tempsActif >= 60000 && (nombreFiches >= 3 || comparaisonVue) && !dejaVu && !(Number(rappel) > maintenant);
}
function lire(stockage, cle) {
  try { return window[stockage].getItem(cle); } catch { return null; }
}
export const useSoutienStore = create(set => ({
  tempsActif: 0,
  comparaisonVue: false,
  proprietaire: null,
  dejaVu: typeof window !== "undefined" && lire("sessionStorage", CLE_VU_SOUTIEN) === "1",
  rappel: typeof window !== "undefined" ? lire("localStorage", CLE_RAPPEL_SOUTIEN) : null,
  ajouterTemps: temps => set(s => ({ tempsActif: s.tempsActif + temps })),
  marquerComparaison: () => set({ comparaisonVue: true }),
  marquerVu: proprietaire => {
    try { window.sessionStorage.setItem(CLE_VU_SOUTIEN, "1"); } catch { /* stockage facultatif */ }
    set({ proprietaire, dejaVu: true });
  },
  reporter: jours => {
    const rappel = Date.now() + jours * JOUR;
    try { window.localStorage.setItem(CLE_RAPPEL_SOUTIEN, String(rappel)); } catch { /* stockage facultatif */ }
    set({ rappel, proprietaire: null, dejaVu: true });
  },
}));
