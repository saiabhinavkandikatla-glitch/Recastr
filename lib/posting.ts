import { z } from "zod";

export const POSTING_PLATFORMS = ["twitter", "linkedin", "instagram", "facebook"] as const;

export type PostingPlatform = (typeof POSTING_PLATFORMS)[number];

export const POSTING_PLATFORM_LABELS: Record<PostingPlatform, string> = {
  twitter: "Twitter / X",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
};

export const POSTING_METHODS = ["email_reminder", "direct_post"] as const;

export type PostingMethod = (typeof POSTING_METHODS)[number];

export const postingPlatformSchema = z.enum(POSTING_PLATFORMS);
export const postingMethodSchema = z.enum(POSTING_METHODS);

export const defaultPostingPreference = {
  defaultPostingMethod: "email_reminder" as PostingMethod,
  postVerificationRequired: true,
  timezone: "Asia/Kolkata",
};

export function isPostingPlatform(value: string): value is PostingPlatform {
  return (POSTING_PLATFORMS as readonly string[]).includes(value);
}
