import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsPage } from "@/components/settings/settings-page";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your Recastr account, connected platforms, notification preferences, and subscription plan.",
  openGraph: {
    title: "Settings | Recastr",
    description: "Manage your account, platforms, and subscription.",
  },
  twitter: {
    title: "Settings | Recastr",
    description: "Manage your account, platforms, and subscription.",
  },
};

export default async function SettingsRoute() {
  const user = await getCurrentUser();

  return (
    <AppShell title="Settings" user={user}>
      <PageHeader title="Settings" backHref="/dashboard" />
      <SettingsPage currentUser={user} />
    </AppShell>
  );
}
