import { Platform } from "@/lib/types";
import { type ContentCardPlatform } from "@/components/content/ContentCard";

export function toCardPlatform(platform: Platform): ContentCardPlatform {
  if (platform === "TWITTER") return "twitter";
  if (platform === "LINKEDIN") return "linkedin";
  if (platform === "INSTAGRAM" || platform === "CAROUSEL" || platform === "STORY") return "instagram";
  if (platform === "FACEBOOK") return "facebook";
  if (platform === "THREADS") return "threads";
  return "youtube";
}

export function fromCardPlatform(platform: ContentCardPlatform): Platform {
  if (platform === "twitter") return "TWITTER";
  if (platform === "linkedin") return "LINKEDIN";
  if (platform === "instagram") return "INSTAGRAM";
  if (platform === "facebook") return "FACEBOOK";
  if (platform === "threads") return "THREADS";
  return "COMMUNITY";
}

export function normalizeSupportedPlatform(platform: Platform): Platform {
  if (
    platform === "TWITTER" ||
    platform === "LINKEDIN" ||
    platform === "INSTAGRAM" ||
    platform === "FACEBOOK" ||
    platform === "THREADS" ||
    platform === "COMMUNITY"
  ) {
    return platform;
  }
  if (platform === "CAROUSEL" || platform === "STORY") return "INSTAGRAM";
  return "COMMUNITY";
}

export function platformDot(platform: ContentCardPlatform) {
  return "bg-zinc-400";
}

export function formatContentType(contentType: string) {
  const lower = contentType.toLowerCase();
  if (lower.includes("thread")) return "Thread";
  if (lower.includes("tweet")) return "Tweet";
  if (lower.includes("caption")) return "Caption";
  if (lower.includes("script") || lower.includes("reel")) return "Script";
  if (lower.includes("post")) return "Post";
  return contentType;
}
