import { BANNED_PHRASES } from "@/lib/ai/prompts";
import { getPlatformCharacterLimit } from "@/lib/platform-limits";
import type { Platform } from "@/lib/types";

export function containsBannedPhrase(text: string) {
  const lower = text.toLowerCase();
  return BANNED_PHRASES.some((phrase) => lower.includes(phrase));
}

export function validateContentIsReal(content: string, sourceTitle: string) {
  const contentLower = content.toLowerCase().slice(0, 200);
  const titleLower = sourceTitle.toLowerCase().slice(0, 100);

  // Check if content is too similar to title (suspicious if most of title appears in first part of content)
  const titleWords = titleLower.split(/\s+/).filter((w) => w.length > 3);
  const matchedWords = titleWords.filter((word) => contentLower.includes(word));

  if (titleWords.length > 0 && matchedWords.length / titleWords.length > 0.7) {
    return {
      isValid: false,
      error: "Content appears to just echo the title",
    };
  }

  // Check for suspicious generic patterns
  const suspiciousPatterns = [
    /^(so|here's|here is|this|in this)/i,
    /^(key point|main idea|important thing)/i,
  ];

  if (suspiciousPatterns.some((pattern) => pattern.test(content))) {
    return {
      isValid: false,
      error: "Content lacks specificity",
    };
  }

  return { isValid: true, error: null };
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
