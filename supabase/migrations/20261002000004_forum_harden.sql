-- DevsAssemble — 0004 forum hardening
-- The reply-count trigger helper should not be callable via the PostgREST RPC
-- surface; it only makes sense inside a trigger context. (Clears the
-- security advisor warning introduced with 0003.)
revoke execute on function public.bump_topic_on_post() from anon, authenticated, public;
