// Client-safe constants for link previews (no server-only deps).

/** Storage bucket holding re-hosted link-preview images. */
export const LINK_PREVIEW_BUCKET = "link-preview-images";

export type LinkPreviewKind = "link" | "article" | "video";

/** The resolved preview fields the UI renders (server + client safe). */
export type LinkPreview = {
  id: string;
  url: string;
  kind: LinkPreviewKind;
  title: string | null;
  description: string | null;
  site_name: string | null;
  author: string | null;
  image_url: string | null;
};
