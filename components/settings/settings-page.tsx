"use client";

import type { ComponentType, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Check,
  CreditCard,
  KeyRound,
  Loader2,
  Mail,
  ReceiptText,
  UserCircle,
  Settings,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { RazorpayButton } from "@/components/billing/RazorpayButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CurrentUser } from "@/lib/current-user";
import { PLAN_RULES } from "@/lib/plans";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

type SettingsTab = "profile" | "billing" | "notifications";

const tabs: Array<{ value: SettingsTab; label: string; icon: ComponentType<{ className?: string }> }> = [
  { value: "profile", label: "Profile", icon: UserCircle },
  { value: "billing", label: "Workspace billing", icon: CreditCard },
  { value: "notifications", label: "Notifications", icon: Bell },
];

type ApiEnvelope<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string; code: string } };

type UsageSummary = {
  projects: number;
  contentCount: number;
  scheduled: number;
};

type UsageMetric = {
  label: string;
  used: number;
  limit: number | "unlimited";
  value: string;
};

type NotificationPreferences = {
  notifyContentReady: boolean;
  notifyWeeklyDigest: boolean;
  notifyScheduleReminder: boolean;
  notifyMarketing: boolean;
};

type ProfileSettings = {
  name: string | null;
  email: string;
  creatorType: string | null;
  tonePref: string;
  platforms: string[];
  avatarUrl: string | null;
};

const contentFormats = ["Twitter / X", "LinkedIn", "Instagram", "YouTube Shorts", "Threads", "Facebook"];

