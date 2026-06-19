import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import axios from "axios";
import { ensureUserRecord, getRequestUser } from "@/lib/auth";
import { apiError } from "@/lib/api/response";
import { ingestUrlSchema } from "@/lib/ai/schemas";
import { consumeCredits, creditErrorResponse, requireCredits } from "@/lib/credits";
import { hash, ingestBlog } from "@/lib/ingest";
import { assertCanCreateProject, assertCanGenerateContent, planLimitErrorResponse } from "@/lib/plan-limits";
import { normalizePlatformCopy } from "@/lib/platform-limits";
import { PLAN_RULES } from "@/lib/plans";
import { prisma } from "@/lib/prisma/client";
import { getStoredProject, saveStoredProject } from "@/lib/projects/store";
import { addRecastrJob, jobNames } from "@/lib/queue/client";
import { assertIngestRateLimit } from "@/lib/rate-limit";
import type { ContentPiece, Platform, Plan, Project, SourceSummary, SourceType, ViralHook } from "@/lib/types";

export const runtime = "nodejs";

type YoutubeMetadata = {
  title: string;
  thumbnailUrl?: string;
  description?: string;
  videoId?: string;
  transcript?: string;
  warning?: string;
};

type CaptionTrack = {
  baseUrl?: string;
  languageCode?: string;
  kind?: string;
  name?: {
    simpleText?: string;
    runs?: Array<{ text?: string }>;
  };
};

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    await assertIngestRateLimit(user.id);
    await requireCredits(user);
    const payload = ingestUrlSchema.parse(await request.json());
    const source = detectSource(payload.url);

    if (process.env.RECASTR_DEMO_MODE === "true") {
      if (source === "youtube" && !/demo/i.test(payload.url)) {
        const project = await createYoutubeProject(payload.url);
        saveStoredProject(project);
        await consumeCredits(user);
        return NextResponse.json({
          projectId: project.id,
          title: project.title,
          duration: project.duration ?? 0,
          wordCount: project.wordCount ?? project.transcript.split(/\s+/).length,
          project,
          warning:
            "Demo mode imported public YouTube metadata. Paste transcript or turn demo mode off for full media processing.",
        });
      }
      const project =
        source === "youtube" ? getStoredProject("demo-ai-youtube")! : getStoredProject("demo-marketing-blog")!;
      await consumeCredits(user);
      return NextResponse.json({
        projectId: project.id,
        title: project.title,
        duration: project.duration ?? 0,
        wordCount: project.wordCount ?? project.transcript.split(/\s+/).length,
        project,
      });
    }

    await assertCanCreateProject(user, sourceToSourceType(source));

    if (source === "youtube") {
      const project = restrictProjectToPlan(await createYoutubeProject(payload.url), user.plan);
      await assertCanGenerateContent(
        user,
        project.contents?.map((content) => content.platform) ?? [],
        project.contents?.length ?? 0,
      );
      saveStoredProject(project);
      let savedProject = project;
      try {
        await persistProject(user, project);
        const dbProject = await prisma.project.findUnique({
          where: { id: project.id },
          include: {
            contents: { orderBy: { order: "asc" } },
            hooks: { orderBy: { reachScore: "desc" } },
          },
        });
        if (dbProject) {
          savedProject = mergePersistedProject(project, dbProject);
          saveStoredProject(savedProject);
        }
      } catch (error) {
        console.error(
          "[ingest/url] YouTube persistProject failed:",
          error instanceof Error ? error.message : error,
        );
      }
      await consumeCredits(user);
      return NextResponse.json({
        projectId: savedProject.id,
        title: savedProject.title,
        duration: savedProject.duration ?? 0,
        wordCount: savedProject.wordCount ?? 0,
        project: savedProject,
        warning:
          project.transcript.length > 1200
            ? "Imported available YouTube metadata and captions."
            : "Imported real YouTube metadata. Full transcript extraction needs captions, yt-dlp/FFmpeg, or pasted transcript.",
      });
    }

    const parsed = await ingestBlog(payload.url);
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        title: parsed.title,
        sourceUrl: parsed.sourceUrl,
        sourceType: "blog",
        thumbnailUrl: parsed.thumbnailUrl,
        transcript: parsed.transcript,
        summary: parsed.summary as Prisma.InputJsonValue,
        wordCount: parsed.transcript.split(/\s+/).filter(Boolean).length,
        hooks: {
          create: parsed.summary.hooks.slice(0, 5).map((hook, index) => ({
            text: hook,
            hookType: index % 2 === 0 ? "Curiosity gap" : "Data",
            reachScore: 84 - index * 3,
          })),
        },
      },
      include: { hooks: true, contents: true },
    });
    await addRecastrJob(jobNames.extractHooks, { projectId: project.id, userId: user.id });
    await consumeCredits(user);

    return NextResponse.json({
      projectId: project.id,
      title: project.title,
      duration: project.duration ?? 0,
      wordCount: project.wordCount ?? 0,
      project,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const planResponse = planLimitErrorResponse(error);
    if (planResponse) return planResponse;
    const creditResponse = creditErrorResponse(error);
    if (creditResponse) return creditResponse;
    return apiError(error, "ingest_failed", 400);
  }
}

