"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSignup = mode === "signup";
  const nextPath = normalizeNextPath(searchParams.get("next"), isSignup ? "/onboarding" : "/dashboard");
  const verificationPending = isSignup && searchParams.get("verify") === "pending";
  const pendingEmail = searchParams.get("email");
  const {
    register,
    handleSubmit,
    setError,
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

  async function onSubmit(values: AuthValues) {
    if (!hasSupabaseBrowserConfig) {
      toast.error("Supabase auth is not configured. Add Supabase URL and anon key before signing in.");
      return;
    }

    const supabase = await createSupabaseBrowserClient();

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
        body: JSON.stringify(values),
      });
      const signupPayload = (await signupResponse.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };

      if (!signupResponse.ok && signupPayload.code !== "signup_admin_unavailable") {
        if (signupPayload.code === "user_exists") {
          toast.error("That email already has an account. Sign in instead.");
          router.replace(`/login?next=${encodeURIComponent(nextPath)}&email=${encodeURIComponent(values.email)}`);
          return;
        }
        toast.error(signupPayload.error ?? "Could not create account");
        return;
      }

      if (signupPayload.code === "signup_admin_unavailable") {
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

        if (!data.session) {
          toast.success("Check your inbox - confirm your email to continue.");
          router.replace(`/signup?verify=pending&email=${encodeURIComponent(values.email)}`);
          return;
        }
      }

      toast.success("Check your inbox - confirm your email to continue.");
      router.replace(`/signup?verify=pending&email=${encodeURIComponent(values.email)}`);
      return;
    }

    if (!values.password || values.password.length < 8) {
      toast.error("Enter your password.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      toast.error(error.message);
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
    return <VerifyEmailBanner email={pendingEmail ?? undefined} />;
  }

  return (
    <main className="flex min-h-screen bg-[var(--app-bg)] text-foreground">
      {/* Left side — Brand panel */}
      <div className="relative hidden w-[52%] flex-col justify-between border-r border-[var(--app-line)] bg-[var(--app-bg)] p-12 lg:flex">
        {/* Subtle top accent line */}
        <div className="absolute left-0 right-0 top-0 h-px bg-[var(--app-line)]" />

        <div className="relative z-10 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--violet)]">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </span>
          <span className="font-display text-base font-semibold tracking-tight">Recastr</span>
        </div>

        <div className="relative z-10 max-w-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-violet-400 mb-5">
            AI Content Studio
          </p>
          <h1 className="text-4xl font-display font-semibold leading-tight tracking-tight mb-5">
            Turn one recording into<br />
            30 days of content.
          </h1>
          <p className="mb-10 text-base leading-relaxed text-muted-foreground">
            Join thousands of creators who repurposed their podcasts, videos, and articles into platform-native posts.
          </p>

          <div className="space-y-4">
            {[
              "Generate platform-native content automatically",
              "Smart hook intelligence to grab attention",
              "Visual previews for all major platforms",
            ].map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-3"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/15 shrink-0">
                  <svg className="h-3 w-3 text-violet-400" viewBox="0 0 12 12" fill="none">
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
          <div className="mb-10 flex lg:hidden items-center justify-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--violet)]">
              <Sparkles className="h-5 w-5 text-white" />
            </span>
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
              {isSignup ? (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">
                    Name
                  </Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    placeholder="John Doe"
                    className="h-11 rounded-xl border-[var(--app-line)] bg-[var(--app-bg)]/60 text-sm placeholder:text-muted-foreground/60 focus-visible:border-violet-500/40 focus-visible:ring-violet-500/40"
                    {...register("name")}
                  />
                  {errors.name ? <p className="text-xs text-red-400">{errors.name.message}</p> : null}
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="h-11 rounded-xl border-[var(--app-line)] bg-[var(--app-bg)]/60 text-sm placeholder:text-muted-foreground/60 focus-visible:border-violet-500/40 focus-visible:ring-violet-500/40"
                  {...register("email")}
                />
                {errors.email ? <p className="text-xs text-red-400">{errors.email.message}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  placeholder={isSignup ? "At least 8 characters" : "Enter your password"}
                  className="h-11 rounded-xl border-[var(--app-line)] bg-[var(--app-bg)]/60 text-sm placeholder:text-muted-foreground/60 focus-visible:border-violet-500/40 focus-visible:ring-violet-500/40"
                  {...register("password", {
                    required: "Enter your password",
                    minLength: { value: 8, message: "Use at least 8 characters" },
                  })}
                />
                {errors.password ? <p className="text-xs text-red-400">{errors.password.message}</p> : null}
              </div>

              {isSignup ? (
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-medium text-muted-foreground">
                    Confirm password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    className="h-11 rounded-xl border-[var(--app-line)] bg-[var(--app-bg)]/60 text-sm placeholder:text-muted-foreground/60 focus-visible:border-violet-500/40 focus-visible:ring-violet-500/40"
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword ? <p className="text-xs text-red-400">{errors.confirmPassword.message}</p> : null}
                </div>
              ) : null}

              <Button
                className={cn(
                  "h-11 w-full rounded-full bg-[var(--violet)] text-sm font-semibold text-white transition-colors hover:bg-[var(--violet-hover)]",
                  isSubmitting && "opacity-80"
                )}
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {isSignup ? "Create account" : "Sign in"}
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
              className="font-medium text-violet-400 hover:text-violet-300 transition-colors"
              href={`${isSignup ? "/login" : "/signup"}?next=${encodeURIComponent(nextPath)}`}
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
