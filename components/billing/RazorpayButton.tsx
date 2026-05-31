"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RazorpayButton({
  className,
  label = "Upgrade",
}: {
  plan: "PRO" | "TEAM" | "AGENCY";
  interval: "monthly" | "annual";
  className?: string;
  label?: string;
  onSuccess?: () => void;
}) {
  return (
    <Button
      className={cn(className)}
      onClick={() => toast.info("Billing is temporarily disabled while Recastr is being deployed.")}
      type="button"
    >
      {label}
    </Button>
  );
}