function detectSource(url: string): "youtube" | "blog" {
  return /(?:youtube\.com|youtu\.be)/i.test(url) ? "youtube" : "blog";
}

function sourceToSourceType(source: "youtube" | "blog"): SourceType {
  return source === "youtube" ? "YOUTUBE" : "BLOG";
}

function restrictProjectToPlan(project: Project, plan: Plan): Project {
  const allowedPlatforms = PLAN_RULES[plan].outputPlatforms;
  const contents = (project.contents ?? []).filter((content) => allowedPlatforms.includes(content.platform));
  const allowedIds = new Set(contents.map((content) => content.id));
  const outputs = project.outputs.filter((output) => allowedPlatforms.includes(output.platform) && allowedIds.has(output.id));
  return {
    ...project,
    contents,
    outputs,
  };
}

async function createYoutubeProject(url: string): Promise<Project> {
  const metadata = await fetchYoutubeMetadata(url);
  const id = `youtube-${hash(url).slice(0, 10)}`;
  const context = metadata.description
    ? `
Video description:
${metadata.description}`
    : "";
  const transcript =
    metadata.transcript?.trim() ||
    `Source URL: ${url}

Recastr imported the real YouTube source metadata for "${metadata.title}".${context}

Full transcript extraction requires usable captions, yt-dlp/FFmpeg, or a pasted transcript. This starter pack is grounded in the actual title and description instead of demo fallback copy.`;
  const summary = createSummary(metadata);
  const hooks = createHooks(id, metadata);
  const contents = createContents(id, hooks, metadata);

  return {
    id,
    userId: "local-user",
    title: metadata.title,
    sourceType: "YOUTUBE",
    sourceUrl: url,
    thumbnailUrl: metadata.thumbnailUrl,
    transcript,
    duration: 0,
    wordCount: transcript.split(/\s+/).filter(Boolean).length,
    summary,
    hooks,
    contents,
    outputs: contents.map((item) => ({
      id: item.id,
      projectId: id,
      platform: item.platform,
      outputType: item.contentType,
      content: item.body,
      originalContent: item.originalBody,
      tone: item.tone,
      approved: item.approved,
      createdAt: item.createdAt,
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "DRAFT",
  };
}

async function fetchYoutubeMetadata(url: string): Promise<YoutubeMetadata> {
  const videoId = extractYoutubeVideoId(url);
  const canonicalUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;
  const [oembed, page] = await Promise.all([
    fetchYoutubeOembed(canonicalUrl),
    fetchYoutubeWatchPage(canonicalUrl, videoId),
  ]);
  const title =
    preferredYoutubeTitle(oembed.title, page.title) ||
    (videoId ? `YouTube video ${videoId}` : "YouTube video");
  const thumbnailUrl =
    oembed.thumbnailUrl ||
    page.thumbnailUrl ||
    (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined);
  const description = cleanYoutubeDescription(page.description);

  return {
    title,
    thumbnailUrl,
    description,
    videoId,
    transcript: page.transcript,
    warning: page.warning ?? oembed.warning,
  };
}

async function fetchYoutubeOembed(canonicalUrl: string): Promise<Partial<YoutubeMetadata>> {
  try {
    const response = await axios.get<{
      title?: string;
      thumbnail_url?: string;
    }>("https://www.youtube.com/oembed", {
      params: { url: canonicalUrl, format: "json" },
      headers: browserHeaders(),
      timeout: 8000,
    });
    return {
      title: normalizeText(response.data.title),
      thumbnailUrl: response.data.thumbnail_url,
    };
  } catch {
    return { warning: "youtube_oembed_unavailable" };
  }
}

async function fetchYoutubeWatchPage(
  canonicalUrl: string,
  videoId?: string,
): Promise<Partial<YoutubeMetadata>> {
  try {
    const response = await axios.get<string>(canonicalUrl, {
      headers: browserHeaders(),
      timeout: 15000,
    });
    const html = response.data;
    const title =
      readMeta(html, "og:title") ||
      readMeta(html, "title") ||
      readJsonString(html, /"videoDetails"\s*:\s*\{[\s\S]*?"title"\s*:\s*"((?:\\.|[^"\\])*)"/) ||
      readJsonString(html, /"title"\s*:\s*"((?:\\.|[^"\\])*)"/);
    const description =
      readMeta(html, "og:description") ||
      readMeta(html, "description") ||
      readJsonString(html, /"shortDescription"\s*:\s*"((?:\\.|[^"\\])*)"/);
    const thumbnailUrl =
      readMeta(html, "og:image") || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined);
    const transcript = await fetchCaptionTranscript(html);

    return {
      title: normalizeText(title),
      description: normalizeText(description),
      thumbnailUrl,
      transcript,
    };
  } catch {
    return { warning: "youtube_page_metadata_unavailable" };
  }
}

