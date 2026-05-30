export type Plan = "FREE" | "PRO" | "TEAM" | "AGENCY";

export type SourceType = "YOUTUBE" | "PODCAST" | "BLOG" | "TEXT";

export type Platform =
  | "TWITTER"
  | "LINKEDIN"
  | "INSTAGRAM"
  | "FACEBOOK"
  | "THREADS"
  | "YOUTUBE"
  | "CAROUSEL"
  | "COMMUNITY"
  | "STORY";

export type PostStatus =
  | "DRAFT"
  | "PENDING"
  | "SCHEDULED"
  | "PUBLISHED"
  | "FAILED"
  | "CANCELLED"
  | "COMPLETE";

export type Tone =
  | "Professional"
  | "Casual"
  | "Witty"
  | "Bold"
  | "Empathetic"
  | "Educational"
  | "Controversial"
  | "Storytelling";

export type SourceSummary = {
  tldr: string;
  takeaways: string[];
  hooks: string[];
  detectedTone:
    | "educational"
    | "motivational"
    | "controversial"
    | "storytelling"
    | "news";
  topics: string[];
  targetAudience: string;
};

export type ViralHook = {
  id: string;
  projectId: string;
  text: string;
  hookType: "Curiosity gap" | "Controversy" | "Story" | "Data" | string;
  reachScore: number;
};

export type ContentPiece = {
  id: string;
  projectId: string;
  hookId?: string;
  platform: Platform;
  contentType: string;
  body: string;
  originalBody: string;
  tone: string;
  approved: boolean;
  order: number;
  scheduledPost?: ScheduledPost | null;
  createdAt: string;
};

export type SocialOutput = {
  id: string;
  projectId: string;
  platform: Platform;
  outputType: string;
  tone: Tone | string;
  content: unknown;
  originalContent?: unknown;
  approved: boolean;
  createdAt: string;
};

export type ScheduledPost = {
  id: string;
  outputId: string;
  contentId?: string;
  platform: Platform;
  publishAt: string;
  scheduledAt?: string;
  status: PostStatus;
  title: string;
  publishedAt?: string | null;
  failReason?: string | null;
};

export type Project = {
  id: string;
  userId?: string;
  title: string;
  sourceType: SourceType;
  sourceUrl?: string;
  thumbnailUrl?: string;
  sourceText?: string;
  transcript: string;
  duration?: number;
  wordCount?: number;
  summary: SourceSummary;
  hooks?: ViralHook[];
  contents?: ContentPiece[];
  outputs: SocialOutput[];
  createdAt: string;
  updatedAt?: string;
  status?: PostStatus;
};

export type BrandVoice = {
  id: string;
  name: string;
  toneDescriptors: string[];
  bannedWords: string[];
  samplePosts: string[];
  targetAudience: string;
  contentPillars: string[];
};

export type GenerationRequest = {
  projectId?: string;
  transcript: string;
  sourceType: SourceType;
  platform?: Platform;
  tone: Tone;
  audience: string;
  brandVoice?: BrandVoice;
};

export type IngestionStep =
  | "Fetching"
  | "Extracting Audio"
  | "Transcribing"
  | "Analyzing"
  | "Ready";
