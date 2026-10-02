import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

/**
 * Renders user-authored markdown. XSS-safe by construction:
 * - react-markdown renders to React elements (no dangerouslySetInnerHTML)
 * - rehype-sanitize applies a safe default schema
 * - rehype-raw is intentionally NOT used, so embedded HTML is escaped, not run
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
