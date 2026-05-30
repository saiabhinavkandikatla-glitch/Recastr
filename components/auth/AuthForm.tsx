"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
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
    formState: { errors, isSubmitting },
  } = useForm<AuthValues>({
    resolver: zodResolver(authSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      email: searchParams.get("email") ?? "",
      password: "",
    },
  });

  async function onSubmit(values: AuthValues) {
    if (!hasSupabaseBrowserConfig) {
      toast.error("Supabase auth is not configured. Add Supabase URL and anon key before signing in.");
      return;
    }

    const supabase = await createSupabaseBrowserClient();

    if (isSignup) {
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
          password: createTemporarySignupPassword(),
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
    <main className="flex min-h-screen bg-background overflow-hidden text-foreground">
      {/* Left side - Marketing/Visual */}
      <div className="hidden lg:flex w-[55%] flex-col justify-between p-12 aurora-bg relative border-r border-white/5">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background/80" />

        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-glow">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-bold tracking-wide">Recastr</span>
        </div>

        <div className="relative z-10 max-w-xl">
          <Badge className="bg-primary/20 text-primary border-primary/30 px-3 py-1 mb-6 rounded-full text-xs font-semibold tracking-wide uppercase backdrop-blur-md">
            AI Content Engine
          </Badge>
          <h1 className="text-5xl font-display font-bold leading-[1.1] tracking-tight mb-6">
            Turn one recording into <br />
            <span className="text-gradient">30 days of content.</span>
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground mb-10">
            Join thousands of creators who repurposed their podcasts, videos, and articles into platform-native posts.
          </p>

          <div className="space-y-4">
            {[
              "Generate platform-native content automatically",
              "Smart hook intelligence to grab attention",
              "Visual previews for all major platforms",
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
                className="flex items-center gap-3"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <p className="text-sm font-medium">{feature}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex w-full lg:w-[45%] flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24 relative z-10 bg-background">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-10 flex lg:hidden items-center justify-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-glow">
              <Sparkles className="h-6 w-6" />
            </span>
          </div>

          <div className="text-center lg:text-left mb-10">
            <h2 className="text-3xl font-bold font-display tracking-tight mb-2">
              {isSignup ? "Create an account" : "Welcome back"}
            </h2>
            <p className="text-muted-foreground">
              {isSignup ? "Enter your details. You will create a password after email verification." : "Enter your credentials to access your workspace."}
            </p>
          </div>

          <div className="glass-panel p-8 rounded-[24px] border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-cyan-500/5 pointer-events-none" />

            <form className="space-y-5 relative z-10" onSubmit={handleSubmit(onSubmit)}>
              {isSignup ? (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Name
                  </Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    placeholder="John Doe"
                    className="h-12 rounded-xl bg-muted/40 border-white/10 focus-visible:ring-primary/50"
                    {...register("name")}
                  />
                  {errors.name ? <p className="text-xs text-red-400">{errors.name.message}</p> : null}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="h-12 rounded-xl bg-muted/40 border-white/10 focus-visible:ring-primary/50"
                  {...register("email")}
                />
                {errors.email ? <p className="text-xs text-red-400">{errors.email.message}</p> : null}
              </div>

              {!isSignup ? (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="h-12 rounded-xl bg-muted/40 border-white/10 focus-visible:ring-primary/50"
                    {...register("password", {
                      required: "Enter your password",
                      minLength: { value: 8, message: "Use at least 8 characters" },
                    })}
                  />
                  {errors.password ? <p className="text-xs text-red-400">{errors.password.message}</p> : null}
                </div>
              ) : null}

              <Button
                className={cn("w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-90 font-bold shadow-glow text-base transition-all hover:scale-[1.02]", isSubmitting && "opacity-80 scale-100 hover:scale-100")}
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                {isSignup ? "Create account" : "Sign in"}
                {!isSubmitting ? <ArrowRight className="ml-2 h-5 w-5" /> : null}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground uppercase tracking-widest font-semibold relative z-10">
              <span className="h-px flex-1 bg-border/50" />
              Or
              <span className="h-px flex-1 bg-border/50" />
            </div>

            <Button
              className="w-full h-12 rounded-xl bg-card hover:bg-muted border border-white/10 font-semibold relative z-10 transition-colors"
              onClick={continueWithGoogle}
              type="button"
              variant="outline"
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
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

          <p className="mt-8 text-center text-sm text-muted-foreground font-medium">
            {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
            <Link
              className="font-bold text-primary hover:text-primary/80 transition-colors underline decoration-primary/30 underline-offset-4"
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

function createTemporarySignupPassword() {
  const values = new Uint8Array(24);
  crypto.getRandomValues(values);
  const token = btoa(String.fromCharCode(...Array.from(values))).replaceAll("+", "A").replaceAll("/", "b");
  return `${token}Aa1!`;
}
