import type { Platform } from "@/lib/types";

export const PLATFORM_CHARACTER_LIMITS = {
  TWITTER: 280,
  LINKEDIN: 3000,
  INSTAGRAM: 2200,
  YOUTUBE: 500,
  COMMUNITY: 500,
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
  return PLATFORM_CHARACTER_LIMITS.YOUTUBE;
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
