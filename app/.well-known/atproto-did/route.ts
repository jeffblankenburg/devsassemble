// Bluesky / AT Protocol domain-handle verification. Serving this DID at
// https://devsassemble.ai/.well-known/atproto-did lets the account use the
// handle @devsassemble.ai (the HTTP verification method — no DNS record needed).
// The DID is the stable identifier for the DevsAssemble Bluesky account; it's
// public by design.
const ATPROTO_DID = "did:plc:3s6m6cmk2dhq7jupvulwc4e2";

export function GET() {
  return new Response(ATPROTO_DID, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
