import type { ContentPiece, Platform, Project, ScheduledPost, SocialOutput } from "@/lib/types";

const globalForProjects = globalThis as unknown as {
  recastrProjects?: Map<string, Project>;
  recastrScheduledPosts?: Map<string, ScheduledPost>;
};

function getProjectMap() {
  if (!globalForProjects.recastrProjects) {
    globalForProjects.recastrProjects = new Map();
  }
  return globalForProjects.recastrProjects;
}

function getScheduledPostMap() {
  if (!globalForProjects.recastrScheduledPosts) {
    globalForProjects.recastrScheduledPosts = new Map();
  }
  return globalForProjects.recastrScheduledPosts;
}

export function listStoredProjects({
  includeFallback = true,
}: {
  includeFallback?: boolean;
} = {}) {
  const projects = Array.from(getProjectMap().values());
  if (projects.length === 0 && includeFallback) {
    projects.push(
      getStoredProject("demo-founder-podcast")!,
      getStoredProject("demo-ai-youtube")!,
      getStoredProject("demo-marketing-blog")!,
    );
  }
  return projects.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getStoredProject(projectId: string) {
  const stored = getProjectMap().get(projectId);
  if (stored) return stored;
  if (!isLocalProjectId(projectId)) return undefined;

  const fallback = createFallbackProject(projectId);
  getProjectMap().set(projectId, fallback);
  return fallback;
}

export function saveStoredProject(project: Project) {
  getProjectMap().set(project.id, project);
  return project;
}

export function appendStoredOutputs(projectId: string, outputs: SocialOutput[]) {
  const project = getStoredProject(projectId);
  if (!project) return;

  const outputMap = new Map(project.outputs.map((output) => [output.id, output]));
  for (const output of outputs) {
    outputMap.set(output.id, output);
  }

  saveStoredProject({
    ...project,
    outputs: Array.from(outputMap.values()),
    updatedAt: new Date().toISOString(),
  });
}

export function updateStoredContent(
  contentId: string,
  updates: Partial<Pick<ContentPiece, "body" | "approved" | "tone">>,
) {
  const projects = getProjectMap();
  for (const project of Array.from(projects.values())) {
    const contents = project.contents ?? [];
    const content = contents.find((item) => item.id === contentId);
    if (!content) continue;

    const nextContents = contents.map((item) =>
      item.id === contentId ? { ...item, ...updates } : item,
    );
    const nextOutputs = project.outputs.map((output) =>
      output.id === contentId
        ? {
            ...output,
            content: updates.body ?? output.content,
            originalContent: output.originalContent,
            tone: updates.tone ?? output.tone,
            approved: updates.approved ?? output.approved,
          }
        : output,
    );

    saveStoredProject({
      ...project,
      contents: nextContents,
      outputs: nextOutputs,
      updatedAt: new Date().toISOString(),
    });
    return nextContents.find((item) => item.id === contentId);
  }

  return undefined;
}

export function listStoredScheduledPosts() {
  return Array.from(getScheduledPostMap().values()).sort(
    (a, b) => new Date(a.publishAt).getTime() - new Date(b.publishAt).getTime(),
  );
}

export function createStoredScheduledPost({
  contentId,
  platform,
  scheduledAt,
}: {
  contentId: string;
  platform: Platform;
  scheduledAt: Date;
}) {
  const existing = listStoredScheduledPosts().find((post) => post.contentId === contentId);
  const content = findStoredContent(contentId);
  const post: ScheduledPost = {
    id: existing?.id ?? `scheduled-demo-${Date.now()}`,
    outputId: contentId,
    contentId,
    platform: content?.platform ?? platform,
    publishAt: scheduledAt.toISOString(),
    scheduledAt: scheduledAt.toISOString(),
    status: "PENDING",
    title: content?.body ?? "Scheduled content",
    publishedAt: null,
    failReason: null,
  };

  getScheduledPostMap().set(post.id, post);
  return post;
}

export function updateStoredScheduledPost(id: string, updates: Partial<ScheduledPost>) {
  const scheduledPosts = getScheduledPostMap();
  const existing = scheduledPosts.get(id);
  if (!existing) return undefined;

  const next = { ...existing, ...updates };
  scheduledPosts.set(id, next);
  return next;
}

export function cancelStoredScheduledPost(id: string) {
  return updateStoredScheduledPost(id, {
    status: "CANCELLED",
  });
}

export function retryStoredScheduledPost(id: string) {
  return updateStoredScheduledPost(id, {
    status: "PENDING",
    failReason: null,
  });
}

function findStoredContent(contentId: string) {
  for (const project of Array.from(getProjectMap().values())) {
    const content = project.contents?.find((item) => item.id === contentId);
    if (content) return content;
  }

  return undefined;
}

function isLocalProjectId(projectId: string) {
  return /^(demo|youtube|text|blog|podcast)-/.test(projectId);
}

function createFallbackProject(projectId: string): Project {
  const now = new Date().toISOString();
  const title = titleFromProjectId(projectId);
  const sourceType = projectId.startsWith("youtube-") || projectId.includes("youtube")
    ? "YOUTUBE"
    : projectId.startsWith("blog-") || projectId.includes("blog")
      ? "BLOG"
      : projectId.startsWith("podcast-") || projectId.includes("podcast")
        ? "PODCAST"
        : "TEXT";
  const summary = {
    tldr: `${title} is ready for a platform-native content pack. Recastr recovered this local project without contacting the database.`,
    takeaways: [
      "Local demo mode should never require Supabase to load a project.",
      "Start from the strongest promise in the source, then translate it by platform.",
      "Use the preview engine to check how the post feels before copying.",
      "Generated content can move directly into schedule and export flows.",
    ],
    hooks: [
      `${title} should not disappear after one upload.`,
      "One long-form source can become a complete creator content sprint.",
      "The best post is usually hiding in the highest-tension moment.",
      "Repurposing works when the idea is translated, not copied.",
      "A content system starts with hooks, not templates.",
    ],
    detectedTone: "educational" as const,
    topics: ["content repurposing", "creator workflow", "AI content"],
    targetAudience: "Founders, creators, and content teams",
  };
  const hooks = summary.hooks.map((text, index) => ({
    id: `${projectId}-hook-${index + 1}`,
    projectId,
    text,
    hookType: ["Curiosity gap", "Data", "Story", "Controversy", "Data"][index] ?? "Curiosity gap",
    reachScore: [92, 88, 84, 80, 76][index] ?? 75,
  }));
  const contents = [
    [
      "TWITTER",
      "Tweet",
      `${title} should not be a one-time upload.\n\nPull the strongest hook, turn it into a sharp post, then adapt it for every platform your audience already checks.`,
    ],
    [
      "LINKEDIN",
      "Post",
      `Most creators do not need more content ideas.\n\nThey need a better extraction system.\n\nStart with ${title}. Find the point where the source creates tension, gives proof, or changes the viewer's mind. Then turn that moment into platform-native posts instead of copy-pasted summaries.`,
    ],
    [
      "INSTAGRAM",
      "Caption",
      `One source. Multiple angles. Better distribution.\n\nThe work is not making more noise. The work is finding the moment people actually care about and making it easy to save, share, and act on.`,
    ],
    [
      "COMMUNITY",
      "Community post",
      `What should we turn "${title}" into next?\n\nA) Beginner checklist\nB) Step-by-step thread\nC) Reel script\nD) Deep-dive post`,
    ],
  ].map(([platform, contentType, body], index) => ({
    id: `${projectId}-content-${index + 1}`,
    projectId,
    hookId: hooks[index % hooks.length]?.id,
    platform: platform as ContentPiece["platform"],
    contentType,
    body,
    originalBody: body,
    tone: "casual",
    approved: index === 0,
    order: index,
    createdAt: now,
  }));

  return {
    id: projectId,
    userId: "local-user",
    title,
    sourceType,
    sourceUrl: projectId.startsWith("youtube-") ? "https://youtube.com" : undefined,
    thumbnailUrl: "/og-image.svg",
    transcript: `Recovered local source for ${title}. This fallback exists so demo and locally generated projects do not break when the database is unavailable.`,
    duration: sourceType === "YOUTUBE" || sourceType === "PODCAST" ? 0 : undefined,
    wordCount: 32,
    summary,
    hooks,
    contents,
    outputs: contents.map((content) => ({
      id: content.id,
      projectId,
      platform: content.platform,
      outputType: content.contentType,
      content: content.body,
      originalContent: content.originalBody,
      tone: content.tone,
      approved: content.approved,
      createdAt: content.createdAt,
    })),
    createdAt: now,
    updatedAt: now,
    status: "DRAFT",
  };
}

function titleFromProjectId(projectId: string) {
  if (projectId === "demo-founder-podcast") return "Founder Podcast Ep. 42 - Why I Almost Quit";
  if (projectId === "demo-ai-youtube") return "How I Got 100k Subscribers in 90 Days";
  if (projectId === "demo-marketing-blog") return "The Ultimate Guide to Cold Email in 2024";
  if (projectId.startsWith("youtube-")) return "Imported YouTube video";
  if (projectId.startsWith("blog-")) return "Imported blog post";
  if (projectId.startsWith("podcast-")) return "Imported podcast episode";
  return "Imported content source";
}
