"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

type CreditEventDetail = {
  credits?: number;
  upgradeUrl?: string;
};

export function CreditUpgradeModal() {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<CreditEventDetail>({});

  useEffect(() => {
    function onCreditExhausted(event: Event) {
      const nextDetail = event instanceof CustomEvent ? (event.detail as CreditEventDetail) : {};
      setDetail(nextDetail);
      setOpen(true);
    }

    window.addEventListener("recastr:credit-exhausted", onCreditExhausted);
    return () => window.removeEventListener("recastr:credit-exhausted", onCreditExhausted);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-bg)]/90 px-4 backdrop-blur-sm">
      <div
        aria-modal="true"
        className="w-full max-w-md rounded-3xl border border-[var(--app-line)] bg-[var(--app-surface)] p-5"
        role="dialog"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--violet-light)] text-[var(--violet)]">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-medium">Credits exhausted</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              This AI action needs credits. Upgrade your workspace with Razorpay to continue generating,
              rewriting, and analyzing content.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[var(--app-line)] bg-[var(--app-bg)]/55 p-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[var(--amber-schedule)]" />
            Remaining credits: {detail.credits ?? 0}
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={() => setOpen(false)} variant="secondary">
            Not now
          </Button>
          <Button asChild onClick={() => setOpen(false)}>
            <Link href={detail.upgradeUrl ?? "/settings?tab=billing"}>
              Upgrade plan
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
