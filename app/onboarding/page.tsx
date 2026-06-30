import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { BrandVoiceWizard } from "@/components/onboarding/brand-voice-wizard";
import { WelcomeScreen } from "@/components/onboarding/WelcomeScreen";
import { getCurrentUser } from "@/lib/current-user";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma/client";

export const metadata: Metadata = {
  title: "Get Started",
  description: "Set up your Recastr workspace, configure your brand voice, and start repurposing content with AI.",
  openGraph: {
    title: "Get Started | Recastr",
    description: "Set up your workspace and start repurposing content with AI.",
  },
  twitter: {
    title: "Get Started | Recastr",
    description: "Set up your workspace and start repurposing content with AI.",
  },
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: { setup?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/onboarding");

  if (!env.demoMode) {
    const projectCount = await prisma.project.count({ where: { userId: user.id } }).catch(() => 0);
    if (projectCount > 0) redirect("/dashboard");
  }

  const showWelcome = !searchParams?.setup;

  return (
    <AppShell projects={[]} title="Creator Setup" user={user}>
      {showWelcome ? <WelcomeScreen /> : <BrandVoiceWizard />}
    </AppShell>
  );
}
