/**
 * Turn a title into a URL-safe base slug. Apostrophes/quotes and accents are
 * removed (not treated as dividers), so "AI Philosopher's Dinner" becomes
 * "ai-philosophers-dinner", not "ai-philosopher-s-dinner".
 */
export function slugify(input: string): string {
  const base = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining accent marks (café -> cafe)
    .toLowerCase()
    .replace(/['’‘ʼ`"“”]+/g, "") // drop apostrophes/quotes so they don't become dashes
    .replace(/[^a-z0-9]+/g, "-") // everything else that isn't alphanumeric -> dash
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, ""); // tidy a trailing dash left by the slice
  return base || "topic";
}
