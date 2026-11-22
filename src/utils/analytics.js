/** Single Umami instrumentation endpoint. Never send free text or personal identifiers. */
export function trackEvent(name, _title, properties = {}) {
  if (typeof window === "undefined") return;
  const safe = Object.fromEntries(Object.entries(properties).filter(([, value]) =>
    value !== undefined && value !== null && (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
  ).map(([key, value]) => {
    const normalizedKey = key === "type_etablissement" ? "school_type" : key === "nombre" ? "school_count" : key === "contexte" ? "source" : key;
    const normalizedFilter = normalizedKey === "filter_name" ? String(value)
      .replaceAll("École", "primary").replaceAll("Collège", "middle").replaceAll("Lycée", "high")
      .replaceAll("Privé", "private").replaceAll("Public", "public")
      .replace(/^types_/, "school_type_").replace(/^statuts_/, "status_")
      .replace(/^dispositifs_/, "program_").replace("ipsMin", "ips_min")
      .replace("departement", "department") : value;
    const normalizedValue = normalizedKey === "filter_name" ? normalizedFilter : normalizedKey === "school_type" ? ({ "École": "primary", "Collège": "middle", "Lycée": "high" }[value] ?? "other") :
      normalizedKey === "search_type" || normalizedKey === "result_type" ? ({ "commune": "city", "etablissement": "school" }[value] ?? value) : value;
    return [normalizedKey, normalizedValue];
  }));
  try {
    window.umami?.track?.(name, safe);
  } catch {
    // Analytics failures must never affect the product.
  }
}

// Deduplicated once per tab and school level (not equivalent to an Umami session).
const seenInMemory = new Set();
export function firstInTab(name, level = "all") {
  if (typeof window === "undefined") return false;
  const key = `trajectoires:analytics:v3:${name}:${level}`;
  if (seenInMemory.has(key)) return false;
  try {
    if (window.sessionStorage?.getItem(key)) return false;
    window.sessionStorage?.setItem(key, "1");
  } catch { /* Storage may be disabled. */ }
  seenInMemory.add(key);
  return true;
}

export function trackSessionEvent(name, properties = {}) {
  const level = properties.school_type ?? properties.type_etablissement;
  if (firstInTab(name, level)) trackEvent(name, undefined, properties);
}
