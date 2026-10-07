import type { Metadata } from "next";
import { Inter, Bangers, Geist_Mono } from "next/font/google";
import "./globals.css";

// Body/UI type — clean, highly legible.
const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

// Comic display type for the wordmark, hero, and section eyebrows.
const bangers = Bangers({
  weight: "400",
  variable: "--font-display",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://devsassemble.ai";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DevsAssemble — where AI developers assemble",
    template: "%s · DevsAssemble",
  },
  description:
    "A community for AI software developers to show what they've built, share tools and strategies, and assemble for livestreamed meetings.",
  openGraph: {
    title: "DevsAssemble",
    description:
      "Show what you built. Share your strategies. Assemble with AI developers.",
    url: siteUrl,
    siteName: "DevsAssemble",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DevsAssemble",
    description:
      "Show what you built. Share your strategies. Assemble with AI developers.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${bangers.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
