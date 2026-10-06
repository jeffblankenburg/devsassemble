import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "blue" | "lime" | "purple" | "ink";
type Size = "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  blue: "bg-brand-blue text-white",
  lime: "bg-brand-lime text-brand-ink",
  purple: "bg-brand-purple text-white",
  ink: "bg-brand-ink text-white",
};

const SIZES: Record<Size, string> = {
  md: "px-6 py-3 text-lg",
  lg: "px-8 py-4 text-xl sm:text-2xl",
};

const base =
  "focus-comic inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-comic)] border-ink font-display uppercase tracking-wide shadow-comic transition-transform duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-comic-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-comic-sm";

/** A chunky comic-styled button. Renders an <a> when `href` is set, else a <button>. */
export function ComicButton({
  children,
  variant = "blue",
  size = "md",
  className = "",
  href,
  ...props
}: {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  href?: string;
} & Omit<ComponentProps<"button">, "className">) {
  const classes = `${base} ${SIZES[size]} ${VARIANTS[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
