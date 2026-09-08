import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSENTEMENT_PREMIUM, ENDPOINT_CONTACT, inscrirePremium } from "./premium";

afterEach(() => vi.unstubAllGlobals());

describe("inscription à la liste d’attente Premium", () => {
  it.each([true, "true"])("accepte une confirmation explicite %s du prestataire", async success => {
    const envoi = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success }) });
    vi.stubGlobal("fetch", envoi);
    const signal = new AbortController().signal;
    await inscrirePremium(" parent@example.test ", true, signal);
    const [url, options] = envoi.mock.calls[0];
    expect(url).toBe(ENDPOINT_CONTACT);
    expect(options.signal).toBe(signal);
    expect(JSON.parse(options.body)).toEqual({
      email: "parent@example.test",
      _subject: "Liste d’attente Premium — Trajectoires",
      message: "Inscription à la liste d’attente Trajectoires Premium : comparaison de lycées et export PDF.",
      consentement: CONSENTEMENT_PREMIUM,
      date_consentement: expect.any(String),
    });
  });

  it.each([false, "false", undefined])("ne confirme pas une réponse HTTP 200 sans succès explicite (%s)", async success => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success }) }));
    await expect(inscrirePremium("parent@example.test", true)).rejects.toThrow("Inscription non confirmée");
  });

  it("refuse une erreur HTTP même si le corps indique un succès", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ success: true }) }));
    await expect(inscrirePremium("parent@example.test", true)).rejects.toThrow("Envoi refusé");
  });

  it("ne transmet rien sans accord ou sans email", async () => {
    const envoi = vi.fn();
    vi.stubGlobal("fetch", envoi);
    await expect(inscrirePremium("parent@example.test", false)).rejects.toThrow();
    await expect(inscrirePremium("  ", true)).rejects.toThrow();
    expect(envoi).not.toHaveBeenCalled();
  });

  it("propage les pannes réseau sans annoncer de succès", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network error")));
    await expect(inscrirePremium("parent@example.test", true)).rejects.toThrow("Network error");
  });
});
