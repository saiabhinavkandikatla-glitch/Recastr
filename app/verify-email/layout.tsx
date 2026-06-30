import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Check your inbox and verify your email address to activate your Recastr account and start repurposing content.",
  openGraph: {
    title: "Verify Email | Recastr",
    description: "Verify your email address to activate your Recastr account.",
  },
  twitter: {
    title: "Verify Email | Recastr",
    description: "Verify your email address to activate your Recastr account.",
  },
};

export default function VerifyEmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
