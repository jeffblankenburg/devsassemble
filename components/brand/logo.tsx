import Image from "next/image";
import Link from "next/link";

/** The DevsAssemble wordmark. Uses the full header art; `icon` uses the DA badge. */
export function Logo({
  variant = "wordmark",
  className,
  priority,
}: {
  variant?: "wordmark" | "icon";
  className?: string;
  priority?: boolean;
}) {
  const src = variant === "icon" ? "/logo-icon.png" : "/logo-header.png";
  const dims =
    variant === "icon"
      ? { width: 48, height: 48 }
      : { width: 260, height: 78 };

  return (
    <Link href="/" aria-label="DevsAssemble home" className={className}>
      {/*
        unoptimized: serve the brand PNG as-is (no WebP conversion). The logo is
        small, and skipping the optimizer avoids a stale-image cache where updated
        art keeps serving the old optimized copy.
      */}
      <Image
        src={src}
        alt="DevsAssemble"
        width={dims.width}
        height={dims.height}
        priority={priority}
        unoptimized
        className={
          variant === "icon"
            ? "h-12 w-12"
            : "h-auto w-[150px] max-w-full sm:w-[200px] md:w-[240px]"
        }
      />
    </Link>
  );
}
