import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Recastr — Content Repurposing Workspace",
  description:
    "Upload videos, podcasts, blogs and documents. Generate LinkedIn posts, X threads, Instagram captions, Facebook updates, Threads and YouTube Community posts without starting from scratch.",
  openGraph: {
    title: "Recastr — Content Repurposing Workspace",
    description: "Repurpose long-form content into ready-to-use posts.",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Recastr — Content Repurposing Workspace",
    description: "Repurpose long-form content into ready-to-use posts.",
    images: ["/og-image.png"],
  },
};

export default function Home() {
  return <LandingPage />;
}
