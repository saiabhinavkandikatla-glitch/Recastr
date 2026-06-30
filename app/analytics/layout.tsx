import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Track your content performance — posts generated per platform, scheduled reminders, activity trends, and success rates over the last 14 days.",
  openGraph: {
    title: "Analytics | Recastr",
    description: "Track content performance, generation metrics, and scheduling activity across all platforms.",
  },
  twitter: {
    title: "Analytics | Recastr",
    description: "Track content performance, generation metrics, and scheduling activity across all platforms.",
  },
};

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
