// Pure, client-safe constants + helpers for forum image uploads. No server-only
// deps here so the composer (a Client Component) can import the limits. The
// DB-touching helpers live in ./images (server-only).

/** Storage bucket holding images embedded in discussion markdown. */
export const FORUM_IMAGE_BUCKET = "forum-images";

/** Accepted image types for inline forum uploads. */
export const FORUM_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const FORUM_IMAGE_MAX_BYTES = 4 * 1024 * 1024;

/** Map a supported mime type to a file extension. */
export function forumImageExt(mime: string): string | null {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  return null;
}

/**
 * Pull the storage object paths (the `uid/file` part after the bucket name) for
 * every forum-image URL referenced in a markdown body. Used to mark uploads as
 * committed once a post actually ships, and to detect orphans in the sweep.
 */
export function extractForumImagePaths(body: string): string[] {
  const re = new RegExp(`/${FORUM_IMAGE_BUCKET}/([\\w./-]+)`, "g");
  const paths = new Set<string>();
  for (const m of body.matchAll(re)) {
    if (m[1]) paths.add(m[1]);
  }
  return [...paths];
}
