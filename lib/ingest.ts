import crypto from "node:crypto";
import axios from "axios";
import * as cheerio from "cheerio";
import sanitizeHtml from "sanitize-html";
import { YoutubeTranscript } from "youtube-transcript";
import { runContentPipeline } from "@/lib/ai/pipeline";
import { prisma } from "@/lib/prisma/client";
import { getStoredProject, saveStoredProject } from "@/lib/projects/store";
import type { Project } from "@/lib/types";

/**
 * Extracts the YouTube video ID from any supported URL format:
 *   - youtube.com/watch?v=VIDEO_ID
 *   - youtube.com/shorts/VIDEO_ID
 *   - youtu.be/VIDEO_ID
 *
 * Returns null if no valid video ID is found.
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      return id.length === 11 ? id : null;
    }

    if (hostname === "youtube.com") {
      // /watch?v=
      const v = parsed.searchParams.get("v");
      if (v && v.length === 11) return v;

      // /shorts/VIDEO_ID or /embed/VIDEO_ID or /v/VIDEO_ID
      const match = parsed.pathname.match(/\/(?:shorts|embed|v)\/([a-zA-Z0-9_-]{11})/);
      if (match) return match[1];
    }
  } catch {
    // URL constructor throws on invalid URLs
  }
  return null;
}

/**
 * Fetches the transcript for a YouTube video using the youtube-transcript package.
 * Throws if the transcript is unavailable or too short to be useful.
 */
async function fetchYouTubeTranscript(videoId: string): Promise<string> {
  console.log("[ingest:youtube] Fetching transcript for videoId:", videoId);

  let segments;
  try {
    segments = await YoutubeTranscript.fetchTranscript(videoId);
    console.log(
      "[ingest:youtube] Transcript fetch SUCCESS - segments count:",
      segments?.length ?? 0
    );
  } catch (error) {
    console.error(
      "[ingest:youtube] Transcript fetch FAILED - Full Error Object:",
      error
    );
    if (error instanceof Error) {
      console.error("[ingest:youtube] Error message:", error.message);
      console.error("[ingest:youtube] Error stack:", error.stack);
      console.error("[ingest:youtube] Error name:", error.name);
      console.error("[ingest:youtube] Error constructor:", error.constructor.name);
    }
    if (typeof error === "object" && error !== null) {
      console.error("[ingest:youtube] Error keys:", Object.keys(error));
      for (const key of Object.keys(error)) {
        console.error(`[ingest:youtube] error.${key}:`, (error as Record<string, unknown>)[key]);
      }
    }
    throw new Response(
      JSON.stringify({ error: "Transcript unavailable" }),
      { status: 422 },
    );
  }

  // Check for explicit silent failure: null/undefined returned without throwing
  if (!segments) {
    console.error("[ingest:youtube] SILENT FAILURE - segments is null/undefined");
    throw new Response(
      JSON.stringify({ error: "Transcript unavailable" }),
      { status: 422 },
    );
  }

  if (segments.length === 0) {
    console.error(
      "[ingest:youtube] SILENT FAILURE - Empty array returned (no captions or access denied)"
    );
    throw new Response(
      JSON.stringify({ error: "Transcript unavailable" }),
      { status: 422 },
    );
  }

  const transcript = segments
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join(" ");

  console.log("[ingest:youtube] Transcript length (chars):", transcript.length);

  if (transcript.length === 0) {
    console.error(
      "[ingest:youtube] SILENT FAILURE - All segments filtered to empty string"
    );
    throw new Response(
      JSON.stringify({ error: "Transcript unavailable" }),
      { status: 422 },
    );
  }

  if (transcript.length < 50) {
    console.error("[ingest:youtube] Transcript too short:", transcript.length);
    throw new Response(
      JSON.stringify({ error: "Unable to extract content from the video." }),
      { status: 422 },
    );
  }

  return transcript;
}

