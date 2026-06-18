import crypto from "node:crypto";
import axios from "axios";
import * as cheerio from "cheerio";
import sanitizeHtml from "sanitize-html";
import { YoutubeTranscript } from "youtube-transcript";
import { summarizeTranscript } from "@/lib/ai/service";
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
  } catch (error) {
    console.error("[ingest:youtube] Transcript fetch failed:", error);
    throw new Response(
      JSON.stringify({ error: "Transcript unavailable" }),
      { status: 422 },
    );
  }

  if (!segments || segments.length === 0) {
    console.error("[ingest:youtube] Empty transcript for videoId:", videoId);
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

  if (transcript.length < 50) {
    console.error("[ingest:youtube] Transcript too short:", transcript.length);
    throw new Response(
      JSON.stringify({ error: "Unable to extract content from the video." }),
      { status: 422 },
    );
  }

  return transcript;
}

export async function ingestYoutube(url: string): Promise<Project> {
  if (process.env.RECASTR_DEMO_MODE === "true") {
    return getStoredProject("demo-ai-youtube")!;
  }

  // Step 1: Extract and validate the video ID
  const videoId = extractYouTubeVideoId(url);
  console.log("[ingest:youtube] Extracted videoId:", videoId, "from url:", url);

  if (!videoId) {
    throw new Response(
      JSON.stringify({
        error: "Invalid YouTube URL. Supported formats: youtube.com/watch?v=, youtube.com/shorts/, youtu.be/",
        code: "invalid_youtube_url",
      }),
      { status: 400 },
    );
  }

  // Step 2: Fetch transcript (throws on failure — no fallback)
  const transcript = await fetchYouTubeTranscript(videoId);

  // Step 3: Summarize transcript via Gemini
  console.log("[ingest:youtube] Summarizing transcript via Gemini...");
  const summary = await summarizeTranscript(transcript);
  console.log("[ingest:youtube] Summary tldr:", summary.tldr);

  // Step 4: Build the project from real source data
  const projectId = `youtube-${hash(videoId).slice(0, 10)}`;
  const wordCount = transcript.split(/\s+/).filter(Boolean).length;

  const project: Project = {
    id: projectId,
    userId: "local-user",
    title: summary.tldr.slice(0, 120) || "Imported YouTube Video",
    sourceType: "YOUTUBE",
    sourceUrl: url,
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    transcript,
    summary,
    duration: 0,
    wordCount,
    hooks: summary.hooks.map((text, index) => ({
      id: `${projectId}-hook-${index + 1}`,
      projectId,
      text,
      hookType: ["Curiosity gap", "Data", "Story", "Controversy", "Question", "Contrast", "Bold claim", "How-to", "Warning", "Result"][index] ?? "Curiosity gap",
      reachScore: Math.max(60, 95 - index * 3),
    })),
    contents: [],
    outputs: [],
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

export async function ingestBlog(url: string): Promise<Project> {
  if (process.env.RECASTR_DEMO_MODE === "true") {
    return getStoredProject("demo-marketing-blog")!;
  }

  const response = await axios.get(url, {
    timeout: 10_000,
    headers: { "User-Agent": "RecastrBot/1.0" },
  });
  const $ = cheerio.load(response.data);
  $("script, style, nav, header, footer, aside, noscript, iframe, [class*=ad]").remove();
  const title =
    $("meta[property='og:title']").attr("content")?.trim() ||
    $("title").text().trim() ||
    $("h1").first().text().trim() ||
    "Imported blog post";
  const rawBody =
    $("article").text() ||
    $("main").text() ||
    $("p")
      .map((_, element) => $(element).text())
      .get()
      .join("\n");
  const transcript = sanitizeHtml(rawBody, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, " ")
    .trim();

  if (transcript.length < 200) {
    throw new Response(
      JSON.stringify({
        error: "extraction_failed",
        code: "extraction_failed",
        fallback: "paste_text",
      }),
      { status: 400 },
    );
  }

  return {
    ...getStoredProject("demo-marketing-blog")!,
    id: `blog-${hash(url).slice(0, 10)}`,
    title,
    sourceUrl: url,
    transcript,
    summary: await summarizeTranscript(transcript),
    createdAt: new Date().toISOString(),
  };
}

export function hash(value: string | Buffer) {
  return crypto.createHash("md5").update(value).digest("hex");
}
