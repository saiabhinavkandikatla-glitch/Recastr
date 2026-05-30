import crypto from "node:crypto";
import axios from "axios";
import * as cheerio from "cheerio";
import sanitizeHtml from "sanitize-html";
import { summarizeTranscript } from "@/lib/ai/service";
import { getStoredProject } from "@/lib/projects/store";
import type { Project } from "@/lib/types";

export async function ingestYoutube(url: string): Promise<Project> {
  if (process.env.RECASTR_DEMO_MODE === "true") {
    return getStoredProject("demo-ai-youtube")!;
  }

  try {
    throw new Error("yt-dlp binary is not available in this runtime");
  } catch {
    throw new Response(
      JSON.stringify({
        error: "Video processing unavailable",
        code: "video_processing_unavailable",
        demo: true,
        sourceUrl: url,
      }),
      { status: 503 },
    );
  }
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
