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
      <Image
        src={src}
        alt="DevsAssemble"
        width={dims.width}
        height={dims.height}
        priority={priority}
        className="h-auto w-auto"
      />
    </Link>
  );
}
