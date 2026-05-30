"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, KeyRound, Loader2, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createSupabaseBrowserClient,
  hasSupabaseBrowserConfig,
} from "@/lib/supabase/client";

const createPasswordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type CreatePasswordValues = z.infer<typeof createPasswordSchema>;

type SessionState = "checking" | "ready" | "missing";

export function CreatePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [email, setEmail] = useState<string | null>(null);
  const verified = searchParams.get("verified") === "1";
  const nextPath = useMemo(
    () => normalizeNextPath(searchParams.get("next"), "/onboarding"),
    [searchParams],
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreatePasswordValues>({
    resolver: zodResolver(createPasswordSchema),
    mode: "onTouched",
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      if (!hasSupabaseBrowserConfig) {
        if (mounted) setSessionState("missing");
        return;
      }

      const supabase = await createSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;
      setEmail(session?.user.email ?? null);
      setSessionState(session ? "ready" : "missing");
    }

    void checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  async function onSubmit(values: CreatePasswordValues) {
    if (!hasSupabaseBrowserConfig) {
      toast.error("Supabase auth is not configured.");
      return;
    }

    const supabase = await createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Password created. Welcome to Recastr.");
    router.replace(nextPath);
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 py-12 text-foreground">
      <section className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/10 bg-card/70 p-8 shadow-soft backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          {verified ? <CheckCircle2 className="h-7 w-7" /> : <KeyRound className="h-7 w-7" />}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          <Sparkles className="h-4 w-4" />
          {verified ? "Email verified" : "Secure setup"}
        </div>

        <div className="mt-3 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Create your password</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            {email
              ? `Set a password for ${email} to finish activating your workspace.`
              : "Set a password to finish activating your workspace."}
          </p>
        </div>

        {sessionState === "checking" ? (
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking your verified session...
          </div>
        ) : null}

        {sessionState === "missing" ? (
          <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-center">
            <p className="text-sm font-medium text-red-200">This verification session is missing or expired.</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Open the latest verification email again, or create a new account link.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild className="rounded-xl" variant="secondary">
                <Link href="/signup">Create account</Link>
              </Button>
              <Button asChild className="rounded-xl" variant="outline">
                <Link href="/login">Go to sign in</Link>
              </Button>
            </div>
          </div>
        ) : null}

        {sessionState === "ready" ? (
          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                New password
              </Label>
              <Input
                autoComplete="new-password"
                className="h-12 rounded-xl border-white/10 bg-muted/40 focus-visible:ring-primary/50"
                id="password"
                placeholder="At least 8 characters"
                type="password"
                {...register("password")}
              />
              {errors.password ? <p className="text-xs text-red-400">{errors.password.message}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Confirm password
              </Label>
              <Input
                autoComplete="new-password"
                className="h-12 rounded-xl border-white/10 bg-muted/40 focus-visible:ring-primary/50"
                id="confirmPassword"
                placeholder="Repeat your password"
                type="password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword ? <p className="text-xs text-red-400">{errors.confirmPassword.message}</p> : null}
            </div>

            <Button
              className="h-12 w-full rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-base font-bold text-white shadow-glow hover:opacity-90"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              Create password
              {!isSubmitting ? <ArrowRight className="h-5 w-5" /> : null}
            </Button>
          </form>
        ) : null}
      </section>
    </main>
  );
}

function normalizeNextPath(value: string | null, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
