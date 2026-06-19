import type { Platform } from "@/lib/types";

export const PLATFORM_CHARACTER_LIMITS = {
  TWITTER: 280,
  LINKEDIN: 3000,
  INSTAGRAM: 2200,
  FACEBOOK: 63206,
  COMMUNITY: 500,
  THREADS: 500,
  CAROUSEL: 2200,
  STORY: 2200,
  HOOKS: 10000,
  CTA: 5000,
} as const;

export function getPlatformCharacterLimit(platform: Platform | string) {
  const normalized = platform.toUpperCase();
  if (normalized === "TWITTER" || normalized === "X" || normalized === "TWITTER/X") {
    return PLATFORM_CHARACTER_LIMITS.TWITTER;
  }
  if (normalized === "LINKEDIN") return PLATFORM_CHARACTER_LIMITS.LINKEDIN;
  if (normalized === "INSTAGRAM" || normalized === "CAROUSEL" || normalized === "STORY") {
    return PLATFORM_CHARACTER_LIMITS.INSTAGRAM;
  }
  if (normalized === "FACEBOOK") return PLATFORM_CHARACTER_LIMITS.FACEBOOK;
  if (normalized === "THREADS") return PLATFORM_CHARACTER_LIMITS.THREADS;
  if (normalized === "HOOKS") return PLATFORM_CHARACTER_LIMITS.HOOKS;
  if (normalized === "CTA") return PLATFORM_CHARACTER_LIMITS.CTA;
  return PLATFORM_CHARACTER_LIMITS.COMMUNITY;
}

export function normalizePlatformCopy(platform: Platform | string, body: string) {
  const limit = getPlatformCharacterLimit(platform);
  if (body.length <= limit) return body;
  return shortenText(body, limit);
}

function shortenText(body: string, limit: number) {
  const cleaned = body.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (cleaned.length <= limit) return cleaned;

  const hardLimit = Math.max(0, limit - 1);
  const sliced = cleaned.slice(0, hardLimit);
  const sentenceBreak = Math.max(
    sliced.lastIndexOf(". "),
    sliced.lastIndexOf("! "),
    sliced.lastIndexOf("? "),
    sliced.lastIndexOf("\n\n"),
  );
  const wordBreak = sliced.lastIndexOf(" ");
  const cutPoint = sentenceBreak > limit * 0.55 ? sentenceBreak + 1 : wordBreak > 0 ? wordBreak : hardLimit;
  return `${sliced.slice(0, cutPoint).trimEnd()}…`;
}
