import type {
  ContentPiece,
  Platform,
  PostStatus,
  Project,
  SocialOutput,
  SourceSummary,
  SourceType,
  ViralHook,
} from "@/lib/types";

const defaultSummary = {
  tldr: "",
  takeaways: [],
  hooks: [],
  detectedTone: "educational",
  topics: [],
  targetAudience: ""
} satisfies SourceSummary;

type RawContent = {
  id: string;
  projectId: string;
  hookId?: string | null;
  platform: string;
  contentType?: string;
  outputType?: string;
  body?: string;
  originalBody?: string;
  content?: unknown;
  tone: string;
  approved: boolean;
  order?: number;
  scheduledPost?: {
    id: string;
    contentId: string;
    platform: string;
    scheduledAt: Date;
    status: string;
    publishedAt?: Date | null;
    failReason?: string | null;
  } | null;
  createdAt: Date;
};

type RawHook = {
  id: string;
  projectId: string;
  text: string;
  hookType: string;
  reachScore: number;
};

export type DbProjectWithContent = {
  id: string;
  userId: string;
  title: string;
  sourceType?: string;
  sourceUrl?: string | null;
  sourceText?: string | null;
  thumbnailUrl?: string | null;
  transcript?: string | null;
  summary?: unknown;
  duration?: number | null;
  wordCount?: number | null;
  contents?: RawContent[];
  outputs?: RawContent[];
  hooks?: RawHook[];
  createdAt: Date;
  updatedAt?: Date;
};

export function serializeProject(project: DbProjectWithContent): Project {
  const contents = (project.contents ?? project.outputs ?? []).map(serializeContent);
  const outputs = (project.outputs ?? project.contents ?? []).map(serializeOutput);

  return {
    id: project.id,
    userId: project.userId,
    title: project.title,
    sourceType: normalizeSourceType(project.sourceType),
    sourceUrl: project.sourceUrl ?? undefined,
    thumbnailUrl: project.thumbnailUrl ?? undefined,
    sourceText: project.sourceText ?? undefined,
    transcript: project.transcript ?? project.sourceText ?? "",
    duration: project.duration ?? undefined,
    wordCount:
      project.wordCount ??
      (project.transcript ? project.transcript.split(/\s+/).filter(Boolean).length : undefined),
    summary: normalizeSummary(project.summary),
    hooks: (project.hooks ?? []).map(serializeHook),
    contents,
    outputs,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt?.toISOString(),
  };
}

function serializeContent(content: RawContent): ContentPiece {
  const body = content.body ?? stringifyContent(content.content);

  return {
    id: content.id,
    projectId: content.projectId,
    hookId: content.hookId ?? undefined,
    platform: normalizePlatform(content.platform),
    contentType: content.contentType ?? content.outputType ?? "Post",
    body,
    originalBody: content.originalBody ?? body,
    tone: content.tone,
    approved: content.approved,
    order: content.order ?? 0,
    scheduledPost: content.scheduledPost
      ? {
          id: content.scheduledPost.id,
          outputId: content.scheduledPost.contentId,
          contentId: content.scheduledPost.contentId,
          platform: normalizePlatform(content.scheduledPost.platform),
          publishAt: content.scheduledPost.scheduledAt.toISOString(),
          scheduledAt: content.scheduledPost.scheduledAt.toISOString(),
          status: normalizePostStatus(content.scheduledPost.status),
          title: content.contentType ?? content.outputType ?? "Post",
          publishedAt: content.scheduledPost.publishedAt?.toISOString() ?? null,
          failReason: content.scheduledPost.failReason ?? null,
        }
      : null,
    createdAt: content.createdAt.toISOString(),
  };
}

function serializeOutput(content: RawContent): SocialOutput {
  const body = content.body ?? stringifyContent(content.content);

  return {
    id: content.id,
    projectId: content.projectId,
    platform: normalizePlatform(content.platform),
    outputType: content.contentType ?? content.outputType ?? "Post",
    content: body,
    originalContent: content.originalBody ?? body,
    tone: content.tone,
    approved: content.approved,
    createdAt: content.createdAt.toISOString(),
  };
}

function serializeHook(hook: RawHook): ViralHook {
  return {
    id: hook.id,
    projectId: hook.projectId,
    text: hook.text,
    hookType: hook.hookType,
    reachScore: hook.reachScore,
  };
}

function stringifyContent(value: unknown) {
  if (typeof value === "string") return value;
  if (!value) return "";
  return JSON.stringify(value, null, 2);
}

function normalizeSummary(value: unknown): SourceSummary {
  const parsed = value as Partial<SourceSummary> | undefined;
  return {
    tldr: parsed?.tldr ?? defaultSummary.tldr,
    takeaways: parsed?.takeaways?.slice(0, 5) ?? defaultSummary.takeaways,
    hooks: parsed?.hooks?.slice(0, 10) ?? defaultSummary.hooks,
    detectedTone: parsed?.detectedTone ?? defaultSummary.detectedTone,
    topics: parsed?.topics ?? defaultSummary.topics,
    targetAudience: parsed?.targetAudience ?? defaultSummary.targetAudience,
  };
}

function normalizePlatform(value: string): Platform {
  const upper = value.toUpperCase();
  if (
    upper === "TWITTER" ||
    upper === "LINKEDIN" ||
    upper === "INSTAGRAM" ||
    upper === "FACEBOOK" ||
    upper === "THREADS" ||
    upper === "YOUTUBE" ||
    upper === "CAROUSEL" ||
    upper === "COMMUNITY" ||
    upper === "STORY"
  ) {
    return upper;
  }
  return "TWITTER";
}

function normalizePostStatus(value: string): PostStatus {
  const upper = value.toUpperCase();
  if (
    upper === "DRAFT" ||
    upper === "PENDING" ||
    upper === "SCHEDULED" ||
    upper === "PUBLISHED" ||
    upper === "FAILED" ||
    upper === "CANCELLED" ||
    upper === "COMPLETE"
  ) {
    return upper;
  }
  return "PENDING";
}

function normalizeSourceType(value: string | undefined): SourceType {
  const upper = String(value ?? "TEXT").toUpperCase();
  if (upper === "YOUTUBE" || upper === "PODCAST" || upper === "BLOG" || upper === "TEXT") {
    return upper;
  }
  return "TEXT";
}
