import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Providers } from "@/app/providers";
import { env } from "@/lib/env";
import "./globals.css";
import { cn } from "@/lib/utils";
import { CursorSpotlight } from "@/components/landing/CursorSpotlight";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: { default: "Recastr — Turn Long-Form Content Into Ready-to-Use Posts", template: "%s | Recastr" },
  description: "Upload videos, podcasts, blogs and documents. Generate LinkedIn posts, X threads, Instagram captions, Facebook updates, Threads and YouTube Community posts without starting from scratch.",
  openGraph: {
    title: "Recastr — Turn Long-Form Content Into Ready-to-Use Posts",
    description: "Upload videos, podcasts, blogs and documents. Generate LinkedIn posts, X threads, Instagram captions, Facebook updates, Threads and YouTube Community posts without starting from scratch.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Recastr — Turn Long-Form Content Into Ready-to-Use Posts",
    description: "Upload videos, podcasts, blogs and documents. Generate LinkedIn posts, X threads, Instagram captions, Facebook updates, Threads and YouTube Community posts without starting from scratch.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-foreground antialiased",
          dmSans.variable,
          bricolage.variable,
          jetbrainsMono.variable
        )}
      >
        <Providers>
          <CursorSpotlight />
          {children}
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  );
}
