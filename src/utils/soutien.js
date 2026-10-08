import { create } from "zustand";
export const CLE_RAPPEL_SOUTIEN = "trajectoires:soutien-rappel";
export const JOUR = 24 * 60 * 60 * 1000;
export function animationSoutienAutorisee(rappel, maintenant = Date.now()) {
  return !(Number(rappel) > maintenant);
}
function lireRappel() {
  try { return window.localStorage.getItem(CLE_RAPPEL_SOUTIEN); } catch { return null; }
}
export const useSoutienStore = create(set => ({
  rappel: typeof window !== "undefined" ? lireRappel() : null,
  reporter: jours => {
    const rappel = Date.now() + jours * JOUR;
    try { window.localStorage.setItem(CLE_RAPPEL_SOUTIEN, String(rappel)); } catch { /* stockage facultatif */ }
    set({ rappel });
  },
}));
