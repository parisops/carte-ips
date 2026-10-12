import { afterEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "./analytics";

afterEach(() => vi.unstubAllGlobals());

describe("suivi des événements", () => {
  it("transmet le clic Premium à Umami", () => {
    const umamiTrack = vi.fn();
    vi.stubGlobal("window", {
      umami: { track: umamiTrack },
    });

    trackEvent("premium-ouvert");

    expect(umamiTrack).toHaveBeenCalledWith("premium-ouvert", { title: "premium-ouvert" });
  });
});

it("ajoute le type d’établissement sans changer le nom de l’événement", () => {
  const track = vi.fn();
  vi.stubGlobal('window', { umami: { track } });
  trackEvent('etablissement-selectionne', 'Collège', { type_etablissement: 'Collège' });
  expect(track).toHaveBeenCalledWith('etablissement-selectionne', { title: 'Collège', type_etablissement: 'Collège' });
});
