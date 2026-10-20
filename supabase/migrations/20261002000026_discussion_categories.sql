-- DevsAssemble — 0026 rethink discussion categories
-- Reorganize forum categories by INTENT (why you're posting) rather than by
-- media type. Format (article/video/link) is already surfaced automatically by
-- link-preview cards, so there's no "Links"/"Videos" category. The one genuinely
-- new slot is "Worth sharing" — the home for articles, videos, and repos found
-- elsewhere, distinct from "Show & tell" (your own work). Categories are fully
-- data-driven (no slug is hardcoded in app code), so renaming slugs is safe.

update public.categories set
  description = 'Intros, meta, and anything community-related.',
  position = 0
where slug = 'general';

update public.categories set
  slug = 'show-and-tell',
  name = 'Show & tell',
  description = 'Your own projects, demos, and things you shipped.',
  position = 1
where slug = 'show-your-build';

update public.categories set
  description = 'Prompts, agents, and workflows that work.',
  position = 3
where slug = 'tools-and-strategies';

update public.categories set
  position = 4
where slug = 'help';

insert into public.categories (slug, name, description, position) values
  (
    'worth-sharing',
    'Worth sharing',
    'Articles, videos, repos, and threads you found worth passing on.',
    2
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  position = excluded.position;
