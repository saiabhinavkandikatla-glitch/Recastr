import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Recastr — Turn one source into 30 days of content",
  description:
    "Drop a video, podcast, or blog. Get platform-ready posts for Twitter, LinkedIn, Instagram, Facebook, and Reels.",
  openGraph: {
    title: "Recastr — Turn one source into 30 days of content",
    description: "AI content repurposing for creators who publish everywhere.",
    images: ["/og-image.png"],
  },
};

export default function Home() {
  return <LandingPage />;
}
