import axios from "axios";
import { YoutubeTranscript } from "youtube-transcript";
import { env } from "@/lib/env";

const MIN_TRANSCRIPT_WORDS = 50;
const SUPADATA_BASE_URL = "https://api.supadata.ai/v1";

type SupadataTranscriptResponse = {
  content?: string | Array<{ text?: string }>;
  jobId?: string;
  status?: "queued" | "active" | "completed" | "failed";
  error?: string | { message?: string };
};

type StageStatus = "STARTED" | "SUCCESS" | "FAILED" | "SKIPPED";

/**
 * Fetches a real YouTube transcript. In production, Supadata is the canonical
 * provider because direct YouTube transcript scraping is blocked from many
 * datacenter IP ranges. Local/dev falls back to youtube-transcript only when
 * no Supadata key is configured.
 */
export async function fetchTranscript(videoIdOrUrl: string): Promise<string | null> {
  const startedAt = Date.now();
  const videoUrl = toYouTubeUrl(videoIdOrUrl);
  const videoId = extractVideoId(videoIdOrUrl) ?? videoIdOrUrl;

  console.log(
    formatStageLog("Transcript Provider", {
      status: "STARTED",
      provider: env.supadataKey ? "supadata" : "youtube-transcript",
      input: videoUrl,
      videoId,
      length: 0,
      elapsedMs: 0,
    }),
  );

  try {
    if (env.supadataKey) {
      const transcript = await fetchSupadataTranscript(videoUrl);
      logTranscriptResult("Transcript Provider", "supadata", videoId, transcript, startedAt);
      return transcript;
    }

    console.warn(
      formatStageLog("Transcript Provider", {
        status: "SKIPPED",
        provider: "supadata",
        input: videoUrl,
        output: "SUPADATA_API_KEY is not configured; using local youtube-transcript provider.",
        length: 0,
        elapsedMs: Date.now() - startedAt,
      }),
    );

    const transcript = await fetchYoutubeTranscript(videoId);
    logTranscriptResult("Transcript Provider", "youtube-transcript", videoId, transcript, startedAt);
    return transcript;
  } catch (error) {
    console.error(
      formatStageLog("Transcript Provider", {
        status: "FAILED",
        provider: env.supadataKey ? "supadata" : "youtube-transcript",
        input: videoUrl,
        videoId,
        length: 0,
        elapsedMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return null;
  }
}

async function fetchSupadataTranscript(videoUrl: string) {
  const response = await axios.get<SupadataTranscriptResponse>(`${SUPADATA_BASE_URL}/transcript`, {
    headers: { "x-api-key": env.supadataKey },
    params: {
      url: videoUrl,
      lang: "en",
      text: true,
      mode: "native",
    },
    timeout: 30000,
    validateStatus: () => true,
  });

  if (response.status === 202 && response.data.jobId) {
    return pollSupadataJob(response.data.jobId);
  }

  if (response.status === 206) {
    throw new Error("Supadata returned transcript unavailable for existing captions.");
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Supadata transcript request failed with HTTP ${response.status}: ${readSupadataError(response.data)}`,
    );
  }

  return normalizeAndValidateTranscript(readSupadataContent(response.data), "supadata");
}

async function pollSupadataJob(jobId: string) {
  const deadline = Date.now() + 55000;
  let lastStatus = "queued";

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await axios.get<SupadataTranscriptResponse>(`${SUPADATA_BASE_URL}/transcript/${jobId}`, {
      headers: { "x-api-key": env.supadataKey },
      timeout: 15000,
      validateStatus: () => true,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Supadata job ${jobId} failed with HTTP ${response.status}: ${readSupadataError(response.data)}`);
    }

    lastStatus = response.data.status ?? lastStatus;
    if (response.data.status === "failed") {
      throw new Error(`Supadata job ${jobId} failed: ${readSupadataError(response.data)}`);
    }

    if (response.data.status === "completed" || response.data.content) {
      return normalizeAndValidateTranscript(readSupadataContent(response.data), "supadata");
    }
  }

  throw new Error(`Supadata transcript job ${jobId} timed out while status was ${lastStatus}.`);
}

async function fetchYoutubeTranscript(videoId: string) {
  const segments = await YoutubeTranscript.fetchTranscript(videoId);
  const transcript = (segments ?? [])
    .map((item) => item.text?.trim() ?? "")
    .filter(Boolean)
    .join(" ");

  return normalizeAndValidateTranscript(transcript, "youtube-transcript");
}

function readSupadataContent(payload: SupadataTranscriptResponse) {
  if (typeof payload.content === "string") return payload.content;
  if (Array.isArray(payload.content)) {
    return payload.content
      .map((item) => item.text?.trim() ?? "")
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

function readSupadataError(payload: SupadataTranscriptResponse) {
  if (!payload) return "empty response";
  if (typeof payload.error === "string") return payload.error;
  if (payload.error?.message) return payload.error.message;
  return JSON.stringify(payload);
}

function normalizeAndValidateTranscript(raw: string, provider: string) {
  const transcript = normalizeTranscript(raw);
  const words = wordCount(transcript);

  console.log(
    formatStageLog("Transcript Normalization", {
      status: words >= MIN_TRANSCRIPT_WORDS ? "SUCCESS" : "FAILED",
      provider,
      input: `rawChars=${raw?.length ?? 0}`,
      output: transcript.slice(0, 500),
      length: transcript.length,
      words,
      elapsedMs: 0,
      error: words >= MIN_TRANSCRIPT_WORDS ? undefined : `Transcript has ${words} words; minimum is ${MIN_TRANSCRIPT_WORDS}.`,
    }),
  );

  if (words < MIN_TRANSCRIPT_WORDS) {
    throw new Error(`Transcript too short after normalization: ${words} words.`);
  }

  return transcript;
}

function normalizeTranscript(value: string) {
  return (value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function logTranscriptResult(
  stage: string,
  provider: string,
  videoId: string,
  transcript: string,
  startedAt: number,
) {
  console.log(
    formatStageLog(stage, {
      status: "SUCCESS",
      provider,
      videoId,
      output: transcript.slice(0, 500),
      length: transcript.length,
      words: wordCount(transcript),
      elapsedMs: Date.now() - startedAt,
    }),
  );
}

function formatStageLog(
  stage: string,
  fields: {
    status: StageStatus;
    provider?: string;
    input?: string;
    output?: string;
    videoId?: string;
    length?: number;
    words?: number;
    elapsedMs: number;
    error?: string;
  },
) {
  return [
    `[${stage}]`,
    `Status: ${fields.status}`,
    fields.videoId ? `Video ID: ${fields.videoId}` : undefined,
    fields.provider ? `Provider: ${fields.provider}` : undefined,
    fields.input ? `Input: ${fields.input}` : undefined,
    fields.output ? `Output: ${fields.output}` : undefined,
    `Length: ${fields.length ?? 0}`,
    fields.words === undefined ? undefined : `Words: ${fields.words}`,
    `Execution time: ${fields.elapsedMs}ms`,
    fields.error ? `Errors: ${fields.error}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}

function toYouTubeUrl(videoIdOrUrl: string) {
  if (/^https?:\/\//i.test(videoIdOrUrl)) return videoIdOrUrl;
  return `https://www.youtube.com/watch?v=${videoIdOrUrl}`;
}

function extractVideoId(value: string) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    if (!host.endsWith("youtube.com")) return null;
    const directId = parsed.searchParams.get("v");
    if (directId) return directId;
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (["embed", "shorts", "live", "v"].includes(parts[0] ?? "")) return parts[1] ?? null;
  } catch {
    return null;
  }
  return null;
}

function wordCount(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}
