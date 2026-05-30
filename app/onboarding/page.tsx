import { AppShell } from "@/components/layout/AppShell";
import { BrandVoiceWizard } from "@/components/onboarding/brand-voice-wizard";
import { WelcomeScreen } from "@/components/onboarding/WelcomeScreen";
import { getCurrentUser } from "@/lib/current-user";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: { setup?: string };
}) {
  const user = await getCurrentUser();
  const showWelcome = !searchParams?.setup;

  return (
    <AppShell projects={[]} title="Brand Voice" user={user}>
      {showWelcome ? <WelcomeScreen /> : <BrandVoiceWizard />}
    </AppShell>
  );
}
