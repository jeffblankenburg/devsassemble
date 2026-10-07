const btn =
  "focus-comic inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-comic)] border-ink px-5 py-2.5 font-display text-base uppercase tracking-wide shadow-comic transition-transform hover:-translate-y-0.5 hover:shadow-comic-lg";

/**
 * Subscribe-to-calendar actions. webcal:// opens the OS calendar's subscribe
 * flow (Apple/Outlook); the Google link adds the feed by URL; .ics is a plain
 * download. External protocols use <a>, not next/link.
 */
export function CalendarSubscribe() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const icsUrl = base ? `${base}/events/calendar.ics` : "/events/calendar.ics";
  const webcalUrl = base
    ? icsUrl.replace(/^https?:\/\//, "webcal://")
    : "/events/calendar.ics";
  // Google fetches the cid URL from its own servers, so it must be publicly
  // reachable (never localhost) and is most reliable as a webcal:// link.
  const isPublic = base.startsWith("https://");
  const googleUrl = isPublic
    ? `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`
    : null;

  return (
    <div className="rounded-[var(--radius-comic)] border-ink bg-surface p-5 shadow-comic">
      <h2 className="font-display text-xl uppercase tracking-wide text-brand-ink">
        Never miss a stream
      </h2>
      <p className="mt-1 text-sm text-brand-ink/70">
        Subscribe once and every event lands in your calendar automatically.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a href={webcalUrl} className={`${btn} bg-brand-blue text-white`}>
          Subscribe
        </a>
        {googleUrl && (
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btn} bg-brand-ink text-white`}
          >
            Google Calendar
          </a>
        )}
        <a
          href="/events/calendar.ics"
          download="devsassemble.ics"
          className={`${btn} bg-surface text-brand-ink`}
        >
          Download .ics
        </a>
      </div>
    </div>
  );
}
