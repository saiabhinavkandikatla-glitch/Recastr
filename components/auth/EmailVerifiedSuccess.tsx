"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function EmailVerifiedSuccess() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(verified === "1");
  }, [verified]);

  function clearVerifiedParam() {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("verified");
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function goToDashboard() {
    router.replace("/dashboard");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) clearVerifiedParam();
      }}
    >
      <DialogContent className="max-w-md overflow-hidden rounded-3xl border border-[var(--app-line)] bg-[var(--app-surface)] p-0 text-center shadow-soft">
        <div className="p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/15 text-green-500">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <DialogHeader className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              <Sparkles className="h-4 w-4" />
              Email verified
            </div>
            <DialogTitle className="mt-3 text-2xl font-semibold tracking-tight">
              Your email is verified successfully.
            </DialogTitle>
            <DialogDescription className="mx-auto mt-2 max-w-sm text-sm leading-6">
              Your Recastr workspace is active. Continue to your dashboard to start creating and scheduling content.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button className="rounded-full bg-[var(--violet)] text-white hover:bg-[var(--violet-hover)]" onClick={goToDashboard}>
              Go to dashboard
            </Button>
            <Button className="rounded-full" onClick={clearVerifiedParam} variant="secondary">
              Stay here
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
