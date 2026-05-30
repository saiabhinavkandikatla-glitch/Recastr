export const PLATFORMS = ["twitter", "linkedin", "instagram", "youtube"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  twitter: "Twitter / X",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  youtube: "YouTube Shorts",
};

export const PLATFORM_COLORS: Record<Platform, string> = {
  twitter: "var(--platform-twitter)",
  linkedin: "var(--platform-linkedin)",
  instagram: "var(--platform-instagram)",
  youtube: "var(--platform-youtube)",
};

export const PLATFORM_LIMITS: Record<Platform, number> = {
  twitter: 280,
  linkedin: 3000,
  instagram: 2200,
  youtube: 500,
};

export const TONES = ["professional", "casual", "educational", "entertaining"] as const;
export type Tone = (typeof TONES)[number];

export const CONTENT_TYPES = ["tweet", "thread", "post", "caption", "script", "community"] as const;

export const HOOK_TYPES = ["curiosity_gap", "controversy", "story", "data"] as const;
export const HOOK_TYPE_LABELS: Record<string, string> = {
  curiosity_gap: "Curiosity gap",
  controversy: "Controversy",
  story: "Story",
  data: "Data",
};

export const CREATOR_TYPES = ["podcaster", "youtuber", "blogger", "coach", "brand", "agency"] as const;

export const copy = {
  product: {
    name: "Recastr",
    tagline: "AI-powered content repurposing for founders, creators, and agencies.",
    hero: "One video. 30 days of content.",
    primaryCta: "Start for free",
    secondaryCta: "Watch demo",
  },
  navigation: {
    features: "Features",
    pricing: "Pricing",
    demo: "Demo",
    dashboard: "Dashboard",
    projects: "Projects",
    schedule: "Schedule",
    settings: "Settings",
  },
  landing: {
    proof: "Used by 2,000+ creators",
    hookCallout: "Our AI finds the 3 hooks that will blow up your content.",
    faq: [
      ["Does Recastr work without API keys?", "Yes. Demo mode returns deterministic data for the complete pitch flow."],
      ["Can I use Razorpay now?", "Yes. Add Razorpay keys and checkout will create real orders."],
      ["What is the core workflow?", "Paste a source, extract hooks, generate content, then copy or export the pack."],
    ],
  },
  auth: {
    loginTitle: "Sign in to Recastr",
    signupTitle: "Create your workspace",
  },
};
