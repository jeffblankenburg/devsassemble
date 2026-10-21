// Canonical links to our social presence. One source of truth so the feed
// header, site footer, and anywhere else stay in sync. Update here if a handle
// ever changes.

export type SocialLink = {
  key: "x" | "bluesky";
  label: string;
  handle: string;
  url: string;
};

export const SOCIAL_LINKS: SocialLink[] = [
  {
    key: "x",
    label: "X",
    handle: "@devsassembleAI",
    url: "https://x.com/devsassembleAI",
  },
  {
    key: "bluesky",
    label: "Bluesky",
    handle: "@devsassemble.ai",
    url: "https://bsky.app/profile/devsassemble.ai",
  },
];
