"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NEARBY_RADII } from "@/lib/events/geo";

/**
 * "Near me" control for in-person events. Requests browser geolocation (with
 * permission), then navigates with rounded coords + radius in the URL so the
 * server does the distance filter. Coords are rounded to ~1km for privacy.
 */
export function NearMeControl({
  active,
  lat,
  lng,
  radius,
}: {
  active: boolean;
  lat?: string;
  lng?: string;
  radius: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function enable() {
    if (!("geolocation" in navigator)) {
      setError("Location isn't available in this browser.");
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = pos.coords.latitude.toFixed(2);
        const lo = pos.coords.longitude.toFixed(2);
        router.push(`/events?format=in-person&near=1&lat=${la}&lng=${lo}&radius=${radius}`);
      },
      () => {
        setLoading(false);
        setError("Couldn't get your location — allow access and try again.");
      },
      { timeout: 10000 },
    );
  }

  if (!active) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={enable}
          disabled={loading}
          className="focus-comic rounded-md border-ink bg-surface px-4 py-1.5 font-display text-sm uppercase tracking-wide text-brand-ink shadow-comic-sm transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {loading ? "Locating…" : "📍 Near me"}
        </button>
        {error && <span className="text-sm text-brand-purple">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-brand-ink">
      <span className="font-display uppercase tracking-wide">📍 Within</span>
      <select
        value={radius}
        onChange={(e) =>
          router.push(
            `/events?format=in-person&near=1&lat=${lat}&lng=${lng}&radius=${e.target.value}`,
          )
        }
        className="focus-comic rounded-md border-ink bg-white px-2 py-1 font-display text-sm uppercase text-brand-ink shadow-comic-sm"
      >
        {NEARBY_RADII.map((r) => (
          <option key={r} value={r}>
            {r} mi
          </option>
        ))}
      </select>
      <span className="font-display uppercase tracking-wide">of you</span>
      <button
        type="button"
        onClick={() => router.push("/events?format=in-person")}
        className="focus-comic font-mono text-xs uppercase tracking-widest text-brand-blue hover:underline"
      >
        Clear
      </button>
    </div>
  );
}
