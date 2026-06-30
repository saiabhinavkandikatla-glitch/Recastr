import type { ContentCardPlatform } from "@/components/content/ContentCard";

export type PlatformFilter = "all" | ContentCardPlatform;
export type ExportFormat = "pdf" | "csv" | "json";

export const platformFilters: Array<{ value: PlatformFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "twitter", label: "Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "threads", label: "Threads" },
  { value: "youtube", label: "YouTube Community" },
];

export const platformOrder: ContentCardPlatform[] = ["twitter", "linkedin", "instagram", "facebook", "threads", "youtube"];

export const platformLabels: Record<ContentCardPlatform, string> = {
  twitter: "Twitter/X",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  threads: "Threads",
  youtube: "YouTube Community",
};
