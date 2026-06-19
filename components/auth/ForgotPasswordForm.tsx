"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    await fetch("/api/auth/password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);

    setSent(true);
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--app-bg)] px-6 py-12">
      <div className="mb-10">
        <Logo size="lg" className="text-foreground [&_rect]:fill-foreground [&_circle]:fill-[var(--app-bg)] [&_path]:stroke-[var(--app-bg)]" />
      </div>

      <div className="w-full max-w-md rounded-3xl border border-[var(--app-line)] bg-[var(--app-surface)] p-8">
        {sent ? (
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              We sent a reset link to <span className="text-foreground">{email}</span>. It expires in
              1 hour.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block text-sm font-medium text-violet-400 hover:text-violet-300"
            >
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your email and we&apos;ll send a reset link.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="h-11 rounded-xl border-[var(--app-line)] bg-[var(--app-bg)]/60"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-full bg-[var(--violet)] font-semibold text-black hover:bg-[var(--violet-hover)]"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? "Sending..." : "Send reset link"}
            </Button>

            <Link
              href="/login"
              className="block text-center text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to sign in
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
