"use client";

import type { ComponentType, Dispatch, ReactNode, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
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
  QrCode,
  ReceiptText,
  ShieldCheck,
  Send,
  UserCircle,
  Users,
  Settings,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { RazorpayButton } from "@/components/billing/RazorpayButton";
import { SettingsTeamTab } from "./settings-team-tab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CurrentUser } from "@/lib/current-user";
import { PLAN_RULES } from "@/lib/plans";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

type SettingsTab = "profile" | "team" | "posting" | "billing" | "notifications";

const tabs: Array<{ value: SettingsTab; label: string; icon: ComponentType<{ className?: string }> }> = [
  { value: "profile", label: "Profile", icon: UserCircle },
  { value: "team", label: "Team & Workspace", icon: Users },
  { value: "posting", label: "Posting", icon: Send },
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

type BillingSummary = {
  currentPlan: Plan;
  subscription: {
    id: string;
    interval: "monthly" | "annual";
    nextBillingAt: string | null;
    plan: Plan;
    status: string;
  } | null;
  invoices: Array<{
    id: string;
    amount: number;
    currency: string;
    interval: "monthly" | "annual";
    paidAt: string | null;
    plan: Plan;
    receipt: string;
    status: string;
  }>;
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

type PostingPlatform = "twitter" | "linkedin" | "instagram" | "facebook";

type PostingPreference = {
  defaultPostingMethod: "email_reminder" | "direct_post";
  postVerificationRequired: boolean;
  timezone: string;
};

type PostingAccountSummary = {
  connectedAt: string | null;
  expiresAt: string | null;
  handle: string | null;
  isActive: boolean;
  label: string;
  lastError: string | null;
  lastTestedAt: string | null;
  platform: PostingPlatform;
};

type PostingCredentialForm = {
  accessToken: string;
  apiKey: string;
  apiSecret: string;
  handle: string;
  refreshToken: string;
};

type MfaStatus = {
  currentLevel: "aal1" | "aal2";
  factors: Array<{
    friendlyName: string;
    id: string;
    status: string;
  }>;
  nextLevel: "aal1" | "aal2";
};

type MfaEnrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
};

const contentFormats = ["Twitter / X", "LinkedIn", "Instagram", "YouTube Shorts", "Threads", "Facebook"];
const postingPlatforms: Array<{ platform: PostingPlatform; label: string; helper: string }> = [
  { platform: "twitter", label: "Twitter / X", helper: "Short posts and threads." },
  { platform: "linkedin", label: "LinkedIn", helper: "Founder posts and professional updates." },
  { platform: "instagram", label: "Instagram", helper: "Captions, carousel copy, and reel hooks." },
  { platform: "facebook", label: "Facebook", helper: "Page posts and community updates." },
];

export function SettingsPage({ currentUser }: { currentUser?: CurrentUser | null }) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<SettingsTab>(isSettingsTab(requestedTab) ? requestedTab : "profile");
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const [plan, setPlan] = useState<Plan>(currentUser?.plan ?? "FREE");
  const [billingSaving, setBillingSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordChangeSending, setPasswordChangeSending] = useState(false);
  const [mfaEnrollment, setMfaEnrollment] = useState<MfaEnrollment | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [profile, setProfile] = useState({
    name: currentUser?.name ?? "Creator",
    email: currentUser?.email ?? "",
    creatorType: "Founder",
    defaultTone: "Casual",
  });
  const [postingPreference, setPostingPreference] = useState<PostingPreference>({
    defaultPostingMethod: "email_reminder",
    postVerificationRequired: true,
    timezone: "Asia/Kolkata",
  });
  const [postingCredentialForms, setPostingCredentialForms] = useState<Record<PostingPlatform, PostingCredentialForm>>(
    () => createEmptyPostingCredentialForms(),
  );
  const [postingSavingPlatform, setPostingSavingPlatform] = useState<PostingPlatform | null>(null);
  const [postingPreferenceSaving, setPostingPreferenceSaving] = useState(false);
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
  const billingQuery = useQuery({
    queryKey: ["billing"],
    queryFn: () => fetchApiData<BillingSummary>("/api/billing"),
  });
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchApiData<ProfileSettings>("/api/user/profile"),
  });
  const postingPreferenceQuery = useQuery({
    queryKey: ["posting-preferences"],
    queryFn: () => fetchApiData<PostingPreference>("/api/posting/preferences"),
  });
  const postingAccountsQuery = useQuery({
    queryKey: ["posting-accounts"],
    queryFn: () => fetchApiData<PostingAccountSummary[]>("/api/posting/accounts"),
  });
  const notificationsQuery = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => fetchApiData<NotificationPreferences>("/api/notifications/preferences"),
  });
  const mfaQuery = useQuery({
    queryKey: ["mfa-status"],
    queryFn: () => fetchApiData<MfaStatus>("/api/auth/mfa"),
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
        limit: PLAN_RULES[plan].contentLimit,
        value: `${contentUsed} ${contentUsed === 1 ? "piece" : "pieces"}`,
      },
      scheduled: {
        label: "Scheduled posts",
        used: scheduledUsed,
        limit: PLAN_RULES[plan].scheduledPostLimit,
        value: `${scheduledUsed} ${scheduledUsed === 1 ? "post" : "posts"}`,
      },
    };
  }, [plan, usageQuery.data]);

  useEffect(() => {
    setPlan(billingQuery.data?.currentPlan ?? currentUser?.plan ?? "FREE");
    setProfile((current) => ({
      ...current,
      name: currentUser?.name ?? current.name,
      email: currentUser?.email ?? current.email,
    }));
  }, [billingQuery.data?.currentPlan, currentUser?.email, currentUser?.name, currentUser?.plan]);

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
    if (postingPreferenceQuery.data) setPostingPreference(postingPreferenceQuery.data);
  }, [postingPreferenceQuery.data]);

  useEffect(() => {
    if (notificationsQuery.data) setNotifications(notificationsQuery.data);
  }, [notificationsQuery.data]);

  const verifiedMfaFactor = mfaQuery.data?.factors.find((factor) => factor.status === "verified");
  const activeSubscription = billingQuery.data?.subscription;
  const billingInvoices = billingQuery.data?.invoices ?? [];
  const nextBillingLabel = activeSubscription?.nextBillingAt
    ? formatBillingDate(activeSubscription.nextBillingAt)
    : plan === "FREE"
      ? "No renewal on Free"
      : "Pending payment verification";

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

  async function updatePostingPreference(patch: Partial<PostingPreference>) {
    const previous = postingPreference;
    const next = { ...postingPreference, ...patch };
    setPostingPreference(next);
    setPostingPreferenceSaving(true);

    try {
      const response = await fetch("/api/posting/preferences", {
        body: JSON.stringify(patch),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = (await response.json().catch(() => null)) as ApiEnvelope<PostingPreference> | null;
      if (!response.ok || payload?.error) {
        setPostingPreference(previous);
        toast.error(payload?.error?.message ?? "Could not save posting preference");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["posting-preferences"] });
      toast.success("Posting preference saved");
    } finally {
      setPostingPreferenceSaving(false);
    }
  }

  async function savePostingAccount(platform: PostingPlatform) {
    const form = postingCredentialForms[platform];
    if (!form.accessToken.trim() && !form.apiKey.trim()) {
      toast.error("Add an access token or API key first");
      return;
    }

    setPostingSavingPlatform(platform);
    try {
      const response = await fetch("/api/posting/accounts", {
        body: JSON.stringify({
          accessToken: form.accessToken.trim() || undefined,
          apiKey: form.apiKey.trim() || undefined,
          apiSecret: form.apiSecret.trim() || undefined,
          handle: form.handle.trim() || undefined,
          platform,
          refreshToken: form.refreshToken.trim() || undefined,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = (await response.json().catch(() => null)) as ApiEnvelope<PostingAccountSummary> | null;
      if (!response.ok || payload?.error) {
        toast.error(payload?.error?.message ?? "Could not save platform credentials");
        return;
      }

      setPostingCredentialForms((current) => ({
        ...current,
        [platform]: { accessToken: "", apiKey: "", apiSecret: "", handle: "", refreshToken: "" },
      }));
      await queryClient.invalidateQueries({ queryKey: ["posting-accounts"] });
      toast.success(`${platformLabel(platform)} credentials saved`);
    } finally {
      setPostingSavingPlatform(null);
    }
  }

  async function disconnectPostingAccount(platform: PostingPlatform) {
    setPostingSavingPlatform(platform);
    try {
      const response = await fetch(`/api/posting/accounts?platform=${encodeURIComponent(platform)}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as ApiEnvelope<{ disconnected: boolean }> | null;
      if (!response.ok || payload?.error) {
        toast.error(payload?.error?.message ?? "Could not disconnect platform");
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["posting-accounts"] });
      toast.success(`${platformLabel(platform)} disconnected`);
    } finally {
      setPostingSavingPlatform(null);
    }
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

  async function switchToFreePlan() {
    if (plan === "FREE") return;
    setBillingSaving(true);
    try {
      const response = await fetch("/api/billing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "FREE" }),
      });
      const payload = (await response.json().catch(() => null)) as ApiEnvelope<BillingSummary> | null;
      if (!response.ok || payload?.error) {
        toast.error(payload?.error?.message ?? "Could not update billing");
        return;
      }
      setPlan("FREE");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["billing"] }),
        queryClient.invalidateQueries({ queryKey: ["usage"] }),
      ]);
      toast.success("Plan changed to Free");
    } finally {
      setBillingSaving(false);
    }
  }

  async function requestPasswordChange() {
    setPasswordChangeSending(true);
    try {
      const response = await fetch("/api/auth/request-password-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await response.json().catch(() => null)) as ApiEnvelope<{ sent: boolean }> | null;

      if (!response.ok || payload?.error) {
        toast.error(payload?.error?.message ?? "Could not send password verification email");
        return;
      }

      toast.success("Password change email sent. Open the verified link in your inbox.");
    } finally {
      setPasswordChangeSending(false);
    }
  }

  async function startMfaEnrollment() {
    setMfaBusy(true);
    try {
      const response = await fetch("/api/auth/mfa/enroll", {
        body: JSON.stringify({ friendlyName: "Recastr authenticator" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as ApiEnvelope<MfaEnrollment> | null;
      if (!response.ok || payload?.error || !payload?.data) {
        toast.error(payload?.error?.message ?? "Could not start MFA setup");
        return;
      }
      setMfaEnrollment(payload.data);
      setMfaCode("");
    } finally {
      setMfaBusy(false);
    }
  }

  async function verifyMfaEnrollment() {
    if (!mfaEnrollment || !/^\d{6}$/.test(mfaCode.trim())) {
      toast.error("Enter the 6 digit authenticator code.");
      return;
    }

    setMfaBusy(true);
    try {
      const response = await fetch("/api/auth/mfa/verify", {
        body: JSON.stringify({
          code: mfaCode.trim(),
          factorId: mfaEnrollment.factorId,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as ApiEnvelope<{ verified: boolean }> | null;
      if (!response.ok || payload?.error) {
        toast.error(payload?.error?.message ?? "Could not verify MFA code");
        return;
      }
      setMfaEnrollment(null);
      setMfaCode("");
      await queryClient.invalidateQueries({ queryKey: ["mfa-status"] });
      toast.success("Authenticator app enabled");
    } finally {
      setMfaBusy(false);
    }
  }

  async function disableMfa(factorId: string) {
    setMfaBusy(true);
    try {
      const response = await fetch(`/api/auth/mfa/${encodeURIComponent(factorId)}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as ApiEnvelope<{ disabled: boolean }> | null;
      if (!response.ok || payload?.error) {
        toast.error(payload?.error?.message ?? "Could not disable MFA");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["mfa-status"] });
      toast.success("Authenticator app disabled");
    } finally {
      setMfaBusy(false);
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

      <div className="-mx-1 flex gap-0.5 overflow-x-auto border-b border-[var(--app-line)] pb-1 sm:mx-0 sm:flex-wrap sm:gap-2 sm:rounded-full sm:border sm:bg-[var(--app-surface)] sm:p-1.5 sm:pb-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "relative z-10 flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors sm:h-10 sm:gap-2 sm:rounded-full sm:px-5 sm:text-sm",
                activeTab === tab.value ? "text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {activeTab === tab.value && (
                <motion.div
                  layoutId="settings-tab-indicator"
                  className="absolute inset-0 -z-10 rounded-lg bg-[var(--violet)] sm:rounded-full"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden min-[400px]:inline">{tab.label}</span>
              <span className="min-[400px]:hidden">{tab.label.split(" ")[0]}</span>
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

                <div className="rounded-2xl border border-[var(--app-line)] bg-[var(--app-bg)]/45 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">Authenticator app MFA</p>
                          <Badge className={cn(
                            "rounded-full border-0 px-2 py-0.5 text-[11px]",
                            verifiedMfaFactor ? "bg-green-500/15 text-green-300" : "bg-muted text-muted-foreground"
                          )}>
                            {verifiedMfaFactor ? "Enabled" : "Off"}
                          </Badge>
                        </div>
                        <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
                          Add a time-based one-time code from Google Authenticator, 1Password, Authy, or a compatible app.
                        </p>
                      </div>
                    </div>
                    {verifiedMfaFactor ? (
                      <Button
                        className="rounded-full"
                        disabled={mfaBusy}
                        onClick={() => void disableMfa(verifiedMfaFactor.id)}
                        type="button"
                        variant="destructive"
                      >
                        {mfaBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Disable
                      </Button>
                    ) : (
                      <Button
                        className="rounded-full"
                        disabled={mfaBusy || Boolean(mfaEnrollment)}
                        onClick={() => void startMfaEnrollment()}
                        type="button"
                        variant="secondary"
                      >
                        {mfaBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                        Set up MFA
                      </Button>
                    )}
                  </div>

                  {mfaEnrollment ? (
                    <div className="mt-5 grid gap-5 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4 md:grid-cols-[180px_1fr]">
                      <div className="rounded-2xl bg-white p-3">
                        <Image
                          alt="Authenticator QR code"
                          className="h-auto w-full"
                          height={156}
                          src={mfaEnrollment.qrCode}
                          unoptimized
                          width={156}
                        />
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-semibold">Scan the QR code</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            Then enter the 6 digit code from your authenticator app to finish setup.
                          </p>
                        </div>
                        <div className="rounded-xl border border-[var(--app-line)] bg-[var(--app-bg)]/60 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Manual setup key</p>
                          <p className="mt-1 break-all font-mono text-xs text-foreground">{mfaEnrollment.secret}</p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            className="h-10 rounded-xl border-[var(--app-line)] bg-[var(--app-bg)]/60 font-mono tracking-[0.28em]"
                            inputMode="numeric"
                            maxLength={6}
                            onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                            placeholder="123456"
                            value={mfaCode}
                          />
                          <Button
                            className="rounded-xl bg-[var(--violet)] text-white"
                            disabled={mfaBusy}
                            onClick={() => void verifyMfaEnrollment()}
                            type="button"
                          >
                            {mfaBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Verify
                          </Button>
                          <Button
                            className="rounded-xl"
                            disabled={mfaBusy}
                            onClick={() => {
                              setMfaEnrollment(null);
                              setMfaCode("");
                            }}
                            type="button"
                            variant="ghost"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
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

          {activeTab === "team" && (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              initial={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
            >
              <SettingsTeamTab currentUser={currentUser} />
            </motion.div>
          )}

          {activeTab === "posting" && (
            <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
              <div className="h-fit overflow-hidden rounded-3xl border border-[var(--app-line)] bg-[var(--app-surface)]">
                <div className="flex items-center gap-2 border-b border-[var(--app-line)] bg-[var(--app-bg)]/45 px-6 py-4">
                  <Send className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold font-display">Posting Workflow</h2>
                </div>
                <div className="space-y-6 p-6">
                  <div>
                    <p className="text-sm font-semibold">Default posting method</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Email reminders are sent to your inbox when it is time to publish.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-2xl border border-primary/60 bg-primary/10 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold">Email reminder</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            Send the full post to your inbox when it is time to publish.
                          </p>
                        </div>
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      </div>
                    </div>
                  </div>

                  <Field label="Timezone">
                    <Input
                      className="h-11 rounded-xl border-[var(--app-line)] bg-[var(--app-bg)]/55"
                      onBlur={() => void updatePostingPreference({ timezone: postingPreference.timezone || "Asia/Kolkata" })}
                      onChange={(event) => setPostingPreference((current) => ({ ...current, timezone: event.target.value }))}
                      placeholder="Asia/Kolkata"
                      value={postingPreference.timezone}
                    />
                  </Field>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-[var(--app-line)] bg-[var(--app-surface)]">
                <div className="flex flex-col gap-1 border-b border-[var(--app-line)] bg-[var(--app-bg)]/45 px-6 py-4">
                  <h2 className="text-lg font-bold font-display">Platform Credentials</h2>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Store credentials for platforms you want to manage.
                  </p>
                </div>
                <div className="grid gap-4 p-6 lg:grid-cols-2">
                  {postingPlatforms.map(({ helper, label, platform }) => {
                    const account = postingAccountsQuery.data?.find((item) => item.platform === platform);
                    const form = postingCredentialForms[platform];
                    const saving = postingSavingPlatform === platform;
                    const connected = Boolean(account?.isActive);

                    return (
                      <div className="rounded-2xl border border-[var(--app-line)] bg-[var(--app-bg)]/45 p-5" key={platform}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={cn("h-2.5 w-2.5 rounded-full", connected ? "bg-green-400" : "bg-muted-foreground")} />
                              <h3 className="font-bold">{label}</h3>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</p>
                          </div>
                          <Badge className={cn("rounded-full border-0", connected ? "bg-green-500/15 text-green-300" : "bg-muted text-muted-foreground")}>
                            {connected ? "Connected" : "Not connected"}
                          </Badge>
                        </div>

                        {connected ? (
                          <div className="mt-5 space-y-4">
                            <div className="rounded-xl border border-[var(--app-line)] bg-[var(--app-surface)] p-3">
                              <p className="text-xs font-semibold">{account?.handle || "Handle not set"}</p>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                Connected {account?.connectedAt ? formatDateTime(account.connectedAt) : "recently"}
                              </p>
                              {account?.lastError ? <p className="mt-2 text-xs text-red-300">{account.lastError}</p> : null}
                            </div>
                            <Button
                              className="rounded-xl"
                              disabled={saving}
                              onClick={() => void disconnectPostingAccount(platform)}
                              type="button"
                              variant="destructive"
                            >
                              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              Disconnect
                            </Button>
                          </div>
                        ) : (
                          <div className="mt-5 grid gap-3">
                            <Input
                              className="h-10 rounded-xl border-[var(--app-line)] bg-[var(--app-surface)]"
                              onChange={(event) => updatePostingCredentialForm(platform, "handle", event.target.value, setPostingCredentialForms)}
                              placeholder="@handle or page name"
                              value={form.handle}
                            />
                            <Input
                              className="h-10 rounded-xl border-[var(--app-line)] bg-[var(--app-surface)]"
                              onChange={(event) => updatePostingCredentialForm(platform, "accessToken", event.target.value, setPostingCredentialForms)}
                              placeholder="Access token or API token"
                              type="password"
                              value={form.accessToken}
                            />
                            <div className="grid gap-3 sm:grid-cols-2">
                              <Input
                                className="h-10 rounded-xl border-[var(--app-line)] bg-[var(--app-surface)]"
                                onChange={(event) => updatePostingCredentialForm(platform, "apiKey", event.target.value, setPostingCredentialForms)}
                                placeholder="API key"
                                type="password"
                                value={form.apiKey}
                              />
                              <Input
                                className="h-10 rounded-xl border-[var(--app-line)] bg-[var(--app-surface)]"
                                onChange={(event) => updatePostingCredentialForm(platform, "apiSecret", event.target.value, setPostingCredentialForms)}
                                placeholder="API secret"
                                type="password"
                                value={form.apiSecret}
                              />
                            </div>
                            <Button
                              className="mt-1 rounded-xl bg-[var(--violet)] text-white"
                              disabled={saving}
                              onClick={() => void savePostingAccount(platform)}
                              type="button"
                            >
                              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              Save credentials
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                      <p className="mt-2 text-sm text-muted-foreground">Next billing: {nextBillingLabel}</p>
                    </div>
                    <Badge variant="success" className="relative z-10 self-start border-0 bg-green-500/15 py-1 text-sm text-green-400 sm:self-center">
                      {activeSubscription?.status ? toTitleCase(activeSubscription.status) : "Active"}
                    </Badge>
                  </div>

                  <div className="space-y-6">
                    <h3 className="font-semibold">Usage this billing cycle</h3>
                    <UsageBar metric={usage.projects} />
                    <UsageBar metric={usage.content} />
                    <UsageBar metric={usage.scheduled} />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">Billing History</h3>
                    {billingInvoices.length > 0 ? (
                      <div className="overflow-hidden rounded-2xl border border-[var(--app-line)] bg-[var(--app-bg)]/45">
                        <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-[var(--app-line)] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <span>Receipt</span>
                          <span>Status</span>
                          <span className="text-right">Amount</span>
                        </div>
                        {billingInvoices.map((invoice) => (
                          <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-[var(--app-line)] px-4 py-3 text-sm last:border-b-0" key={invoice.id}>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{invoice.receipt}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {PLAN_RULES[invoice.plan].label} · {invoice.paidAt ? formatBillingDate(invoice.paidAt) : "Awaiting payment"}
                              </p>
                            </div>
                            <Badge className={cn("h-6 rounded-full border-0 px-2 text-[11px]", invoice.status === "paid" ? "bg-green-500/15 text-green-300" : invoice.status === "failed" ? "bg-red-500/15 text-red-300" : "bg-muted text-muted-foreground")}>
                              {toTitleCase(invoice.status)}
                            </Badge>
                            <p className="text-right font-semibold">{formatRupees(invoice.amount)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[var(--app-line-strong)] bg-[var(--app-bg)]/45 px-5 py-8 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <ReceiptText className="h-5 w-5" />
                        </div>
                        <p className="mt-4 text-sm font-semibold">No invoices yet</p>
                        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                          Real billing receipts will appear here after a successful paid subscription payment.
                        </p>
                      </div>
                    )}
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
                              {formatRupees(price * 100)} <span className="text-sm font-medium text-muted-foreground">/{interval === "annual" ? "yr" : "mo"}</span>
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
                            <Button
                              className="w-full rounded-xl"
                              disabled={isCurrent || billingSaving}
                              onClick={() => void switchToFreePlan()}
                              variant="secondary"
                            >
                              {billingSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              {isCurrent ? "Current plan" : "Choose free"}
                            </Button>
                          ) : (
                            <RazorpayButton
                              className="w-full rounded-xl font-bold"
                              interval={interval}
                              label={isCurrent ? "Manage plan" : `Upgrade to ${rule.label}`}
                              onSuccess={() => {
                                setPlan(planName);
                                void queryClient.invalidateQueries({ queryKey: ["billing"] });
                                void queryClient.invalidateQueries({ queryKey: ["usage"] });
                              }}
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

function getUnlimitedUsagePercent(used: number) {
  if (used <= 0) return 0;
  return Math.min(100, Math.max(8, Math.round((used / Math.max(used * 1.5, 10)) * 100)));
}

function isSettingsTab(value: string | null): value is SettingsTab {
  return value === "profile" || value === "posting" || value === "billing" || value === "notifications";
}

function createEmptyPostingCredentialForms(): Record<PostingPlatform, PostingCredentialForm> {
  return {
    facebook: { accessToken: "", apiKey: "", apiSecret: "", handle: "", refreshToken: "" },
    instagram: { accessToken: "", apiKey: "", apiSecret: "", handle: "", refreshToken: "" },
    linkedin: { accessToken: "", apiKey: "", apiSecret: "", handle: "", refreshToken: "" },
    twitter: { accessToken: "", apiKey: "", apiSecret: "", handle: "", refreshToken: "" },
  };
}

function updatePostingCredentialForm(
  platform: PostingPlatform,
  key: keyof PostingCredentialForm,
  value: string,
  setForms: Dispatch<SetStateAction<Record<PostingPlatform, PostingCredentialForm>>>,
) {
  setForms((current) => ({
    ...current,
    [platform]: {
      ...current[platform],
      [key]: value,
    },
  }));
}

function platformLabel(platform: PostingPlatform) {
  return postingPlatforms.find((item) => item.platform === platform)?.label ?? platform;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

function formatBillingDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function formatRupees(valueInPaise: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(valueInPaise / 100);
}

async function fetchApiData<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? "Request failed");
  }
  return payload.data;
}