async function fetchCaptionTranscript(html: string): Promise<string | undefined> {
  const tracks = extractCaptionTracks(html);
  const track = pickCaptionTrack(tracks);
  if (!track?.baseUrl) return undefined;

  const urls = captionUrlCandidates(track);
  for (const url of urls) {
    try {
      const response = await axios.get<unknown>(url, {
        headers: browserHeaders(),
        timeout: 15000,
        validateStatus: (status) => status >= 200 && status < 300,
      });
      const transcript =
        typeof response.data === "string"
          ? parseCaptionText(response.data)
          : parseJsonCaption(response.data);
      if (transcript.length > 80) return transcript;
    } catch {
      // Try the next caption format.
    }
  }

  return undefined;
}

function captionUrlCandidates(track: CaptionTrack) {
  if (!track.baseUrl) return [];

  const urls = [
    withCaptionFormat(track.baseUrl, "json3"),
    withCaptionFormat(track.baseUrl, "vtt"),
  ];

  if (track.languageCode && !track.languageCode.startsWith("en")) {
    urls.unshift(withCaptionFormat(addCaptionParam(track.baseUrl, "tlang", "en"), "json3"));
    urls.push(withCaptionFormat(addCaptionParam(track.baseUrl, "tlang", "en"), "vtt"));
  }

  urls.push(track.baseUrl);
  return Array.from(new Set(urls));
}

function addCaptionParam(baseUrl: string, key: string, value: string) {
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function extractCaptionTracks(html: string): CaptionTrack[] {
  const match = html.match(/"captionTracks":(\[.*?\])/);
  if (!match?.[1]) return [];

  try {
    const parsed = JSON.parse(match[1]) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCaptionTrack);
  } catch {
    return [];
  }
}

function isCaptionTrack(value: unknown): value is CaptionTrack {
  return typeof value === "object" && value !== null && "baseUrl" in value;
}

function pickCaptionTrack(tracks: CaptionTrack[]) {
  return (
    tracks.find((track) => track.languageCode?.startsWith("en") && track.kind !== "asr") ||
    tracks.find((track) => track.languageCode?.startsWith("en")) ||
    tracks.find((track) => track.kind !== "asr") ||
    tracks[0]
  );
}

