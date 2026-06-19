"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { PasswordField } from "@/components/PasswordField";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";

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
  const isChangeMode = searchParams.get("mode") === "change";
  const nextPath = useMemo(
    () => normalizeNextPath(searchParams.get("next"), "/onboarding"),
    [searchParams],
  );
  const {
    register,
    handleSubmit,
    control,
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
      const response = await fetch("/api/auth/session", { cache: "no-store" }).catch(() => null);
      const payload = (await response?.json().catch(() => null)) as
        | { data?: { email?: string } }
        | null;

      if (!mounted) return;
      setEmail(payload?.data?.email ?? null);
      setSessionState(response?.ok && payload?.data?.email ? "ready" : "missing");
    }

    void checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  async function onSubmit(values: CreatePasswordValues) {
    const response = await fetch("/api/auth/update-password", {
      body: JSON.stringify({
        invalidateSessions: isChangeMode,
        password: values.password,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;

    if (!response.ok) {
      toast.error(payload?.error?.message ?? "Could not update password. Try again.");
      return;
    }

    toast.success(isChangeMode ? "Password updated. Sign in again." : "Password created. Welcome to Recastr.");
    router.replace(isChangeMode ? "/login?password=updated" : nextPath);
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--app-bg)] px-6 py-12 text-foreground">
      <section className="w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--app-line)] bg-[var(--app-surface)] p-8">
        <div className="mb-6 flex justify-center">
          <Logo
            size="lg"
            className="text-foreground [&_rect]:fill-foreground [&_circle]:fill-[var(--app-bg)] [&_path]:stroke-[var(--app-bg)]"
          />
        </div>

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          {verified ? <CheckCircle2 className="h-7 w-7" /> : <KeyRound className="h-7 w-7" />}
        </div>

        <div className="mt-6 text-center text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          {isChangeMode ? "Verified password change" : verified ? "Email verified" : "Secure setup"}
        </div>

        <div className="mt-3 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            {isChangeMode ? "Change your password" : "Create your password"}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            {isChangeMode && email
              ? `Set a new password for ${email}.`
              : email
              ? `Set a password for ${email} to finish activating your workspace.`
              : isChangeMode
              ? "Set a new password for your Recastr account."
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
              Open the latest verification email again, or request a new password change link from profile settings.
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
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <PasswordField
                  id="password"
                  label="New password"
                  value={field.value}
                  onChange={field.onChange}
                  showStrength
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  error={errors.password?.message}
                />
              )}
            />

            <Controller
              name="confirmPassword"
              control={control}
              render={({ field }) => (
                <PasswordField
                  id="confirmPassword"
                  label="Confirm password"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  error={errors.confirmPassword?.message}
                />
              )}
            />

            <Button
              className="h-12 w-full rounded-full bg-[var(--violet)] text-base font-bold text-black hover:bg-[var(--violet-hover)]"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {isChangeMode ? "Update password" : "Create password"}
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
