"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { PasswordField } from "@/components/PasswordField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VerifyEmailBanner } from "@/components/auth/VerifyEmailBanner";
import {
  createSupabaseBrowserClient,
  hasSupabaseBrowserConfig,
} from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const authSchema = z.object({
  name: z.string().trim().min(2, "Use at least 2 characters").optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
});

type AuthValues = z.infer<typeof authSchema>;

type AuthMode = "login" | "signup";
type AuthApiPayload = {
  data?: {
    factors?: Array<{ friendlyName: string; id: string }>;
    mfaRequired?: boolean;
    signedIn?: boolean;
    verified?: boolean;
  };
  error?: { code?: string; message?: string };
};

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSignup = mode === "signup";
  const [mfaPending, setMfaPending] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);

  const nextPath = normalizeNextPath(searchParams.get("next"), isSignup ? "/onboarding" : "/dashboard");
  const verificationPending = isSignup && searchParams.get("verify") === "pending";
  const pendingEmail = searchParams.get("email");

  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AuthValues>({
    resolver: zodResolver(authSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      email: searchParams.get("email") ?? "",
      password: "",
      confirmPassword: "",
    },
  });

  const watchedPassword = watch("password");

  async function onSubmit(values: AuthValues) {
    if (!hasSupabaseBrowserConfig) {
      toast.error("Supabase auth is not configured. Add Supabase URL and anon key before signing in.");
      return;
    }

    if (isSignup) {
      if (!values.password || values.password.length < 8) {
        setError("password", { message: "Use at least 8 characters" });
        return;
      }

      if (values.password !== values.confirmPassword) {
        setError("confirmPassword", { message: "Passwords do not match" });
        return;
      }

      const signupResponse = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, next: nextPath }),
      });
      const signupPayload = (await signupResponse.json().catch(() => ({}))) as {
        data?: { verificationRequired?: boolean };
        error?: { code?: string; message?: string };
      };

      if (!signupResponse.ok && signupPayload.error?.code !== "signup_admin_unavailable") {
        toast.error(signupPayload.error?.message ?? "Could not create account");
        return;
      }

      if (signupPayload.data?.verificationRequired === false) {
        toast.success("Account created successfully!");
        router.replace(nextPath);
        router.refresh();
        return;
      }

      if (signupPayload.error?.code === "signup_admin_unavailable") {
        const supabase = await createSupabaseBrowserClient();
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: {
              name: values.name || values.email.split("@")[0],
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?source=email&next=${encodeURIComponent(nextPath)}`,
          },
        });

        if (error) {
          toast.error(error.message);
          return;
        }

        if (data.session) {
          toast.success("Account created successfully!");
          router.replace(nextPath);
          router.refresh();
          return;
        }

        toast.success("Check your inbox - confirm your email to continue.");
        router.replace(`/signup?verify=pending&email=${encodeURIComponent(values.email)}&next=${encodeURIComponent(nextPath)}`);
        return;
      }

      toast.success("Check your inbox - confirm your email to continue.");
      router.replace(`/signup?verify=pending&email=${encodeURIComponent(values.email)}&next=${encodeURIComponent(nextPath)}`);
      return;
    }

    if (!values.password || values.password.length < 8) {
      toast.error("Enter your password.");
      return;
    }

    if (mfaPending) {
      if (!mfaFactorId || !/^\d{6}$/.test(mfaCode.trim())) {
        toast.error("Enter the 6 digit authenticator code.");
        return;
      }

      const verifyResponse = await fetch("/api/auth/mfa/verify", {
        body: JSON.stringify({
          code: mfaCode.trim(),
          factorId: mfaFactorId,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const verifyPayload = (await verifyResponse.json().catch(() => ({}))) as AuthApiPayload;

      if (!verifyResponse.ok) {
        toast.error(verifyPayload.error?.message ?? "Invalid verification code");
        return;
      }

      setMfaCode("");
      setMfaFactorId(null);
      setMfaPending(false);
      toast.success("Signed in");
      router.replace(nextPath);
      router.refresh();
      return;
    }

    const response = await fetch("/api/auth/login", {
      body: JSON.stringify({
        email: values.email,
        password: values.password,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const payload = (await response.json().catch(() => ({}))) as AuthApiPayload;

    if (!response.ok) {
      toast.error(payload.error?.message ?? "Invalid credentials");
      return;
    }

    if (payload.data?.mfaRequired) {
      const firstFactor = payload.data.factors?.[0];
      if (!firstFactor) {
        toast.error("MFA is required, but no authenticator factor is available.");
        return;
      }
      setMfaFactorId(firstFactor.id);
      setMfaPending(true);
      setMfaCode("");
      toast.success("Enter your authenticator code to continue.");
      return;
    }

    toast.success("Signed in");
    router.replace(nextPath);
    router.refresh();
  }

  async function continueWithGoogle() {
    if (!hasSupabaseBrowserConfig) {
      toast.error("Google sign-in requires Supabase auth configuration.");
      return;
    }

    const supabase = await createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });
    if (error) {
      toast.error(error.message);
    }
  }

  if (verificationPending) {
    return <VerifyEmailBanner email={pendingEmail ?? undefined} next={searchParams.get("next") ?? undefined} />;
  }

  return (
    <main className="flex min-h-screen bg-[var(--app-bg)] text-foreground">
      {/* Left side — Brand panel */}
      <div className="relative hidden w-[52%] flex-col justify-between border-r border-[var(--app-line)] bg-[var(--app-bg)] p-12 lg:flex">
        {/* Subtle top accent line */}
        <div className="absolute left-0 right-0 top-0 h-px bg-[var(--app-line)]" />

        <Logo
          size="md"
          className="relative z-10 text-foreground [&_rect]:fill-foreground [&_circle]:fill-[var(--app-bg)] [&_path]:stroke-[var(--app-bg)]"
        />

        <div className="relative z-10 max-w-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#8A8A8A] mb-5">
            Content repurposing workspace
          </p>
          <h1
            className="text-4xl font-display font-semibold leading-tight tracking-tight mb-5"
            aria-label="Turn long-form content into ready-to-use posts."
          >
            Turn long-form content
            <br />
            into ready-to-use posts.
          </h1>
          <p className="mb-10 text-base leading-relaxed text-muted-foreground">
            Upload one source, analyze the strongest ideas, and review platform-ready drafts before publishing.
          </p>

          <div className="space-y-4">
            {[
              "Upload videos, podcasts, blogs, and text",
              "Analyze hooks, insights, and takeaways",
              "Review platform-native content before posting",
            ].map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-3"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 shrink-0">
                  <svg className="h-3 w-3 text-white/80" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-sm text-foreground/85">{feature}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Right side — Auth Form */}
      <div className="flex w-full flex-col justify-center bg-[var(--app-bg)] px-6 py-12 sm:px-12 lg:w-[48%] lg:px-16 xl:px-20">
        <div className="mx-auto w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="mb-10 flex justify-center lg:hidden">
            <Logo
              size="lg"
              className="text-foreground [&_rect]:fill-foreground [&_circle]:fill-[var(--app-bg)] [&_path]:stroke-[var(--app-bg)]"
            />
          </div>

          <div className="text-center lg:text-left mb-8">
            <h2 className="text-2xl font-semibold font-display tracking-tight mb-2">
              {isSignup ? "Create an account" : "Welcome back"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSignup ? "We'll verify your email before opening your workspace." : "Enter your credentials to access your workspace."}
            </p>
          </div>

          <div className="rounded-3xl border border-[var(--app-line)] bg-[var(--app-surface)] p-6">
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="h-11 rounded-xl border-[var(--app-line)] bg-[var(--app-bg)]/60 text-sm placeholder:text-muted-foreground/60 focus-visible:border-white/20 focus-visible:ring-white/20"
                  {...register("email")}
                />
                {errors.email ? <p className="text-xs text-red-400">{errors.email.message}</p> : null}
              </div>

              {isSignup ? (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">
                    Name
                  </Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    placeholder="John Doe"
                    className="h-11 rounded-xl border-[var(--app-line)] bg-[var(--app-bg)]/60 text-sm placeholder:text-muted-foreground/60 focus-visible:border-white/20 focus-visible:ring-white/20"
                    {...register("name")}
                  />
                  {errors.name ? <p className="text-xs text-red-400">{errors.name.message}</p> : null}
                </div>
              ) : null}

              <PasswordField
                id="password"
                label="Password"
                value={watchedPassword || ""}
                onChange={(value) => setValue("password", value, { shouldValidate: true })}
                showStrength={isSignup}
                placeholder={isSignup ? "At least 8 characters" : "Enter your password"}
                autoComplete={isSignup ? "new-password" : "current-password"}
                error={errors.password?.message}
              />

              {!isSignup ? (
                <div className="text-right">
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              ) : null}

              {isSignup ? (
                <PasswordField
                  id="confirmPassword"
                  label="Confirm password"
                  value={watch("confirmPassword") || ""}
                  onChange={(value) => setValue("confirmPassword", value, { shouldValidate: true })}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  error={errors.confirmPassword?.message}
                />
              ) : null}

              {!isSignup && mfaPending ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="mb-3 flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-zinc-300">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Authenticator required</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Enter the 6 digit code from your authenticator app.
                      </p>
                    </div>
                  </div>
                  <Label htmlFor="mfaCode" className="text-xs font-medium text-muted-foreground">
                    Verification code
                  </Label>
                  <Input
                    autoComplete="one-time-code"
                    className="mt-1.5 h-11 rounded-xl border-[var(--app-line)] bg-[var(--app-bg)]/60 text-sm tracking-[0.28em] placeholder:tracking-normal placeholder:text-muted-foreground/60 focus-visible:border-white/20 focus-visible:ring-white/20"
                    id="mfaCode"
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    value={mfaCode}
                  />
                </div>
              ) : null}

              <Button
                className={cn(
                  "h-11 w-full rounded-full bg-[var(--violet)] text-sm font-semibold text-black transition-colors hover:bg-[var(--violet-hover)]",
                  isSubmitting && "opacity-80"
                )}
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {mfaPending ? "Verify code" : isSignup ? "Create account" : "Sign in"}
                {!isSubmitting ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              <span className="h-px flex-1 bg-[var(--app-line)]" />
              Or
              <span className="h-px flex-1 bg-[var(--app-line)]" />
            </div>

            <Button
              className="h-11 w-full rounded-full border border-[var(--app-line)] bg-[var(--app-bg)]/60 text-sm font-medium transition-colors hover:bg-[var(--app-panel)]"
              onClick={continueWithGoogle}
              type="button"
              variant="outline"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
            <Link
              className="font-medium text-zinc-400 hover:text-white transition-colors"
              href={
                isSignup
                  ? `/login?next=${encodeURIComponent(searchParams.get("next") ?? "/dashboard")}`
                  : `/signup?next=${encodeURIComponent(searchParams.get("next") ?? "/onboarding")}`
              }
            >
              {isSignup ? "Sign in instead" : "Create one now"}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function normalizeNextPath(value: string | null, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