function withCaptionFormat(baseUrl: string, format: "json3" | "vtt") {
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}fmt=${format}`;
}

function parseJsonCaption(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("events" in payload)) return "";
  const events = (payload as { events?: unknown }).events;
  if (!Array.isArray(events)) return "";

  return normalizeText(
    events
      .flatMap((event) => {
        if (!event || typeof event !== "object" || !("segs" in event)) return [];
        const segments = (event as { segs?: unknown }).segs;
        if (!Array.isArray(segments)) return [];
        return segments.map((segment) => {
          if (!segment || typeof segment !== "object" || !("utf8" in segment)) return "";
          return String((segment as { utf8?: unknown }).utf8 ?? "");
        });
      })
      .join(" "),
  );
}

function parseCaptionText(raw: string) {
  if (!raw.trim()) return "";
  const xmlLines = Array.from(raw.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)).map((match) =>
    decodeHtml(match[1] ?? ""),
  );
  if (xmlLines.length > 0) return normalizeText(xmlLines.join(" "));

  return normalizeText(
    raw
      .replace(/^WEBVTT[\s\S]*?\n\n/i, " ")
      .replace(/\d{1,2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{1,2}:\d{2}:\d{2}\.\d{3}[^\n]*/g, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

function extractYoutubeVideoId(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return parsed.pathname.split("/").filter(Boolean)[0];
    if (!host.endsWith("youtube.com")) return undefined;

    const directId = parsed.searchParams.get("v");
    if (directId) return directId;

    const parts = parsed.pathname.split("/").filter(Boolean);
    if (["embed", "shorts", "live"].includes(parts[0] ?? "")) return parts[1];
  } catch {
    return undefined;
  }

  return undefined;
}

function readMeta(html: string, name: string) {
  const escapedName = escapeRegExp(name);
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escapedName}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escapedName}["'][^>]*>`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const value = normalizeText(match?.[1]);
    if (value) return value;
  }

  return undefined;
}

function readJsonString(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  if (!match?.[1]) return undefined;

  try {
    return normalizeText(JSON.parse(`"${match[1]}"`) as unknown);
  } catch {
    return normalizeText(match[1]);
  }
}

function preferredYoutubeTitle(oembedTitle?: string, pageTitle?: string) {
  const candidates = [oembedTitle, pageTitle]
    .map((title) => normalizeText(title))
    .filter((title) => title && !isGenericYoutubeTitle(title));
  return candidates[0];
}

function isGenericYoutubeTitle(title: string) {
  const normalized = title.toLowerCase();
  return (
    normalized === "youtube" ||
    normalized === "youtube video" ||
    normalized === "1k" ||
    normalized.includes("enjoy the videos and music you love")
  );
}

function cleanYoutubeDescription(description?: string) {
  const cleaned = normalizeText(description);
  if (!cleaned) return undefined;
  const normalized = cleaned.toLowerCase();
  if (normalized.includes("enjoy the videos and music you love, upload original content")) return undefined;
  return cleaned;
}

function createSummary(metadata: YoutubeMetadata): SourceSummary {
  const topic = extractTopic(metadata.title);
  const tags = extractTags(metadata.description);
  const descriptionLine = summarizeDescription(metadata.description);
  return {
    tldr: `${metadata.title} is ready for a platform-native content pack. ${descriptionLine} Recastr extracted a title-led starter set and can become fully transcript-accurate when captions, media processing, or pasted transcript are available.`,
    takeaways: [
      `The real YouTube title was imported: "${metadata.title}".`,
      descriptionLine,
      `The strongest reusable content angle is ${topic}.`,
      tags.length > 0 ? `Useful topical tags: ${tags.slice(0, 4).join(", ")}.` : "No reliable hashtag set was found in the description.",
      metadata.transcript
        ? "Captions were found and can support more source-specific generation."
        : "No usable captions were available, so paste the transcript for exact quote-level output.",
    ],
    hooks: [
      `"${metadata.title}" should become more than one upload.`,
      `The promise inside "${topic}" can become a thread, a LinkedIn post, a reel, and a community prompt.`,
      `If someone clicks "${metadata.title}", they want a clear payoff. Lead every asset with that payoff.`,
      `Most creators publish "${topic}" once. The smarter move is to distribute the best lesson all week.`,
      `Turn "${metadata.title}" into platform-native posts, not pasted summaries.`,
      `The strongest beginner question inside "${topic}" is probably your best opening line.`,
      `"${metadata.title}" already has the hard part: a clear audience promise.`,
      `Use "${topic}" as the anchor, then change the angle for each platform.`,
      `Your audience should not need to watch the full video to get one useful idea from "${topic}".`,
      `A source like "${metadata.title}" should become a content system, not a single link.`,
    ],
    detectedTone: "educational",
    topics: uniqueList([topic, ...tags, "YouTube repurposing", "repurposing", "content creator"]).slice(0, 5),
    targetAudience: "Creators, learners, founders, and content teams",
  };
}

