import "server-only";

type LatLng = { lat: number; lng: number };

async function queryNominatim(q: string): Promise<LatLng | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
      {
        headers: {
          "User-Agent":
            "DevsAssemble/1.0 (event geocoding; https://devsassemble.ai)",
        },
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: string; lon: string }[];
    const first = data[0];
    if (!first) return null;
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/**
 * Drop a leading venue name and unit/suite designators, which trip up
 * Nominatim. "Firefly Winery, 5435 Franklin St, Hilliard, OH" → "5435 Franklin
 * St, Hilliard, OH". Returns null if nothing meaningful changed.
 */
function simplify(address: string): string | null {
  const stripped = address.replace(
    /,?\s*(unit|suite|ste\.?|apt\.?|#)\s*[\w-]+/gi,
    "",
  );
  const parts = stripped
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  // Drop a leading venue name (first segment with no street number).
  if (parts.length >= 3 && !/\d/.test(parts[0])) parts.shift();
  const simplified = parts.join(", ");
  return simplified && simplified !== address.trim() ? simplified : null;
}

/**
 * Best-effort geocode of a free-text address to lat/lng via OpenStreetMap
 * Nominatim (free, no key). Tries the full address, then a simplified form
 * (venue/unit removed). Returns null on any failure so saving an event is never
 * blocked by a slow/failed lookup.
 */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const q = address.trim();
  if (!q) return null;
  const direct = await queryNominatim(q);
  if (direct) return direct;
  const simplified = simplify(q);
  return simplified ? queryNominatim(simplified) : null;
}
