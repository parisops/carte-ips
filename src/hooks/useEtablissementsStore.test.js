import { afterEach, beforeEach, expect, it, vi } from "vitest";

let store;
let track;
const catalogue = {
  champs: ["code_uai", "type_etablissement", "ips_etablissement", "effectif_total"],
  lignes: [["001a", "Collège", 102, 40], ["001b", "Collège", 109, 0], ["001c", "École", null, null]],
};
const success = () => ({ ok: true, json: async () => catalogue });

beforeEach(async () => {
  vi.resetModules();
  track = vi.fn();
  vi.stubGlobal("window", { umami: { track } });
  store = (await import("./useEtablissementsStore")).useEtablissementsStore;
});
afterEach(() => vi.unstubAllGlobals());

it("counts openings, repeat visits and discovery milestones in a single event per opening", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => success()));
  await store.getState().init();
  store.setState({ zonesChargees: { "001": true } });
  track.mockClear();
  for (const code of ["001a", "001a", "001c", "001b", "001a"]) {
    await store.getState().selectionnerEtablissement(code);
  }
  const base = { school_type: "middle", source: "map_or_related" };
  expect(track.mock.calls).toEqual([
    ["school_opened", { ...base, ordinal_bucket: "first", first_school: true }],
    ["school_opened", { ...base, school_type: "primary", ordinal_bucket: "first", exploration_qualified: true }],
    ["school_opened", { ...base, ordinal_bucket: "second", level_qualified: true }],
    ["school_opened", base],
  ]);
});

it.each([
  ["request", async () => { throw new TypeError("network"); }],
  ["http", async () => ({ ok: false, status: 503 })],
  ["body", async () => ({ ok: true, json: async () => { throw new SyntaxError("invalid"); } })],
  ["prepare", async () => ({ ok: true, json: async () => ({}) })],
])("reports %s failure and a successful retry once even with concurrent callers", async (stage, failure) => {
  const fetch = vi.fn().mockImplementationOnce(failure).mockResolvedValueOnce(success());
  vi.stubGlobal("fetch", fetch);
  await Promise.all([store.getState().init(), store.getState().init()]);
  expect(store.getState().erreurChargement).toBeTruthy();
  await store.getState().init(true);
  await store.getState().init();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(track.mock.calls).toEqual([
    ["app_ready", expect.objectContaining({ result: "error", attempt: "initial", stage, ...(stage === "http" && { http_status: 503 }) })],
    ["app_ready", expect.objectContaining({ result: "success", attempt: "retry" })],
  ]);
  expect(store.getState()).toMatchObject({ isLoaded: true, erreurChargement: null, bornesIps: [100,110], bornesEffectif: [0,40] });
});
