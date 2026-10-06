type Option = { value: string; label: string };

/**
 * Comic "chip" selector — a segmented single-choice control backed by hidden
 * radio inputs, so it's keyboard-accessible and submits with the form (no JS).
 * Replaces a native <select>.
 */
export function ChoiceChips({
  name,
  options,
  defaultValue,
  required,
}: {
  name: string;
  options: Option[];
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o.value} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={o.value}
            defaultChecked={o.value === defaultValue}
            required={required}
            className="peer sr-only"
          />
          <span className="inline-block rounded-md border-ink bg-surface px-4 py-2 font-display text-sm uppercase tracking-wide text-brand-ink shadow-comic-sm transition-transform peer-checked:-translate-y-0.5 peer-checked:bg-brand-blue peer-checked:text-white peer-checked:shadow-comic peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-purple">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}

const SWATCH: Record<string, string> = {
  blue: "bg-brand-blue",
  lime: "bg-brand-lime",
  purple: "bg-brand-purple",
};

/** Color-swatch picker (radio-backed) — for choosing a brand accent. */
export function ColorSwatches({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: Option[];
  defaultValue?: string;
}) {
  return (
    <div role="radiogroup" className="flex gap-4">
      {options.map((o) => (
        <label key={o.value} className="cursor-pointer text-center" title={o.label}>
          <input
            type="radio"
            name={name}
            value={o.value}
            defaultChecked={o.value === defaultValue}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className={`block h-10 w-10 rounded-md border-ink ${SWATCH[o.value] ?? "bg-surface"} shadow-comic-sm transition-transform peer-checked:-translate-y-0.5 peer-checked:shadow-comic peer-checked:ring-2 peer-checked:ring-brand-ink peer-checked:ring-offset-2 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-purple`}
          />
          <span className="mt-1 block font-mono text-xs uppercase tracking-widest text-muted peer-checked:text-brand-ink">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}
