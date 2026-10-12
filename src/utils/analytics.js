/** Single Umami instrumentation endpoint. Never send free text or personal identifiers. */
export function trackEvent(name, _title, properties = {}) {
  if (typeof window === "undefined") return;
  const safe = Object.fromEntries(Object.entries(properties).filter(([, value]) =>
    value !== undefined && value !== null && (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
  ).map(([key, value]) => {
    const normalizedKey = key === "type_etablissement" ? "school_type" : key === "nombre" ? "school_count" : key === "contexte" ? "source" : key;
    const normalizedValue = normalizedKey === "school_type" ? ({ "École": "primary", "Collège": "middle", "Lycée": "high" }[value] ?? "other") :
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
export function trackSessionEvent(name, properties = {}) {
  if (typeof window === "undefined") return;
  const level = properties.school_type ?? properties.type_etablissement ?? "all";
  const key = `trajectoires:analytics:v3:${name}:${level}`;
  if (seenInMemory.has(key)) return;
  try {
    if (window.sessionStorage?.getItem(key)) return;
    window.sessionStorage?.setItem(key, "1");
  } catch { /* Storage may be disabled. */ }
  seenInMemory.add(key);
  trackEvent(name, undefined, properties);
}
