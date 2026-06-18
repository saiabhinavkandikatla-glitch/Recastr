import type { Platform, Plan, SourceType } from "@/lib/types";

export type PlanRule = {
  name: Plan;
  label: string;
  monthlyPrice: number;
  annualPrice: number;
  projectLimit: number | "unlimited";
  contentLimit: number | "unlimited";
  scheduledPostLimit: number | "unlimited";
  brandVoiceLimit: number | "unlimited";
  sourceTypes: SourceType[];
  outputPlatforms: Platform[];
  scheduling: Platform[];
  exports: string[];
  features: string[];
};

export const PLAN_RULES: Record<Plan, PlanRule> = {
  FREE: {
    name: "FREE",
    label: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    projectLimit: "unlimited",
    contentLimit: "unlimited",
    scheduledPostLimit: "unlimited",
    brandVoiceLimit: "unlimited",
    sourceTypes: ["YOUTUBE", "PODCAST", "BLOG", "TEXT"],
    outputPlatforms: [
      "TWITTER",
      "LINKEDIN",
      "INSTAGRAM",
      "FACEBOOK",
      "THREADS",
      "CAROUSEL",
      "COMMUNITY",
      "STORY",
      "HOOKS",
      "CTA",
    ],
    scheduling: ["TWITTER", "LINKEDIN", "INSTAGRAM", "FACEBOOK", "THREADS"],
    exports: ["PDF", "CSV", "Notion", "JSON"],
    features: [
      "Unlimited projects",
      "Unlimited AI generation",
      "All output platforms",
      "All scheduling enabled",
    ],
  },
  PRO: {
    name: "PRO",
    label: "Pro",
    monthlyPrice: 999,
    annualPrice: 9990,
    projectLimit: 30,
    contentLimit: 500,
    scheduledPostLimit: 200,
    brandVoiceLimit: 3,
    sourceTypes: ["YOUTUBE", "PODCAST", "BLOG", "TEXT"],
    outputPlatforms: [
      "TWITTER",
      "LINKEDIN",
      "INSTAGRAM",
      "CAROUSEL",
      "COMMUNITY",
      "STORY",
    ],
    scheduling: ["TWITTER", "LINKEDIN"],
    exports: ["PDF", "CSV"],
    features: [
      "30 projects per month",
      "Podcast upload",
      "All output packs",
      "3 brand voice profiles",
      "Twitter and LinkedIn scheduling",
    ],
  },
  TEAM: {
    name: "TEAM",
    label: "Team",
    monthlyPrice: 2999,
    annualPrice: 29990,
    projectLimit: "unlimited",
    contentLimit: "unlimited",
    scheduledPostLimit: "unlimited",
    brandVoiceLimit: "unlimited",
    sourceTypes: ["YOUTUBE", "PODCAST", "BLOG", "TEXT"],
    outputPlatforms: [
      "TWITTER",
      "LINKEDIN",
      "INSTAGRAM",
      "CAROUSEL",
      "COMMUNITY",
      "STORY",
    ],
    scheduling: ["TWITTER", "LINKEDIN", "INSTAGRAM"],
    exports: ["PDF", "CSV", "Notion", "JSON"],
    features: [
      "Everything in Pro",
      "Team collaboration",
      "Shared content calendar",
      "Client-ready exports",
      "Priority processing",
    ],
  },
  AGENCY: {
    name: "AGENCY",
    label: "Agency",
    monthlyPrice: 8200,
    annualPrice: 82000,
    projectLimit: "unlimited",
    contentLimit: "unlimited",
    scheduledPostLimit: "unlimited",
    brandVoiceLimit: "unlimited",
    sourceTypes: ["YOUTUBE", "PODCAST", "BLOG", "TEXT"],
    outputPlatforms: [
      "TWITTER",
      "LINKEDIN",
      "INSTAGRAM",
      "CAROUSEL",
      "COMMUNITY",
      "STORY",
    ],
    scheduling: ["TWITTER", "LINKEDIN", "INSTAGRAM"],
    exports: ["PDF", "CSV", "Notion", "JSON"],
    features: [
      "Unlimited projects",
      "Unlimited brand voices",
      "All platform scheduling",
      "Team seats up to 5",
      "White-label PDF export",
      "Priority processing",
    ],
  },
};

export const overage = {
  label: "INR 160/project over plan limit",
  cents: 16000,
};

export function canUseSource(plan: Plan, sourceType: SourceType) {
  return PLAN_RULES[plan].sourceTypes.includes(sourceType);
}

export function canSchedule(plan: Plan, platform: Platform) {
  return PLAN_RULES[plan].scheduling.includes(platform);
}