export async function ingestYoutube(url: string, userId: string): Promise<Project> {
  if (process.env.RECASTR_DEMO_MODE === "true") {
    return getStoredProject("demo-ai-youtube")!;
  }

  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Response(
      JSON.stringify({
        error: "Invalid YouTube URL. Supported formats: youtube.com/watch?v=, youtube.com/shorts/, youtu.be/",
        code: "invalid_youtube_url",
      }),
      { status: 400 },
    );
  }

  // Load user voice preferences
  const brandVoice = await prisma.brandVoice.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // Fetch watch page metadata if available to seed title/desc
  let titleSeed = `YouTube video ${videoId}`;
  let descSeed = "";
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const res = await axios.get(watchUrl, {
      timeout: 5000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const $ = cheerio.load(res.data);
    titleSeed = $("title").text().trim() || titleSeed;
    descSeed = $("meta[name='description']").attr("content")?.trim() || "";
  } catch (e) {
    console.error("[ingest:youtube] Metadata pre-fetch failed:", e);
  }

  const pipelineResult = await runContentPipeline({
    url,
    userId,
    sourceType: "YOUTUBE",
    title: titleSeed,
    description: descSeed,
    tonePref: brandVoice?.toneDescriptors?.[0] || "casual",
    samplePosts: brandVoice?.samplePosts || [],
    bannedWords: brandVoice?.bannedWords || [],
  });

  const { title, transcript, summary, hooks, contents } = pipelineResult;
  const wordCount = transcript.split(/\s+/).filter(Boolean).length;
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  const projectId = `youtube-${hash(url).slice(0, 10)}-${userId}`;

  // Persist project
  try {
    await prisma.project.create({
      data: {
        id: projectId,
        userId,
        title,
        sourceType: "youtube",
        sourceUrl: url,
        thumbnailUrl,
        transcript,
        summary: summary as any,
        wordCount,
        hooks: {
          create: hooks.map((h) => ({
            id: h.id,
            text: h.text,
            hookType: h.hookType,
            reachScore: h.reachScore,
          })),
        },
        contents: {
          create: contents.map((c) => ({
            id: c.id,
            hookId: c.hookId,
            platform: c.platform,
            contentType: c.contentType,
            body: c.body,
            originalBody: c.originalBody,
            tone: c.tone,
            approved: c.approved,
            order: c.order,
          })),
        },
      },
    });
  } catch (dbError) {
    console.error("[ingest:youtube] DB write failed:", dbError);
  }

  const project: Project = {
    id: projectId,
    userId,
    title,
    sourceType: "YOUTUBE",
    sourceUrl: url,
    thumbnailUrl,
    transcript,
    summary,
    duration: 0,
    wordCount,
    hooks,
    contents,
    outputs: contents.map((c) => ({
      id: c.id,
      projectId,
      platform: c.platform,
      outputType: c.contentType,
      content: c.body,
      originalContent: c.originalBody,
      tone: c.tone,
      approved: c.approved,
      createdAt: c.createdAt,
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "DRAFT",
  };

  saveStoredProject(project);
  return project;
}

export async function ingestPodcast(fileName = "podcast-upload.mp3"): Promise<Project> {
  if (process.env.RECASTR_DEMO_MODE === "true") {
    return getStoredProject("demo-founder-podcast")!;
  }

  return {
    ...getStoredProject("demo-founder-podcast")!,
    id: `podcast-${hash(fileName).slice(0, 10)}`,
    title: fileName.replace(/\.[^.]+$/, ""),
    createdAt: new Date().toISOString(),
  };
}

export async function ingestBlog(url: string, userId: string = "local-user"): Promise<Project> {
  if (process.env.RECASTR_DEMO_MODE === "true") {
    return getStoredProject("demo-marketing-blog")!;
  }

  // Load user voice preferences
  const brandVoice = await prisma.brandVoice.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const pipelineResult = await runContentPipeline({
    url,
    userId,
    sourceType: "BLOG",
    tonePref: brandVoice?.toneDescriptors?.[0] || "casual",
    samplePosts: brandVoice?.samplePosts || [],
    bannedWords: brandVoice?.bannedWords || [],
  });

  const { title, transcript, summary, hooks, contents } = pipelineResult;
  const wordCount = transcript.split(/\s+/).filter(Boolean).length;
  const projectId = `blog-${hash(url).slice(0, 10)}-${userId}`;

  // Persist project
  try {
    await prisma.project.create({
      data: {
        id: projectId,
        userId,
        title,
        sourceType: "blog",
        sourceUrl: url,
        transcript,
        summary: summary as any,
        wordCount,
        hooks: {
          create: hooks.map((h) => ({
            id: h.id,
            text: h.text,
            hookType: h.hookType,
            reachScore: h.reachScore,
          })),
        },
        contents: {
          create: contents.map((c) => ({
            id: c.id,
            hookId: c.hookId,
            platform: c.platform,
            contentType: c.contentType,
            body: c.body,
            originalBody: c.originalBody,
            tone: c.tone,
            approved: c.approved,
            order: c.order,
          })),
        },
      },
    });
  } catch (dbError) {
    console.error("[ingest:blog] DB write failed:", dbError);
  }

  const project: Project = {
    id: projectId,
    userId,
    title,
    sourceType: "BLOG",
    sourceUrl: url,
    transcript,
    summary,
    duration: 0,
    wordCount,
    hooks,
    contents,
    outputs: contents.map((c) => ({
      id: c.id,
      projectId,
      platform: c.platform,
      outputType: c.contentType,
      content: c.body,
      originalContent: c.originalBody,
      tone: c.tone,
      approved: c.approved,
      createdAt: c.createdAt,
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "DRAFT",
  };

  saveStoredProject(project);
  return project;
}

export function hash(value: string | Buffer) {
  return crypto.createHash("md5").update(value).digest("hex");
}
