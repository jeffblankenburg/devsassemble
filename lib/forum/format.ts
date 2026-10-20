/**
 * A clean, plain-text snippet of a markdown body for timeline cards. Drops the
 * things that render as their own elements — fenced code, image embeds, and
 * bare-URL-only lines (those become link-preview cards) — and strips inline
 * markdown punctuation so the excerpt reads as prose.
 */
export function plainExcerpt(body: string, max = 220): string {
  const text = body
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // image embeds
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → their text
    .split(/\r?\n/)
    .filter((line) => !/^<?https?:\/\/\S+>?$/i.test(line.trim())) // bare-URL lines
    .join(" ")
    .replace(/[`*_>#~]/g, "") // inline markdown punctuation
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Short absolute date, e.g. "Oct 2, 2026". */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/**
 * Relative time ("3h ago"), falling back to an absolute date past 30 days.
 * Lives in this (non-component) module so the Date.now() read stays out of
 * render — the react-hooks/purity rule flags impure calls inside components.
 */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return formatDate(iso);
}
