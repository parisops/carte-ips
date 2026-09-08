import { afterEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "./analytics";

afterEach(() => vi.unstubAllGlobals());

describe("suivi des événements", () => {
  it("transmet le clic Premium à Umami et GoatCounter", () => {
    const umamiTrack = vi.fn();
    const goatCount = vi.fn();
    vi.stubGlobal("window", {
      umami: { track: umamiTrack },
      goatcounter: { count: goatCount },
    });

    trackEvent("premium-ouvert");

    expect(umamiTrack).toHaveBeenCalledWith("premium-ouvert", { title: "premium-ouvert" });
    expect(goatCount).toHaveBeenCalledWith({
      path: "event:premium-ouvert",
      title: "premium-ouvert",
      event: true,
    });
  });
});
