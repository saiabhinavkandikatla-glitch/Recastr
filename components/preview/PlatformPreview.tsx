"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DevicePreviewShell, DeviceSwitcher } from "@/components/preview/DevicePreviewShell";
import { FacebookPreview } from "@/components/preview/platforms/FacebookPreview";
import { InstagramPreview } from "@/components/preview/platforms/InstagramPreview";
import { LinkedInPreview } from "@/components/preview/platforms/LinkedInPreview";
import { ThreadsPreview } from "@/components/preview/platforms/ThreadsPreview";
import { XPreview } from "@/components/preview/platforms/XPreview";
import { YouTubeCommunityPreview } from "@/components/preview/platforms/YouTubeCommunityPreview";
import { parsePreviewContent, type PreviewDevice, type PreviewPlatform } from "@/lib/preview-content";
import { cn } from "@/lib/utils";

const platformLabels: Record<PreviewPlatform, string> = {
  LINKEDIN: "LinkedIn",
  TWITTER: "X",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  THREADS: "Threads",
  COMMUNITY: "YouTube Community",
};

const previewPlatforms: PreviewPlatform[] = [
  "LINKEDIN",
  "TWITTER",
  "INSTAGRAM",
  "FACEBOOK",
  "THREADS",
  "COMMUNITY",
];

const fullPreviewPlatforms: PreviewPlatform[] = previewPlatforms;

const storageKey = "recastr-preview-preferences";

type PreviewPreferences = {
  device: PreviewDevice;
  platform: PreviewPlatform;
  theme: "light" | "dark";
};

export function PlatformPreviewEngine({
  platform,
  draft,
  theme,
  onThemeChange,
  includeFacebook = false,
  compact = false,
}: {
  platform: PreviewPlatform;
  draft: string;
  theme?: "light" | "dark";
  onThemeChange?: (theme: "light" | "dark") => void;
  includeFacebook?: boolean;
  compact?: boolean;
}) {
  const [activePlatform, setActivePlatform] = useState<PreviewPlatform>(platform);
  const [device, setDevice] = useState<PreviewDevice>("iphone");
  const [localTheme, setLocalTheme] = useState<"light" | "dark">(theme ?? "dark");
  const platforms = includeFacebook ? fullPreviewPlatforms : previewPlatforms;
  const activeTheme = localTheme;
  const content = useMemo(() => parsePreviewContent(activePlatform, draft), [activePlatform, draft]);

  useEffect(() => {
    const stored = readPreferences();
    if (!stored) return;
    setDevice(stored.device);
    if (!theme) setLocalTheme(stored.theme);
  }, [theme]);

  useEffect(() => {
    if (platforms.includes(platform)) {
      setActivePlatform(platform);
    }
  }, [platform, platforms]);

  useEffect(() => {
    if (theme) {
      setLocalTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    writePreferences({ device, platform: activePlatform, theme: activeTheme });
  }, [activePlatform, activeTheme, device]);

  function changeTheme(nextTheme: "light" | "dark") {
    setLocalTheme(nextTheme);
    onThemeChange?.(nextTheme);
  }

  return (
    <section className={cn("rounded-[var(--card-radius)] border bg-card", compact ? "p-3" : "p-4")}>
      <div className="flex flex-col gap-3 border-b pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Live platform preview</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Updates instantly as the content changes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DeviceSwitcher value={device} onChange={setDevice} />
            <div className="flex rounded-full border bg-muted p-1">
              {(["light", "dark"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => changeTheme(mode)}
                  className={cn(
                    "h-7 rounded-full px-2.5 text-xs font-medium capitalize text-muted-foreground transition",
                    activeTheme === mode && "bg-background text-foreground shadow-soft",
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {platforms.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setActivePlatform(item)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
                activePlatform === item && "border-[var(--violet)] bg-[var(--violet-light)] text-[var(--violet)]",
              )}
            >
              {platformLabels[item]}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4">
        <DevicePreviewShell device={device}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activePlatform}-${activeTheme}-${device}`}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.32, 1] }}
              className="h-full"
            >
              {activePlatform === "LINKEDIN" ? <LinkedInPreview content={content} dark={activeTheme === "dark"} device={device} /> : null}
              {activePlatform === "TWITTER" ? <XPreview content={content} dark={activeTheme === "dark"} device={device} /> : null}
              {activePlatform === "INSTAGRAM" ? <InstagramPreview content={content} dark={activeTheme === "dark"} device={device} /> : null}
              {activePlatform === "FACEBOOK" ? <FacebookPreview content={content} dark={activeTheme === "dark"} device={device} /> : null}
              {activePlatform === "THREADS" ? <ThreadsPreview content={content} dark={activeTheme === "dark"} device={device} /> : null}
              {activePlatform === "COMMUNITY" ? <YouTubeCommunityPreview content={content} dark={activeTheme === "dark"} device={device} /> : null}
            </motion.div>
          </AnimatePresence>
        </DevicePreviewShell>
      </div>
    </section>
  );
}

function readPreferences(): PreviewPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PreviewPreferences>;
    if (!parsed.device || !parsed.platform || !parsed.theme) return null;
    return parsed as PreviewPreferences;
  } catch {
    return null;
  }
}

function writePreferences(value: PreviewPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(value));
}
