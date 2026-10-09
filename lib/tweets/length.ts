// Pure, client-safe tweet-length estimate. X counts every URL as 23 chars
// (t.co wrapping) regardless of its real length; everything else we count by
// code point. Emoji/CJK weighting is approximated (X is the final arbiter), so
// this is a close guide for the composer, not a guarantee.

const URL_RE = /https?:\/\/\S+/g;

export const TWEET_MAX = 280;

export function tweetLength(text: string): number {
  let count = 0;
  const withoutUrls = text.replace(URL_RE, () => {
    count += 23;
    return "";
  });
  count += [...withoutUrls].length;
  return count;
}
