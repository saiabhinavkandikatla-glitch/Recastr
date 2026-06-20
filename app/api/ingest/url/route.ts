import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import axios from "axios";
import { fetchTranscript } from "@/lib/transcript";
import { runContentPipeline } from "@/lib/ai/pipeline";
import { ensureUserRecord, getRequestUser } from "@/lib/auth";
import { apiError } from "@/lib/api/response";
import { ingestUrlSchema } from "@/lib/ai/schemas";
import { consumeCredits, creditErrorResponse, requireCredits } from "@/lib/credits";
import { hash, ingestBlog } from "@/lib/ingest";
import { assertCanCreateProject, assertCanGenerateContent, planLimitErrorResponse } from "@/lib/plan-limits";
import { PLAN_RULES } from "@/lib/plans";
import { prisma } from "@/lib/prisma/client";
import { getStoredProject, saveStoredProject } from "@/lib/projects/store";
import { assertIngestRateLimit } from "@/lib/rate-limit";
import type { Platform, Plan, Project, SourceType } from "@/lib/types";

export const runtime = "nodejs";

type YoutubeMetadata = {
  title: string;
  thumbnailUrl?: string;
  description?: string;
  videoId?: string | null;
  transcript?: string | null;
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
        const project = await createYoutubeProject(payload.url, user.id);
        saveStoredProject(project);
        await consumeCredits(user);
        return NextResponse.json({
          projectId: project.id,
          title: project.title,
          duration: project.duration ?? 0,
          wordCount: project.wordCount ?? 0,
          project,
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
      const project = restrictProjectToPlan(await createYoutubeProject(payload.url, user.id), user.plan);
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
      });
    }

    const project = await ingestBlog(payload.url, user.id);
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

async function createYoutubeProject(url: string, userId: string): Promise<Project> {
  const metadata = await fetchYoutubeMetadata(url);
  const id = `youtube-${hash(url).slice(0, 10)}-${userId}`;

  // Fetch brand voice details
  const brandVoice = await prisma.brandVoice.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const pipelineResult = await runContentPipeline({
    url,
    userId,
    sourceType: "YOUTUBE",
    title: metadata.title,
    transcript: metadata.transcript || undefined,
    description: metadata.description || undefined,
    tonePref: brandVoice?.toneDescriptors?.[0] || "casual",
    samplePosts: brandVoice?.samplePosts || [],
    bannedWords: brandVoice?.bannedWords || [],
  });

  const { title, transcript: sourceText, summary, hooks, contents } = pipelineResult;

  return {
    id,
    userId,
    title,
    sourceType: "YOUTUBE",
    sourceUrl: url,
    thumbnailUrl: metadata.thumbnailUrl,
    transcript: sourceText,
    duration: 0,
    wordCount: sourceText.split(/\s+/).filter(Boolean).length,
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

  let transcript = page.transcript;

  if (!transcript && videoId) {
    console.log(`[Transcript] Caption parsing failed for ${videoId}, trying unified transcript fetcher...`);
    transcript = await fetchTranscript(videoId);
  }

  return {
    title,
    thumbnailUrl,
    description,
    videoId,
    transcript,
    warning: page.warning ?? oembed.warning,
  };
}

async function fetchYoutubeOembed(canonicalUrl: string): Promise<Partial<YoutubeMetadata>> {
  try {
    console.log(`[fetchYoutubeOembed] Querying Oembed for canonicalUrl: ${canonicalUrl}`);
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
  } catch (error) {
    console.error(`[fetchYoutubeOembed] Failed for canonicalUrl ${canonicalUrl}:`);
    console.error("[fetchYoutubeOembed] Full error object:", error);
    if (error instanceof Error) {
      console.error("[fetchYoutubeOembed] Error message:", error.message);
      console.error("[fetchYoutubeOembed] Error stack:", error.stack);
    }
    return { warning: "youtube_oembed_unavailable" };
  }
}

async function fetchYoutubeWatchPage(
  canonicalUrl: string,
  videoId?: string,
): Promise<Partial<YoutubeMetadata>> {
  try {
    console.log(`[fetchYoutubeWatchPage] Querying HTML watch page for canonicalUrl: ${canonicalUrl}, videoId: ${videoId}`);
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
    
    console.log(`[fetchYoutubeWatchPage] Watch page title resolved: "${title}"`);
    const transcript = await fetchCaptionTranscript(html);

    return {
      title: normalizeText(title),
      description: normalizeText(description),
      thumbnailUrl,
      transcript,
    };
  } catch (error) {
    console.error(`[fetchYoutubeWatchPage] Failed for canonicalUrl ${canonicalUrl}:`);
    console.error("[fetchYoutubeWatchPage] Full error object:", error);
    if (error instanceof Error) {
      console.error("[fetchYoutubeWatchPage] Error message:", error.message);
      console.error("[fetchYoutubeWatchPage] Error stack:", error.stack);
    }
    return { warning: "youtube_page_metadata_unavailable" };
  }
}

async function fetchCaptionTranscript(html: string): Promise<string | undefined> {
  const tracks = extractCaptionTracks(html);
  if (!tracks || tracks.length === 0) {
    console.error("[fetchCaptionTranscript] Silent Failure - No caption tracks found in HTML page");
    return undefined;
  }
  
  const track = pickCaptionTrack(tracks);
  if (!track?.baseUrl) {
    console.error("[fetchCaptionTranscript] Silent Failure - Selected caption track has no baseUrl");
    return undefined;
  }

  const urls = captionUrlCandidates(track);
  console.log(`[fetchCaptionTranscript] Found ${tracks.length} caption tracks. Selected track language: ${track.languageCode}, kind: ${track.kind}. Url count: ${urls.length}`);
  
  for (const url of urls) {
    try {
      console.log(`[fetchCaptionTranscript] Fetching caption URL candidate: ${url}`);
      const response = await axios.get<unknown>(url, {
        headers: browserHeaders(),
        timeout: 15000,
        validateStatus: (status) => status >= 200 && status < 300,
      });
      const transcript =
        typeof response.data === "string"
          ? parseCaptionText(response.data)
          : parseJsonCaption(response.data);
      
      if (!transcript) {
        console.error(`[fetchCaptionTranscript] Silent Failure - Parsed transcript is empty for URL: ${url}`);
        continue;
      }
      if (transcript.length <= 80) {
        console.warn(`[fetchCaptionTranscript] Warning - Transcript length ${transcript.length} <= 80 for URL: ${url}`);
        continue;
      }
      
      console.log(`[fetchCaptionTranscript] Success! Extracted transcript of length ${transcript.length} characters`);
      return transcript;
    } catch (error) {
      console.error(`[fetchCaptionTranscript] Error fetching caption URL: ${url}`);
      console.error("[fetchCaptionTranscript] Full error object:", error);
      if (error instanceof Error) {
        console.error("[fetchCaptionTranscript] Error message:", error.message);
        console.error("[fetchCaptionTranscript] Error stack:", error.stack);
      }
    }
  }

  console.error("[fetchCaptionTranscript] Silent Failure - Exhausted all caption track URL candidates without success");
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

// extractTags, uniqueList and truncate functions were removed because they were unused

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
function browserHeaders() {
  return {
    Accept: "text/html,application/json,text/plain,*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
  };
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
    id: item.id,
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
      hooks: { create: hookCreateRows(project) },
      contents: { create: contentCreateRows(project) },
    },
  });
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