function createHooks(projectId: string, metadata: YoutubeMetadata): ViralHook[] {
  const topic = extractTopic(metadata.title);
  const tags = extractTags(metadata.description);
  const tagContext = tags.length > 0 ? ` around ${tags.slice(0, 2).join(" and ")}` : "";
  return [
    [`"${metadata.title}" should not disappear after one upload.`, "Curiosity gap", 86],
    [`The conversation inside "${topic}"${tagContext} can become posts, scripts, captions, and community questions.`, "Data", 84],
    [`The title "${metadata.title}" is the promise. The content pack should distribute that promise.`, "Story", 81],
    [`Most creators would publish "${topic}" once. That leaves the best angles unused.`, "Controversy", 79],
    [`Start with the strongest question behind "${topic}", then translate it by platform.`, "Curiosity gap", 76],
  ].map(([text, hookType, reachScore], index) => ({
    id: `${projectId}-hook-${index + 1}`,
    projectId,
    text: String(text),
    hookType: String(hookType),
    reachScore: Number(reachScore),
  }));
}

function createContents(projectId: string, hooks: ViralHook[], metadata: YoutubeMetadata): ContentPiece[] {
  const now = new Date().toISOString();
  const topic = extractTopic(metadata.title);
  const tags = extractTags(metadata.description);
  const captionTags = tags.length > 0 ? `\n\n${tags.slice(0, 8).map((tag) => `#${tag.replace(/\s+/g, "")}`).join(" ")}` : "";
  const context = summarizeDescription(metadata.description);
  const rows: Array<[Platform, string, string]> = [
    ["TWITTER", "Tweet", `${topic} gets easier when you stop treating it like magic.\n\nAsk for something. Send the request. Get a response. Use the result.\n\nThat simple loop is the bridge from idea to working system.`],
    ["TWITTER", "Tweet", `Most beginners do not get stuck because ${topic} is too advanced.\n\nThey get stuck because nobody gives them a simple mental model first.\n\nStart with the request and response. Everything else gets less scary.`],
    ["TWITTER", "Thread", `1/ ${topic} looks complicated until you see the pattern.\n\n2/ One side asks for something.\n\n3/ The other side sends back data or action.\n\n4/ Your job is to understand the menu, not rebuild the kitchen.\n\nSave this before your next build.`],
    ["LINKEDIN", "LinkedIn post", `I used to think ${topic} was the hard part.\n\nThen I realized the hard part was not the technology.\n\nIt was missing the mental model.\n\n${context}\n\nHere is the simple version:\n\n1. Know what you want to ask for\n2. Send the request in the format the system expects\n3. Read the response\n4. Use that response in your workflow\n\nYou do not need to understand the whole kitchen before you order from the menu.\n\nThat is the shift this video makes clear.\n\nSave this if you are learning by building.\n\n#AI #APIs #ChatGPT #BuildInPublic`],
    ["INSTAGRAM", "Reel script", `[HOOK - 0 to 3 seconds]\nYou are probably making ${topic} harder than it needs to be.\n\n[BODY - 3 to 35 seconds]\nThink of it like ordering food.\nYou ask for something.\nThe kitchen handles the work.\nYou get the result back.\nThat is the mental model.\nYou do not need to know every internal detail first.\nYou need to know what to ask for and how to read the response.\n\n[CTA - 35 to 60 seconds]\nSave this before your next build.`],
    ["INSTAGRAM", "Caption", `${topic} is less scary with the right mental model.\n\n-> Ask for something\n-> Send the request\n-> Read the response\n-> Use it in your workflow\n\nYou do not need to rebuild the kitchen.\nYou just need to know the menu.\n\nSave this before your next project.${captionTags}`],
    ["COMMUNITY", "YouTube community post", `What part of ${topic} should we break down next?\n\nA) Beginner mental model\nB) Real project walkthrough\nC) Common mistakes\nD) Full roadmap`],
  ];

  return rows.map(([platform, contentType, body], index) => {
    const normalizedBody = normalizePlatformCopy(platform, body);
    return {
      id: `${projectId}-content-${index + 1}`,
      projectId,
      hookId: hooks[index % hooks.length]?.id,
      platform,
      contentType,
      body: normalizedBody,
      originalBody: normalizedBody,
      tone: "casual",
      approved: false,
      order: index,
      createdAt: now,
    };
  });
}

function browserHeaders() {
  return {
    Accept: "text/html,application/json,text/plain,*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
  };
}

