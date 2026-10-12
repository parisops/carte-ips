import { afterEach, describe, expect, it, vi } from "vitest";
import { trackEvent, trackSessionEvent } from "./analytics";

afterEach(() => vi.unstubAllGlobals());

describe("Umami product analytics", () => {
  it("sends a canonical English event with normalized school types", () => {
    const track = vi.fn();
    vi.stubGlobal("window", { umami: { track } });
    trackEvent("school_opened", undefined, { type_etablissement: "Collège", source: "search" });
    expect(track).toHaveBeenCalledWith("school_opened", { school_type: "middle", source: "search" });
  });

  it("excludes non-scalar event properties", () => {
    const track = vi.fn();
    vi.stubGlobal("window", { umami: { track } });
    trackEvent("filter_changed", undefined, { action: "applied", invalid: { nested: true } });
    expect(track).toHaveBeenCalledWith("filter_changed", { action: "applied" });
  });

  it("does not fail if Umami is blocked", () => {
    vi.stubGlobal("window", {});
    expect(() => trackEvent("app_opened")).not.toThrow();
  });
});
