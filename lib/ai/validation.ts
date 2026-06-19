import { BANNED_PHRASES } from "@/lib/ai/prompts";
import { getPlatformCharacterLimit } from "@/lib/platform-limits";
import type { Platform } from "@/lib/types";

export function containsBannedPhrase(text: string) {
  const lower = text.toLowerCase();
  return BANNED_PHRASES.some((phrase) => lower.includes(phrase));
}

export function parseTwitterThread(raw: string) {
  return raw
    .split("---")
    .map((part) => part.replace(/^TWEET_\d+:\s*/i, "").trim())
    .filter(Boolean);
}

export function validateTwitterThread(raw: string) {
  const tweets = parseTwitterThread(raw);
  const errors: string[] = [];

  if (tweets.length < 5) errors.push("Too few tweets generated");
  tweets.forEach((tweet, index) => {
    if (tweet.length > 280) errors.push(`Tweet ${index + 1} exceeds 280 chars`);
    if (containsBannedPhrase(tweet)) errors.push(`Tweet ${index + 1} contains banned AI phrase`);
  });

  return {
    content: tweets.join("\n\n"),
    tweets,
    isValid: errors.length === 0,
    errors,
  };
}

export function validatePlatformPost(platform: Platform, raw: string) {
  const content = cleanupPost(raw);
  const errors: string[] = [];

  if (content.trim().length < 40) errors.push("too short");
  if (containsBannedPhrase(content)) errors.push("contains banned AI phrase");

  if (platform === "TWITTER") {
    return validateTwitterThread(content);
  }

  const limit = getPlatformCharacterLimit(platform);
  if (content.length > limit * 1.15) {
    errors.push(`exceeds ${platform} character limit`);
  }

  return { content, isValid: errors.length === 0, errors, tweets: undefined };
}

export function cleanupPost(value: string) {
  return value
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```$/i, "")
    .replace(/^\s*(output|post|caption|thread|script)\s*:\s*/i, "")
    .replace(/^\{[\s\S]*"content"\s*:\s*"/i, "")
    .replace(/"\s*\}$/i, "")
    .trim();
}
