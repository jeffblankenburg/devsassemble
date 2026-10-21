import { SOCIAL_LINKS, type SocialLink } from "@/lib/social/links";

/** The X (formerly Twitter) glyph. */
export function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** The Bluesky butterfly. */
export function BlueskyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z" />
    </svg>
  );
}

const ICONS: Record<SocialLink["key"], (props: { className?: string }) => React.ReactElement> = {
  x: XIcon,
  bluesky: BlueskyIcon,
};

/** Returns the glyph component for a social link key. */
export function SocialIcon({
  linkKey,
  className,
}: {
  linkKey: SocialLink["key"];
  className?: string;
}) {
  const Icon = ICONS[linkKey];
  return <Icon className={className} />;
}

/** Row of icon links to our social profiles, from the shared config. */
export function SocialLinks({
  className = "flex items-center gap-3",
  iconClassName = "h-5 w-5",
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <nav aria-label="Social media" className={className}>
      {SOCIAL_LINKS.map((s) => (
        <a
          key={s.key}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`DevsAssemble on ${s.label}`}
          title={s.label}
          className="focus-comic text-brand-ink/70 transition-colors hover:text-brand-blue"
        >
          <SocialIcon linkKey={s.key} className={iconClassName} />
        </a>
      ))}
    </nav>
  );
}
