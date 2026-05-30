import { Platform } from "@/lib/types";
import { type ContentCardPlatform } from "@/components/content/ContentCard";

export function toCardPlatform(platform: Platform): ContentCardPlatform {
  if (platform === "TWITTER") return "twitter";
  if (platform === "LINKEDIN") return "linkedin";
  if (platform === "INSTAGRAM" || platform === "CAROUSEL" || platform === "STORY") return "instagram";
  return "youtube";
}

export function fromCardPlatform(platform: ContentCardPlatform): Platform {
  if (platform === "twitter") return "TWITTER";
  if (platform === "linkedin") return "LINKEDIN";
  if (platform === "instagram") return "INSTAGRAM";
  return "YOUTUBE";
}

export function normalizeSupportedPlatform(platform: Platform): Platform {
  if (platform === "TWITTER" || platform === "LINKEDIN" || platform === "INSTAGRAM" || platform === "YOUTUBE") {
    return platform;
  }
  if (platform === "CAROUSEL" || platform === "STORY") return "INSTAGRAM";
  return "YOUTUBE";
}

export function platformDot(platform: ContentCardPlatform) {
  if (platform === "twitter") return "bg-sky-500";
  if (platform === "linkedin") return "bg-[#0A66C2]";
  if (platform === "instagram") return "bg-[#E1306C]";
  return "bg-[#FF0000]";
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