async function persistProject(user: { id: string; email: string; plan: string }, project: Project) {
  await ensureUserRecord({
    id: user.id,
    email: user.email,
    plan: user.plan === "FREE" || user.plan === "PRO" || user.plan === "TEAM" || user.plan === "AGENCY" ? user.plan : "FREE",
  });
  await prisma.project.upsert({
    where: { id: project.id },
    update: {
      title: project.title,
      sourceUrl: project.sourceUrl,
      sourceType: "youtube",
      thumbnailUrl: project.thumbnailUrl,
      transcript: project.transcript,
      summary: project.summary as Prisma.InputJsonValue,
      duration: project.duration,
      wordCount: project.wordCount,
      contents: { deleteMany: {}, create: contentCreateRows(project) },
      hooks: { deleteMany: {}, create: hookCreateRows(project) },
    },
    create: {
      id: project.id,
      userId: user.id,
      title: project.title,
      sourceUrl: project.sourceUrl,
      sourceType: "youtube",
      thumbnailUrl: project.thumbnailUrl,
      transcript: project.transcript,
      summary: project.summary as Prisma.InputJsonValue,
      duration: project.duration,
      wordCount: project.wordCount,
      hooks: {
        create: hookCreateRows(project),
      },
      contents: {
        create: contentCreateRows(project),
      },
    },
  });
}

function extractTopic(title: string) {
  return title
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s*[-:|]\s*(official video|full beginner course|beginner course|full course|explained|tutorial|guide).*$/i, "")
    .replace(/\s+/g, " ")
    .trim() || title;
}

function summarizeDescription(description?: string) {
  const cleaned = normalizeText(description);
  if (!cleaned) return "The available YouTube metadata gives enough context for starter hooks, but not full quote-level analysis.";
  return truncate(cleaned.replace(/#[^\s#]+/g, "").trim(), 220);
}

function extractTags(description?: string) {
  const matches = normalizeText(description).match(/#[A-Za-z0-9_-]+/g) ?? [];
  return uniqueList(matches.map((tag) => tag.replace(/^#/, "").replace(/_/g, " "))).slice(0, 10);
}

function uniqueList(values: string[]) {
  return Array.from(new Set(values.map((value) => normalizeText(value)).filter(Boolean)));
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trim()}...`;
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") return "";
  const decoded = decodeHtml(value)
    .replace(/\\u0026/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return decoded;
}

function decodeHtml(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hookCreateRows(project: Project) {
  return (project.hooks ?? []).map((hook) => ({
    id: hook.id,
    text: hook.text,
    hookType: hook.hookType,
    reachScore: hook.reachScore,
  }));
}

function contentCreateRows(project: Project) {
  return (project.contents ?? []).map((item) => ({
    hookId: item.hookId,
    platform: item.platform,
    contentType: item.contentType,
    body: item.body,
    originalBody: item.originalBody,
    tone: item.tone,
    approved: item.approved,
    order: item.order,
  }));
}

type PersistedProject = Prisma.ProjectGetPayload<{
  include: {
    contents: true;
    hooks: true;
  };
}>;

function mergePersistedProject(project: Project, dbProject: PersistedProject): Project {
  const contents = dbProject.contents.map((content) => ({
    id: content.id,
    projectId: content.projectId,
    hookId: content.hookId ?? undefined,
    platform: content.platform as Platform,
    contentType: content.contentType,
    body: content.body,
    originalBody: content.originalBody,
    tone: content.tone,
    approved: content.approved,
    order: content.order,
    createdAt: content.createdAt.toISOString(),
  }));

  const hooks = dbProject.hooks.map((hook) => ({
    id: hook.id,
    projectId: hook.projectId,
    text: hook.text,
    hookType: hook.hookType,
    reachScore: hook.reachScore,
  }));

  return {
    ...project,
    userId: dbProject.userId,
    contents,
    hooks,
    outputs: contents.map((content) => ({
      id: content.id,
      projectId: content.projectId,
      platform: content.platform,
      outputType: content.contentType,
      content: content.body,
      originalContent: content.originalBody,
      tone: content.tone,
      approved: content.approved,
      createdAt: content.createdAt,
    })),
    createdAt: dbProject.createdAt.toISOString(),
    updatedAt: dbProject.updatedAt.toISOString(),
  };
}
