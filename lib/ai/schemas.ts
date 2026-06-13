import { z } from "zod";

export const generatedItemSchema = z.object({
  content: z.union([z.string(), z.record(z.string(), z.unknown())]),
  hook_score: z.number().min(1).max(10),
  estimated_engagement: z.string(),
  platform_tips: z.array(z.string()).default([]),
});

export const generatedArraySchema = z.array(generatedItemSchema);

export const summarySchema = z.object({
  tldr: z.string(),
  takeaways: z.array(z.string()).length(5),
  hooks: z.array(z.string()).length(10),
  detectedTone: z.enum([
    "educational",
    "motivational",
    "controversial",
    "storytelling",
    "news",
  ]),
  topics: z.array(z.string()).min(3).max(5),
  targetAudience: z.string(),
});

export const ingestYoutubeSchema = z.object({
  url: z
    .string()
    .url()
    .refine((value) => /(?:youtube\.com|youtu\.be)/i.test(value), {
      message: "URL must be a YouTube link",
    }),
});

export const ingestBlogSchema = z.object({
  url: z.string().url(),
});

export const rawTextSchema = z.object({
  title: z.string().min(3),
  text: z.string().min(100),
});

export const generateSchema = z.object({
  projectId: z.string().optional(),
  transcript: z.string().min(20),
  sourceType: z.enum(["YOUTUBE", "PODCAST", "BLOG", "TEXT"]),
  platform: z
    .enum(["TWITTER", "LINKEDIN", "INSTAGRAM", "FACEBOOK", "THREADS", "YOUTUBE", "CAROUSEL", "COMMUNITY", "STORY"])
    .optional(),
  tone: z.enum([
    "Professional",
    "Casual",
    "Witty",
    "Bold",
    "Empathetic",
    "Educational",
    "Controversial",
    "Storytelling",
  ]),
  audience: z.string().min(3),
  brandVoiceId: z.string().optional(),
});

export const ingestUrlSchema = z.object({
  url: z.string().url(),
});

export const ingestTextSchema = z.object({
  title: z.string().trim().min(3).optional(),
  text: z.string().trim().min(20).optional(),
});

export const generatePostSchema = z.object({
  projectId: z.string(),
  platforms: z
    .array(z.enum(["TWITTER", "LINKEDIN", "INSTAGRAM", "FACEBOOK", "THREADS", "YOUTUBE", "CAROUSEL", "COMMUNITY", "STORY"]))
    .min(1),
  contentTypes: z.array(z.string().min(1)).default(["tweet", "linkedin", "reel", "caption"]),
  tone: z.enum(["professional", "casual", "educational", "entertaining"]).default("casual"),
  hookId: z.string().optional(),
});

export const toneSchema = z.object({
  contentId: z.string().optional(),
  tone: z.enum(["professional", "casual", "educational", "entertaining"]).optional(),
  outputId: z.string().optional(),
  newTone: z.string().optional(),
  content: z.string().min(1),
  fromTone: z.string().optional(),
  toTone: z.string().optional(),
  blend: z.number().min(0).max(100).optional(),
  brandVoiceId: z.string().optional(),
});

export const exportSchema = z.object({
  projectId: z.string(),
  format: z.enum(["pdf", "csv", "json"]),
  contentIds: z.array(z.string()).default([]),
});

export const scheduleSchema = z.object({
  outputId: z.string().optional(),
  contentId: z.string().optional(),
  projectId: z.string().optional(),
  projectTitle: z.string().optional(),
  body: z.string().optional(),
  originalBody: z.string().optional(),
  contentType: z.string().optional(),
  tone: z.string().optional(),
  publishAt: z.string().datetime().optional(),
  scheduledAt: z.string().datetime().optional(),
  platform: z.enum(["TWITTER", "LINKEDIN", "INSTAGRAM", "FACEBOOK", "THREADS", "YOUTUBE", "CAROUSEL", "COMMUNITY", "STORY"]),
  postingMethod: z.enum(["email_reminder", "direct_post"]).default("email_reminder"),
  timezone: z.string().trim().min(1).max(80).default("Asia/Kolkata"),
  verificationRequired: z.boolean().default(false),
}).refine((value) => value.contentId || value.outputId, {
  message: "contentId is required",
  path: ["contentId"],
}).refine((value) => value.scheduledAt || value.publishAt, {
  message: "scheduledAt is required",
  path: ["scheduledAt"],
});

export const razorpayCheckoutSchema = z.object({
  plan: z.enum(["PRO", "TEAM", "AGENCY"]),
  interval: z.enum(["monthly", "annual"]),
});
