"use client";

import { useRef, useState, type ReactNode, type RefObject } from "react";
import { uploadForumImage } from "@/lib/forum/upload";
import { Markdown } from "@/components/markdown/markdown";
import {
  FORUM_IMAGE_MAX_BYTES,
  FORUM_IMAGE_TYPES,
} from "@/lib/forum/image-constants";

const ACCEPT = FORUM_IMAGE_TYPES.join(",");

// --- textarea editing helpers -------------------------------------------------
// All operate on the live DOM value of an uncontrolled textarea, then dispatch
// an `input` event so React and native `required` validation stay in sync.

type Area = HTMLTextAreaElement;

function commit(el: Area, value: string, selStart: number, selEnd: number) {
  el.value = value;
  el.focus();
  el.setSelectionRange(selStart, selEnd);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function selection(el: Area) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  return { start, end, value: el.value };
}

/** Wrap the selection (or a placeholder) in a token, e.g. **bold**, `code`. */
function wrapInline(el: Area, token: string, placeholder: string) {
  const { start, end, value } = selection(el);
  const inner = value.slice(start, end) || placeholder;
  const text = `${token}${inner}${token}`;
  commit(
    el,
    value.slice(0, start) + text + value.slice(end),
    start + token.length,
    start + token.length + inner.length,
  );
}

/** Prefix every line touched by the selection, e.g. "## ", "> ", "- ". */
function prefixLines(el: Area, marker: string, placeholder: string) {
  const { start, end, value } = selection(el);
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const after = value.indexOf("\n", end);
  const lineEnd = after === -1 ? value.length : after;
  const block = value.slice(lineStart, lineEnd) || placeholder;
  const prefixed = block
    .split("\n")
    .map((line) => `${marker}${line}`)
    .join("\n");
  commit(
    el,
    value.slice(0, lineStart) + prefixed + value.slice(lineEnd),
    lineStart,
    lineStart + prefixed.length,
  );
}

/** Insert [text](url), leaving "url" selected for quick typing. */
function insertLink(el: Area) {
  const { start, end, value } = selection(el);
  const label = value.slice(start, end) || "link text";
  const text = `[${label}](url)`;
  const next = value.slice(0, start) + text + value.slice(end);
  const urlStart = start + text.length - 4; // position of "url"
  commit(el, next, urlStart, urlStart + 3);
}

/** Drop image markdown on its own line at the caret. */
function insertImage(el: Area, alt: string, url: string) {
  const { start, end, value } = selection(el);
  const before = value.slice(0, start);
  const lead = before === "" || before.endsWith("\n") ? "" : "\n";
  const text = `${lead}![${alt}](${url})\n`;
  const caret = start + text.length;
  commit(el, before + text + value.slice(end), caret, caret);
}

// --- field (toolbar + textarea as one comic box) ------------------------------

export function MarkdownField({
  name,
  rows,
  placeholder,
  required,
  defaultValue,
}: {
  name: string;
  rows: number;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  const ref = useRef<Area>(null);
  const [preview, setPreview] = useState(false);
  const [previewText, setPreviewText] = useState("");

  function showPreview() {
    setPreviewText(ref.current?.value ?? "");
    setPreview(true);
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-comic)] border-ink bg-white shadow-comic transition-shadow focus-within:[outline:3px_solid_var(--brand-purple)] focus-within:[outline-offset:3px]">
      <div className="flex flex-wrap items-center gap-0.5 border-b-[3px] border-brand-ink bg-brand-ink/[0.04] px-2 py-1.5">
        <Tab active={!preview} onClick={() => setPreview(false)}>
          Write
        </Tab>
        <Tab active={preview} onClick={showPreview}>
          Preview
        </Tab>
        {!preview && (
          <>
            <Divider />
            <MarkdownToolbar targetRef={ref} />
          </>
        )}
      </div>

      {/* The textarea stays mounted (just visually hidden in preview) so the
          form still submits `body` and native `required` can focus it. */}
      <textarea
        ref={ref}
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={
          preview
            ? "sr-only"
            : "block w-full resize-y bg-transparent px-4 py-3 text-brand-ink outline-none"
        }
      />

      {preview && (
        <div
          className="markdown px-4 py-3"
          style={{ minHeight: `${rows * 1.6}rem` }}
        >
          {previewText.trim() ? (
            <Markdown>{previewText}</Markdown>
          ) : (
            <span className="text-brand-ink/45">Nothing to preview yet.</span>
          )}
        </div>
      )}
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`focus-comic inline-flex h-8 items-center rounded-[6px] px-3 font-display text-xs uppercase tracking-wide transition-colors ${
        active
          ? "bg-brand-ink text-white"
          : "text-brand-ink hover:bg-brand-ink/10"
      }`}
    >
      {children}
    </button>
  );
}

// --- toolbar strip ------------------------------------------------------------

export function MarkdownToolbar({
  targetRef,
}: {
  targetRef: RefObject<Area | null>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read the ref only at click time (never during render).
  function run(fn: (el: Area) => void) {
    const el = targetRef.current;
    if (el) fn(el);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;

    setError(null);
    if (!FORUM_IMAGE_TYPES.includes(file.type as (typeof FORUM_IMAGE_TYPES)[number])) {
      setError("Images must be JPG, PNG, WebP, or GIF.");
      return;
    }
    if (file.size > FORUM_IMAGE_MAX_BYTES) {
      setError("Please keep images under 4 MB.");
      return;
    }

    setBusy(true);
    try {
      const data = new FormData();
      data.set("image", file);
      const res = await uploadForumImage(data);
      if (res.error || !res.url) {
        setError(res.error ?? "Upload failed — try again.");
        return;
      }
      const alt = file.name.replace(/\.[^.]+$/, "");
      if (targetRef.current) insertImage(targetRef.current, alt, res.url);
    } catch {
      setError("Upload failed — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Btn title="Bold" onClick={() => run((el) => wrapInline(el, "**", "bold"))}>
        <span className="font-bold">B</span>
      </Btn>
      <Btn title="Italic" onClick={() => run((el) => wrapInline(el, "*", "italic"))}>
        <span className="italic">I</span>
      </Btn>
      <Divider />
      <Btn title="Heading" onClick={() => run((el) => prefixLines(el, "## ", "Heading"))}>
        H2
      </Btn>
      <Btn title="Subheading" onClick={() => run((el) => prefixLines(el, "### ", "Subheading"))}>
        H3
      </Btn>
      <Divider />
      <Btn title="Quote" onClick={() => run((el) => prefixLines(el, "> ", "quote"))}>
        ❝
      </Btn>
      <Btn title="Bulleted list" onClick={() => run((el) => prefixLines(el, "- ", "list item"))}>
        •
      </Btn>
      <Btn title="Inline code" onClick={() => run((el) => wrapInline(el, "`", "code"))}>
        {"</>"}
      </Btn>
      <Divider />
      <Btn title="Link" onClick={() => run(insertLink)}>
        🔗
      </Btn>
      <Btn title="Add image" onClick={() => fileRef.current?.click()} disabled={busy}>
        {busy ? "…" : "🖼"}
      </Btn>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        onChange={onFile}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
      />
      {error && (
        <span className="ml-auto pr-1 text-sm text-brand-purple">{error}</span>
      )}
    </>
  );
}

function Btn({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="focus-comic inline-flex h-8 min-w-8 items-center justify-center rounded-[6px] px-1.5 font-display text-sm text-brand-ink transition-colors hover:bg-brand-ink/10 active:bg-brand-ink/20 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-brand-ink/20" />;
}
