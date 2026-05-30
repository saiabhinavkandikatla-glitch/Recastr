"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, LogIn, Sparkles, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function AuthPromptModal({
  open,
  onOpenChange,
  projectTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectTitle?: string;
}) {
  const next = encodeURIComponent("/dashboard");

  async function continueWithGoogle() {
    if (!hasSupabaseBrowserConfig) {
      window.location.href = `/signup?next=${next}`;
      return;
    }

    const supabase = await createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
      },
    });

    if (error) toast.error(error.message);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] overflow-hidden rounded-[24px] border border-white/10 bg-card p-0 shadow-soft">
        <div className="grid gap-0 sm:grid-cols-[0.95fr_1.05fr]">
          <div className="border-b border-white/10 bg-muted/30 p-6 sm:border-b-0 sm:border-r">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--violet)] text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <DialogHeader className="mt-5 text-left">
              <DialogTitle className="text-2xl font-semibold tracking-tight">
                Create your Recastr workspace
              </DialogTitle>
              <DialogDescription className="text-sm leading-6">
                Demo browsing is limited. Sign up to open full projects, edit generated posts, export packs, and schedule content.
              </DialogDescription>
            </DialogHeader>

            {projectTitle ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-background/70 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Selected project</p>
                <p className="mt-1 line-clamp-2 text-sm font-semibold text-foreground">{projectTitle}</p>
              </div>
            ) : null}
          </div>

          <div className="p-6">
            <div className="space-y-2">
              <button
                className={buttonClass("primary")}
                onClick={continueWithGoogle}
                type="button"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-950">
                  G
                </span>
                Continue with Google
              </button>
              <Link className={buttonClass("secondary")} href={`/signup?next=${next}`}>
                <ArrowRight className="h-4 w-4" />
                Create Account
              </Link>
              <Link className={buttonClass("ghost")} href={`/login?next=${next}`}>
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            </div>

            <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
              <FeatureLine icon={CheckCircle2} text="Generate platform-ready posts from one source." />
              <FeatureLine icon={CalendarClock} text="Schedule reminders and export in one workspace." />
              <FeatureLine icon={Sparkles} text="Save every project to your own private account." />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FeatureLine({
  icon: Icon,
  text,
}: {
  icon: LucideIcon;
  text: string;
}) {
  return (
    <div className="flex gap-3 text-sm leading-6 text-muted-foreground">
      <Icon className="mt-1 h-4 w-4 shrink-0 text-[var(--violet)]" />
      <span>{text}</span>
    </div>
  );
}

function buttonClass(kind: "primary" | "secondary" | "ghost") {
  return cn(
    "inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--violet)] focus-visible:ring-offset-2",
    kind === "primary" && "bg-[var(--violet)] text-white hover:bg-[var(--violet-hover)]",
    kind === "secondary" && "border border-border bg-background text-foreground hover:bg-muted",
    kind === "ghost" && "text-muted-foreground hover:bg-muted hover:text-foreground",
  );
}
