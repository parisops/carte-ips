export const ANNEE_RUPTURE_METHODO = 2022;
export function preparerHistoriqueIPS(points) {
  const tries = [...points].filter(p => Number.isFinite(p.annee) && Number.isFinite(p.ips)).sort((a, b) => a.annee - b.annee);
  const avant = tries.filter(p => p.annee < ANNEE_RUPTURE_METHODO);
  const depuis = tries.filter(p => p.annee >= ANNEE_RUPTURE_METHODO);
  const comparables = depuis.length ? depuis : avant;
  return {
    points: tries.map(p => ({ ...p, avant: p.annee < ANNEE_RUPTURE_METHODO ? p.ips : null, depuis: p.annee >= ANNEE_RUPTURE_METHODO ? p.ips : null })),
    rupture: avant.length > 0 && depuis.length > 0,
    ecart: comparables.length >= 2 ? comparables.at(-1).ips - comparables[0].ips : null,
    debutComparaison: comparables[0]?.annee,
    finComparaison: comparables.at(-1)?.annee,
  };
}
