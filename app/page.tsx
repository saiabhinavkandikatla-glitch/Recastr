import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Recastr - One video. 30 content assets.",
  description: "AI-powered content repurposing for founders, creators, and agencies.",
  openGraph: {
    title: "Recastr",
    description: "Turn one video, podcast, or blog into 30 content assets.",
    images: ["/og-image.png"],
  },
};

export default function Home() {
  return <LandingPage />;
}
