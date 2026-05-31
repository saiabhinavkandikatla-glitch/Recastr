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

type NotificationPreferences = {
  notifyContentReady: boolean;
  notifyWeeklyDigest: boolean;
  notifyScheduleReminder: boolean;
  notifyMarketing: boolean;
};

const contentFormats = ["Twitter / X", "LinkedIn", "Instagram", "YouTube Shorts", "Threads", "Facebook"];

export function SettingsPage({ currentUser }: { currentUser?: CurrentUser | null }) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<SettingsTab>(isSettingsTab(requestedTab) ? requestedTab : "profile");
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const [plan, setPlan] = useState<Plan>(currentUser?.plan ?? "FREE");
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
  const notificationsQuery = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => fetchApiData<NotificationPreferences>("/api/notifications/preferences"),
  });
  const usage = useMemo(() => {
    const limit = PLAN_RULES[plan].projectLimit;
    const liveUsage = usageQuery.data;
    const projectValue = liveUsage
      ? limit === "unlimited"
        ? `${liveUsage.projects} / unlimited`
        : `${liveUsage.projects} / ${limit}`
      : limit === "unlimited"
        ? "0 / unlimited"
        : `0 / ${limit}`;
    return {
      projects: projectValue,
      content: `${liveUsage?.contentCount ?? 0} pieces`,
      scheduled: `${liveUsage?.scheduled ?? 0} posts`,
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

      <div className="flex flex-wrap gap-2 rounded-[16px] border border-white/5 bg-card/40 backdrop-blur-md p-1.5 glass-panel">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "relative flex h-10 items-center gap-2 rounded-[12px] px-5 text-sm font-medium transition-colors z-10",
                activeTab === tab.value ? "text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              {activeTab === tab.value && (
                <motion.div
                  layoutId="settings-tab-indicator"
                  className="absolute inset-0 rounded-[12px] bg-gradient-to-r from-violet-600 to-cyan-500 shadow-sm -z-10"
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
            <div className="rounded-[24px] border border-white/5 glass-card bg-card/40 shadow-xl overflow-hidden">
              <div className="border-b border-white/5 bg-muted/10 px-6 py-4 flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold font-display">Profile Settings</h2>
              </div>
              <div className="p-6 sm:p-8 space-y-8">
                <div className="flex items-center gap-6">
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-2xl font-bold text-white shadow-glow">
                    {profile.name.slice(0, 1).toUpperCase() || "C"}
                  </div>
                  <div>
                    <Button variant="secondary" className="rounded-full shadow-sm">Upload photo</Button>
                    <p className="mt-2 text-xs text-muted-foreground">JPG or PNG, up to 2MB.</p>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Field label="Full name">
                    <Input
                      className="h-11 rounded-xl bg-muted/30 border-white/10 focus:ring-primary"
                      value={profile.name}
                      onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      className="h-11 rounded-xl bg-muted/30 border-white/10 opacity-70"
                      readOnly
                      value={profile.email}
                    />
                  </Field>
                  <Field label="Creator type">
                    <div className="relative">
                      <select
                        className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-muted/30 px-4 text-sm outline-none focus:ring-2 focus:ring-primary"
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
                        className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-muted/30 px-4 text-sm outline-none focus:ring-2 focus:ring-primary"
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

                <div className="pt-4 border-t border-white/5">
                  <p className="mb-1 text-sm font-semibold">Content formats</p>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Choose what Recastr generates. Publishing connections are managed separately.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {contentFormats.map((platform) => (
                      <Badge key={platform} className="bg-primary/10 text-primary border-0 py-1.5 px-3 rounded-lg font-medium">
                        <Check className="mr-1.5 h-3.5 w-3.5" />
                        {platform}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={() => toast.success("Profile updated")}
                    size="lg"
                    className="rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-90 px-8 shadow-glow transition-transform hover:scale-105"
                  >
                    Save changes
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "billing" && (
            <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
              <div className="rounded-[24px] border border-white/5 glass-card bg-card/40 shadow-xl overflow-hidden h-fit">
                <div className="border-b border-white/5 bg-muted/10 px-6 py-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold font-display">Current Plan</h2>
                </div>
                <div className="p-6 sm:p-8 space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[20px] border border-white/5 bg-gradient-to-br from-primary/10 to-transparent p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-32 w-32 bg-primary/20 blur-[50px] -translate-y-1/2 translate-x-1/4 rounded-full" />
                    <div className="relative z-10">
                      <p className="text-sm font-semibold uppercase tracking-wider text-primary">Your Plan</p>
                      <h2 className="mt-1 text-3xl font-bold font-display">{PLAN_RULES[plan].label}</h2>
                      <p className="mt-2 text-sm text-muted-foreground">Next billing: June 29, 2026</p>
                    </div>
                    <Badge variant="success" className="bg-green-500/20 text-green-500 border-0 text-sm py-1 relative z-10 self-start sm:self-center">Active</Badge>
                  </div>

                  <div className="space-y-6">
                    <h3 className="font-semibold">Usage this billing cycle</h3>
                    <UsageBar label="Projects created" value={usage.projects}  />
                    <UsageBar label="Content generated" value={usage.content}  />
                    <UsageBar label="Scheduled posts" value={usage.scheduled}  />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">Billing History</h3>
                    <div className="rounded-[16px] border border-dashed border-white/10 bg-card/30 px-5 py-8 text-center">
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

              <div className="rounded-[24px] border border-white/5 glass-card bg-card/40 shadow-xl overflow-hidden h-fit">
                <div className="border-b border-white/5 bg-muted/10 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold font-display">Upgrade</h2>
                  </div>
                  <div className="flex rounded-lg border border-white/10 bg-muted/50 p-1">
                    {(["monthly", "annual"] as const).map((option) => (
                      <button
                        key={option}
                        onClick={() => setInterval(option)}
                        className={cn("h-7 rounded-md px-3 text-xs font-semibold capitalize transition-all", interval === option ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
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
                        "rounded-[16px] border p-5 transition-all relative overflow-hidden",
                        isCurrent ? "border-primary/50 bg-primary/5" : "border-white/5 bg-card/50 hover:border-white/20"
                      )} key={planName}>
                        {isCurrent && <div className="absolute top-0 right-0 w-16 h-16 bg-primary/20 blur-2xl rounded-full" />}
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
                              className="w-full rounded-xl font-bold shadow-glow"
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
            <div className="rounded-[24px] border border-white/5 glass-card bg-card/40 shadow-xl overflow-hidden max-w-3xl">
              <div className="border-b border-white/5 bg-muted/10 px-6 py-4 flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold font-display">Email Preferences</h2>
              </div>
              <div className="divide-y divide-white/5">
                {[
                  ["notifyContentReady", "Email when content is ready", "Send an email after an analysis or generation job finishes."],
                  ["notifyWeeklyDigest", "Weekly digest email", "Summarize usage, exports, and scheduled content every week."],
                  ["notifyScheduleReminder", "Schedule reminder", "Remind me before a scheduled post goes out."],
                  ["notifyMarketing", "Marketing emails", "Occasional product updates and growth playbooks."],
                ].map(([key, label, helper]) => {
                  const prefKey = key as keyof NotificationPreferences;
                  return (
                  <div className="flex items-center justify-between gap-6 px-6 py-5 hover:bg-muted/5 transition-colors" key={key}>
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

function UsageBar({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm font-medium">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted/50 border border-white/5">
        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 relative">
          <div className="absolute inset-0 bg-white/20 w-full animate-shimmer" />
        </div>
      </div>
    </div>
  );
}

function isSettingsTab(value: string | null): value is SettingsTab {
  return value === "profile" || value === "billing" || value === "notifications";
}

async function fetchApiData<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? "Request failed");
  }
  return payload.data;
}
