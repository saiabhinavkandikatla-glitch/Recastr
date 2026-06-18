"use client";

import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#232323] bg-[#090909]/50 px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#151515] border border-[#232323] mb-4">
        <Icon className="h-8 w-8 text-[#8A8A8A]" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-[#8A8A8A]">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="bg-white text-black hover:bg-zinc-200">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