export function SettingsPage({ currentUser }: { currentUser?: CurrentUser | null }) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<SettingsTab>(isSettingsTab(requestedTab) ? requestedTab : "profile");
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const [plan, setPlan] = useState<Plan>(currentUser?.plan ?? "FREE");
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordChangeSending, setPasswordChangeSending] = useState(false);
  const [profile, setProfile] = useState({
    name: currentUser?.name ?? "Creator",
    email: currentUser?.email ?? "",
    creatorType: "Founder",
    defaultTone: "Casual",
  });
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    notifyContentReady: true,
    notifyWeeklyDigest: true,
    notifyScheduleReminder: true,
    notifyMarketing: false,
  });
  const usageQuery = useQuery({
    queryKey: ["usage"],
    queryFn: () => fetchApiData<UsageSummary>("/api/usage"),
  });
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchApiData<ProfileSettings>("/api/user/profile"),
  });
  const notificationsQuery = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => fetchApiData<NotificationPreferences>("/api/notifications/preferences"),
  });
  const usage = useMemo<Record<"projects" | "content" | "scheduled", UsageMetric>>(() => {
    const limit = PLAN_RULES[plan].projectLimit;
    const liveUsage = usageQuery.data;
    const projectsUsed = liveUsage?.projects ?? 0;
    const contentUsed = liveUsage?.contentCount ?? 0;
    const scheduledUsed = liveUsage?.scheduled ?? 0;
    const projectValue = liveUsage
      ? limit === "unlimited"
        ? `${projectsUsed} / unlimited`
        : `${projectsUsed} / ${limit}`
      : limit === "unlimited"
        ? "0 / unlimited"
        : `0 / ${limit}`;
    return {
      projects: {
        label: "Projects created",
        used: projectsUsed,
        limit,
        value: projectValue,
      },
      content: {
        label: "Content generated",
        used: contentUsed,
        limit: getUsageSoftLimit(contentUsed, plan === "FREE" ? 25 : plan === "PRO" ? 500 : 1000),
        value: `${contentUsed} ${contentUsed === 1 ? "piece" : "pieces"}`,
      },
      scheduled: {
        label: "Scheduled posts",
        used: scheduledUsed,
        limit: getUsageSoftLimit(scheduledUsed, plan === "FREE" ? 10 : plan === "PRO" ? 200 : 500),
        value: `${scheduledUsed} ${scheduledUsed === 1 ? "post" : "posts"}`,
      },
    };
  }, [plan, usageQuery.data]);

  useEffect(() => {
    setPlan(currentUser?.plan ?? "FREE");
    setProfile((current) => ({
      ...current,
      name: currentUser?.name ?? current.name,
      email: currentUser?.email ?? current.email,
    }));
  }, [currentUser?.email, currentUser?.name, currentUser?.plan]);

  useEffect(() => {
    if (!profileQuery.data) return;
    setProfile({
      name: profileQuery.data.name ?? "",
      email: profileQuery.data.email,
      creatorType: profileQuery.data.creatorType ?? "Founder",
      defaultTone: toTitleCase(profileQuery.data.tonePref || "casual"),
    });
  }, [profileQuery.data]);

  useEffect(() => {
    if (isSettingsTab(requestedTab)) setActiveTab(requestedTab);
  }, [requestedTab]);

  useEffect(() => {
    if (notificationsQuery.data) setNotifications(notificationsQuery.data);
  }, [notificationsQuery.data]);

  async function updateNotificationPref(key: keyof NotificationPreferences, value: boolean) {
    const previous = notifications;
    setNotifications((current) => ({ ...current, [key]: value }));
    const response = await fetch("/api/notifications/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });

    if (!response.ok) {
      setNotifications(previous);
      toast.error("Failed to save notification preference");
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    toast.success("Notification preference saved");
  }

  async function saveProfile() {
    const trimmedName = profile.name.trim();
    if (!trimmedName) {
      toast.error("Name is required");
      return;
    }

    setProfileSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          creatorType: profile.creatorType,
          defaultTone: profile.defaultTone,
          platforms: contentFormats,
        }),
      });
      const payload = (await response.json().catch(() => null)) as ApiEnvelope<ProfileSettings> | null;

      if (!response.ok || payload?.error) {
        toast.error(payload?.error?.message ?? "Failed to save profile");
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile saved");
    } finally {
      setProfileSaving(false);
    }
  }

  async function requestPasswordChange() {
    setPasswordChangeSending(true);
    try {
      const response = await fetch("/api/auth/request-password-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await response.json().catch(() => null)) as ApiEnvelope<{ email: string }> | null;

      if (!response.ok || payload?.error) {
        toast.error(payload?.error?.message ?? "Could not send password verification email");
        return;
      }

      toast.success("Password change email sent. Open the verified link in your inbox.");
    } finally {
      setPasswordChangeSending(false);
    }
  }

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight flex items-center gap-2">
          <Settings className="h-7 w-7 text-primary" />
          Settings
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage workspace preferences, billing, and email notifications.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-full border border-[var(--app-line)] bg-[var(--app-surface)] p-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "relative z-10 flex h-10 items-center gap-2 rounded-full px-5 text-sm font-medium transition-colors",
                activeTab === tab.value ? "text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {activeTab === tab.value && (
                <motion.div
                  layoutId="settings-tab-indicator"
                  className="absolute inset-0 -z-10 rounded-full bg-[var(--violet)]"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "profile" && (
            <div className="overflow-hidden rounded-3xl border border-[var(--app-line)] bg-[var(--app-surface)]">
              <div className="flex items-center gap-2 border-b border-[var(--app-line)] bg-[var(--app-bg)]/45 px-6 py-4">
                <UserCircle className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold font-display">Profile Settings</h2>
              </div>
              <div className="p-6 sm:p-8 space-y-8">
                <div className="flex items-center gap-6">
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[var(--violet)] text-2xl font-bold text-white">
                    {profile.name.slice(0, 1).toUpperCase() || "C"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Workspace avatar</p>
                    <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                      Recastr uses your initials for now. Image uploads are hidden until storage is connected.
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Field label="Full name">
                    <Input
                      className="h-11 rounded-xl border-[var(--app-line)] bg-[var(--app-bg)]/55 focus:ring-primary"
                      value={profile.name}
                      onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      className="h-11 rounded-xl border-[var(--app-line)] bg-[var(--app-bg)]/55 opacity-70"
                      readOnly
                      value={profile.email}
                    />
                  </Field>
                  <Field label="Creator type">
                    <div className="relative">
                      <select
                        className="h-11 w-full appearance-none rounded-xl border border-[var(--app-line)] bg-[var(--app-bg)]/55 px-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                        value={profile.creatorType}
                        onChange={(event) => setProfile((current) => ({ ...current, creatorType: event.target.value }))}
                      >
                        {["Founder", "Podcaster", "YouTuber", "Blogger", "Agency"].map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                        <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </Field>
                  <Field label="Default tone">
                    <div className="relative">
                      <select
                        className="h-11 w-full appearance-none rounded-xl border border-[var(--app-line)] bg-[var(--app-bg)]/55 px-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                        value={profile.defaultTone}
                        onChange={(event) => setProfile((current) => ({ ...current, defaultTone: event.target.value }))}
                      >
                        {["Professional", "Casual", "Educational", "Entertaining"].map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                        <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </Field>
                </div>

                <div className="border-t border-[var(--app-line)] pt-4">
                  <p className="mb-1 text-sm font-semibold">Content formats</p>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Choose what Recastr generates. Publishing connections are managed separately.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {contentFormats.map((platform) => (
                    <Badge key={platform} className="rounded-full border border-[var(--app-line)] bg-[var(--app-panel)] px-3 py-1.5 font-medium text-primary">
                        <Check className="mr-1.5 h-3.5 w-3.5" />
                        {platform}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--app-line)] bg-[var(--app-bg)]/45 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <KeyRound className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Change password</p>
                        <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
                          For security, Recastr sends a verified link to your account email before allowing a password change.
                        </p>
                      </div>
                    </div>
                    <Button
                      className="rounded-full"
                      disabled={passwordChangeSending || !profile.email}
                      onClick={() => void requestPasswordChange()}
                      type="button"
                      variant="secondary"
                    >
                      {passwordChangeSending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {passwordChangeSending ? "Sending..." : "Verify by email"}
                    </Button>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    disabled={profileSaving}
                    onClick={() => void saveProfile()}
                    size="lg"
                    className="rounded-full bg-[var(--violet)] text-white hover:opacity-90 px-8 transition-transform hover:scale-105"
                  >
                    {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {profileSaving ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "billing" && (
            <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
              <div className="h-fit overflow-hidden rounded-3xl border border-[var(--app-line)] bg-[var(--app-surface)]">
                <div className="flex items-center gap-2 border-b border-[var(--app-line)] bg-[var(--app-bg)]/45 px-6 py-4">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold font-display">Current Plan</h2>
                </div>
                <div className="p-6 sm:p-8 space-y-8">
                  <div className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--app-line)] bg-[var(--app-bg)]/45 p-6 sm:flex-row sm:items-center">
                    <div className="relative z-10">
                      <p className="text-sm font-semibold uppercase tracking-wider text-primary">Your Plan</p>
                      <h2 className="mt-1 text-3xl font-bold font-display">{PLAN_RULES[plan].label}</h2>
                      <p className="mt-2 text-sm text-muted-foreground">Next billing: June 29, 2026</p>
                    </div>
                    <Badge variant="success" className="relative z-10 self-start border-0 bg-green-500/15 py-1 text-sm text-green-400 sm:self-center">Active</Badge>
                  </div>

                  <div className="space-y-6">
                    <h3 className="font-semibold">Usage this billing cycle</h3>
                    <UsageBar metric={usage.projects} />
                    <UsageBar metric={usage.content} />
                    <UsageBar metric={usage.scheduled} />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">Billing History</h3>
                    <div className="rounded-2xl border border-dashed border-[var(--app-line-strong)] bg-[var(--app-bg)]/45 px-5 py-8 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <ReceiptText className="h-5 w-5" />
                      </div>
                      <p className="mt-4 text-sm font-semibold">No invoices yet</p>
                      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                        Real billing receipts will appear here after a successful paid subscription payment.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-fit overflow-hidden rounded-3xl border border-[var(--app-line)] bg-[var(--app-surface)]">
                <div className="flex items-center justify-between border-b border-[var(--app-line)] bg-[var(--app-bg)]/45 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold font-display">Upgrade</h2>
                  </div>
                  <div className="flex rounded-full border border-[var(--app-line)] bg-[var(--app-bg)] p-1">
                    {(["monthly", "annual"] as const).map((option) => (
                      <button
                        key={option}
                        onClick={() => setInterval(option)}
                        className={cn("h-7 rounded-full px-3 text-xs font-semibold capitalize transition-all", interval === option ? "bg-[var(--app-panel)] text-foreground" : "text-muted-foreground hover:text-foreground")}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {(Object.keys(PLAN_RULES) as Plan[]).map((planName) => {
                    const rule = PLAN_RULES[planName];
                    const price = interval === "monthly" ? rule.monthlyPrice : rule.annualPrice;
                    const isCurrent = plan === planName;

                    return (
                      <div className={cn(
                        "relative overflow-hidden rounded-2xl border p-5 transition-colors",
                        isCurrent ? "border-primary/50 bg-primary/5" : "border-[var(--app-line)] bg-[var(--app-bg)]/45 hover:border-[var(--app-line-strong)]"
                      )} key={planName}>
                        <div className="flex items-start justify-between relative z-10">
                          <div>
                            <h3 className="font-bold text-lg font-display">{rule.label}</h3>
                            <p className="mt-1 text-2xl font-bold flex items-baseline gap-1">
                              ${price} <span className="text-sm font-medium text-muted-foreground">/mo</span>
                            </p>
                          </div>
                          {isCurrent && <Badge variant="success" className="bg-primary/20 text-primary border-0">Current</Badge>}
                        </div>
                        <div className="mt-5 space-y-2.5 relative z-10">
                          {rule.features.slice(0, 3).map((feature) => (
                            <p key={feature} className="flex gap-2.5 text-sm text-muted-foreground font-medium">
                              <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                              {feature}
                            </p>
                          ))}
                        </div>
                        <div className="mt-6 relative z-10">
                          {planName === "FREE" ? (
                            <Button className="w-full rounded-xl" disabled={isCurrent} variant="secondary">
                              {isCurrent ? "Current plan" : "Choose free"}
                            </Button>
                          ) : (
                            <RazorpayButton
                              className="w-full rounded-xl font-bold"
                              interval={interval}
                              label={isCurrent ? "Manage plan" : `Upgrade to ${rule.label}`}
                              onSuccess={() => setPlan(planName)}
                              plan={planName}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="max-w-3xl overflow-hidden rounded-3xl border border-[var(--app-line)] bg-[var(--app-surface)]">
              <div className="flex items-center gap-2 border-b border-[var(--app-line)] bg-[var(--app-bg)]/45 px-6 py-4">
                <Mail className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold font-display">Email Preferences</h2>
              </div>
              <div className="divide-y divide-[var(--app-line)]">
                {[
                  ["notifyContentReady", "Email when content is ready", "Send an email after an analysis or generation job finishes."],
                  ["notifyWeeklyDigest", "Weekly digest email", "Summarize usage, exports, and scheduled content every week."],
                  ["notifyScheduleReminder", "Schedule reminder", "Remind me before a scheduled post goes out."],
                  ["notifyMarketing", "Marketing emails", "Occasional product updates and growth playbooks."],
                ].map(([key, label, helper]) => {
                  const prefKey = key as keyof NotificationPreferences;
                  return (
                  <div className="flex items-center justify-between gap-6 px-6 py-5 transition-colors hover:bg-[var(--app-panel)]/55" key={key}>
                    <div>
                      <p className="text-base font-semibold">{label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
                    </div>
                    <button
                      aria-label={label}
                      type="button"
                      onClick={() => void updateNotificationPref(prefKey, !notifications[prefKey])}
                      className={cn(
                        "relative h-6 w-11 rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background shrink-0",
                        notifications[prefKey] ? "bg-primary" : "bg-muted-foreground/30",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
                          notifications[prefKey] ? "left-[22px]" : "left-[2px]",
                        )}
                      />
                    </button>
                  </div>
                )})}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">{label}</Label>
      {children}
    </div>
  );
}

function UsageBar({ metric }: { metric: UsageMetric }) {
  const percent = metric.limit === "unlimited"
    ? getUnlimitedUsagePercent(metric.used)
    : Math.min(100, Math.round((metric.used / Math.max(metric.limit, 1)) * 100));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm font-medium">
        <span>{metric.label}</span>
        <span className="text-muted-foreground">{metric.value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full border border-[var(--app-line)] bg-[var(--app-bg)]">
        <div
          className="h-full rounded-full bg-[var(--violet)] transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function getUsageSoftLimit(used: number, fallback: number) {
  return Math.max(fallback, used || 1);
}

function getUnlimitedUsagePercent(used: number) {
  if (used <= 0) return 0;
  return Math.min(100, Math.max(8, Math.round((used / Math.max(used * 1.5, 10)) * 100)));
}

function isSettingsTab(value: string | null): value is SettingsTab {
  return value === "profile" || value === "billing" || value === "notifications";
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

async function fetchApiData<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? "Request failed");
  }
  return payload.data;
}
