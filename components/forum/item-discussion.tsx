import { Markdown } from "@/components/markdown/markdown";
import { AuthorChip } from "@/components/forum/author-chip";
import { ReportButton } from "@/components/forum/report-button";
import { ItemReplyForm } from "@/components/forum/item-reply-form";
import { ComicButton } from "@/components/brand/comic-button";
import { getSessionUser } from "@/lib/auth/dal";
import { getItemTopic, listPosts } from "@/lib/forum/queries";
import { deletePost } from "@/lib/forum/actions";
import { timeAgo } from "@/lib/forum/format";

/**
 * On-site discussion for a project or tool, backed by the forum. The topic is
 * created lazily on the first reply, so until then this is just an invitation
 * to start the conversation.
 */
export async function ItemDiscussion({
  itemType,
  itemId,
  itemTitle,
  itemPath,
}: {
  itemType: "project" | "tool";
  itemId: string;
  itemTitle: string;
  itemPath: string;
}) {
  const [user, topic] = await Promise.all([
    getSessionUser(),
    getItemTopic(itemType, itemId),
  ]);
  const posts = topic ? await listPosts(topic.id) : [];
  const isAdmin = user?.role === "admin" || user?.role === "moderator";

  return (
    <section id="discussion" className="mt-10 scroll-mt-24">
      <h2 className="font-display text-2xl uppercase tracking-wide text-brand-ink">
        Discussion{posts.length > 0 ? ` (${posts.length})` : ""}
      </h2>

      {posts.length > 0 && (
        <ul className="mt-4 flex flex-col gap-4">
          {posts.map((post) => {
            const canDelete = Boolean(
              user && (user.id === post.author_id || isAdmin),
            );
            return (
              <li
                key={post.id}
                className="rounded-[var(--radius-comic)] border-ink bg-surface p-5 shadow-comic"
              >
                <div className="flex items-center gap-2 text-sm text-brand-ink/60">
                  <AuthorChip author={post.author} />
                  <span>· {timeAgo(post.created_at)}</span>
                </div>
                <div className="mt-3">
                  <Markdown>{post.body}</Markdown>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  {canDelete && topic && (
                    <form action={deletePost}>
                      <input type="hidden" name="id" value={post.id} />
                      <input type="hidden" name="slug" value={topic.slug} />
                      <button
                        type="submit"
                        className="focus-comic font-mono text-xs uppercase tracking-widest text-muted hover:text-brand-purple"
                      >
                        Delete
                      </button>
                    </form>
                  )}
                  {user && <ReportButton targetType="post" targetId={post.id} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-8">
        {topic?.is_locked ? (
          <p className="rounded-[var(--radius-comic)] border-ink bg-surface p-4 font-display uppercase tracking-wide text-brand-ink/60 shadow-comic">
            This discussion is locked.
          </p>
        ) : user ? (
          <ItemReplyForm
            itemType={itemType}
            itemId={itemId}
            itemTitle={itemTitle}
            itemPath={itemPath}
          />
        ) : (
          <div className="flex flex-col gap-2">
            <ComicButton
              href={`/login?next=${encodeURIComponent(itemPath)}`}
              variant="blue"
            >
              Sign in to discuss
            </ComicButton>
            <p className="font-mono text-xs uppercase tracking-widest text-muted">
              Free · Sign in with GitHub to join the conversation
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
