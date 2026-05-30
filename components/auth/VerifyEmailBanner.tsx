"use client";

import Link from "next/link";
import { MailCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VerifyEmailBanner({ email }: { email?: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
      <section className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/10 bg-card/70 p-8 text-center shadow-soft backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <MailCheck className="h-7 w-7" />
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          <Sparkles className="h-4 w-4" />
          Verify your email
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Check your inbox to continue</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          We sent a confirmation link{email ? ` to ${email}` : ""}. Open it to activate your Recastr
          workspace. After verification, we will bring you to a secure page to create your password.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white">
            <Link href="/login">Go to sign in</Link>
          </Button>
          <Button asChild className="rounded-xl" variant="outline">
            <Link href="/signup">Use another email</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
