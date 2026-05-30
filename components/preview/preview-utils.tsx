"use client";

import { cn } from "@/lib/utils";

export function PreviewAvatar({
  tone,
  size = "md",
}: {
  tone: "blue" | "sky" | "pink" | "red" | "black" | "violet";
  size?: "sm" | "md" | "lg";
}) {
  const color = {
    blue: "bg-[var(--platform-linkedin)]",
    sky: "bg-[var(--platform-twitter)]",
    pink: "bg-[var(--platform-instagram)]",
    red: "bg-[var(--platform-youtube)]",
    black: "bg-zinc-900",
    violet: "bg-[var(--violet)]",
  }[tone];
  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  }[size];

  return <div className={cn("shrink-0 rounded-full", color, sizes)} />;
}

export function PreviewMedia({
  label,
  variant = "image",
  className,
}: {
  label: string;
  variant?: "image" | "video" | "carousel" | "short";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted text-foreground",
        variant === "video" ? "aspect-[9/16]" : "aspect-square",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[var(--violet-muted)]" />
      <div className="absolute inset-x-4 bottom-4 rounded-2xl border bg-background/95 p-4">
        <p className="text-pretty text-lg font-medium leading-tight">{label}</p>
      </div>
      {variant === "carousel" ? (
        <div className="absolute right-3 top-3 rounded-full bg-black/45 px-2 py-1 text-[10px] font-medium">
          1/5
        </div>
      ) : null}
    </div>
  );
}

export function clampText(text: string, max = 260) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}
