import axios from "axios";
import { YoutubeTranscript } from "youtube-transcript";
import { env } from "@/lib/env";
import ytdl from "yt-dlp-exec";
import * as cheerio from "cheerio";

const MIN_TRANSCRIPT_WORDS = 50;
const SUPADATA_BASE_URL = "https://api.supadata.ai/v1";

export type SupadataTranscriptResponse = {
  content?: string | Array<{ text?: string }>;
  jobId?: string;
  status?: "queued" | "active" | "completed" | "failed";
  error?: string | { message?: string };
};

export type CaptionTrack = {
  baseUrl?: string;
  languageCode?: string;
  kind?: string;
  name?: {
    simpleText?: string;
    runs?: Array<{ text?: string }>;
  };
};

export class TranscriptError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "TranscriptError";
    this.code = code;
  }
}

/**
 * Normalizes any YouTube URL by extracting its canonical 11-char video ID
 * and constructing the canonical URL. This strips all tracking parameters
 * such as si, feature, list, index, t, pp, ab_channel, utm_*, etc.
 */
export function extractVideoId(value: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "");
    
    if (host === "youtu.be") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      const id = parts[0] ?? "";
      if (id.length === 11) return id;
    }
    
    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      const directId = parsed.searchParams.get("v");
      if (directId && directId.length === 11) return directId;
      
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live", "v"].includes(parts[0])) {
        const id = parts[1] ?? "";
        if (id.length === 11) return id;
      }
    }
  } catch (e) {
    // Ignore URL parsing errors and fall back to regex matching
  }
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/(?:embed|shorts|live|v)\/)([a-zA-Z0-9_-]{11})/i,
    /([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1] && match[1].length === 11) {
      return match[1];
    }
  }
  
  return null;
}

export function normalizeYoutubeUrl(url: string): string {
  const videoId = extractVideoId(url);
  if (!videoId) return url;
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Fetches a real YouTube transcript using a robust retry and fallback mechanism.
 * Uses Promise.any for lightweight fallbacks to prevent Vercel 10-second timeouts.
 */
export async function fetchTranscript(videoIdOrUrl: string): Promise<string> {
  const normalizedUrl = normalizeYoutubeUrl(videoIdOrUrl);
  const videoId = extractVideoId(videoIdOrUrl);
  
  if (!videoId) {
    console.error(`[Transcript Pipeline] FAILED: Video ID Extraction returned null for input: ${videoIdOrUrl}`);
    throw new TranscriptError("Unsupported video URL format or invalid video ID.", "UNSUPPORTED_VIDEO");
  }

  console.log(`[Transcript Pipeline] START\n- Input URL: ${videoIdOrUrl}\n- Normalized URL: ${normalizedUrl}\n- Video ID: ${videoId}`);

  const errors: Array<{ provider: string; error: string; code: string }> = [];

  // Provider 1: Supadata (canonical, if key exists)
  if (env.supadataKey) {
    try {
      return await fetchSupadataTranscriptWithRetry(normalizedUrl, videoId);
    } catch (e: any) {
      const code = e instanceof TranscriptError ? e.code : "TRANSCRIPT_UNAVAILABLE";
      errors.push({ provider: "supadata", error: e.message || String(e), code });
      console.warn(`[Transcript Pipeline] Supadata failed. Code: ${code}. Trying fallbacks...`);
    }
  } else {
    console.log(`[Transcript Pipeline] Supadata API key is not configured, skipping.`);
    errors.push({ provider: "supadata", error: "SUPADATA_API_KEY is not configured", code: "INVALID_API_KEY" });
  }

  let transcript: string | null = null;

  // Provider 2 & 3: Run lightweight providers in parallel to avoid Vercel 10s timeout
  console.log(`[Transcript Pipeline] Running lightweight fallbacks (youtube-transcript & scrape-watch-page) concurrently...`);
  const lightweightPromises = [
    fetchWithYoutubeTranscriptLib(videoId, normalizedUrl).catch(e => {
      const code = e instanceof TranscriptError ? e.code : "TRANSCRIPT_UNAVAILABLE";
      const errObj = { provider: "youtube-transcript", error: e.message || String(e), code };
      errors.push(errObj);
      throw errObj;
    }),
    scrapeWatchPageCaptions(videoId, normalizedUrl).catch(e => {
      const code = e instanceof TranscriptError ? e.code : "TRANSCRIPT_UNAVAILABLE";
      const errObj = { provider: "scrape-watch-page", error: e.message || String(e), code };
      errors.push(errObj);
      throw errObj;
    })
  ];

  try {
    transcript = await Promise.any(lightweightPromises);
  } catch (aggregateError) {
    console.warn(`[Transcript Pipeline] All lightweight fallbacks failed. Checking yt-dlp...`);
  }

  if (transcript) {
    return transcript;
  }

  // Provider 4: yt-dlp (heavy fallback)
  try {
    return await fetchYtdlSubtitles(videoId, normalizedUrl);
  } catch (e: any) {
    const code = e instanceof TranscriptError ? e.code : "TRANSCRIPT_UNAVAILABLE";
    errors.push({ provider: "yt-dlp", error: e.message || String(e), code });
  }

  // All providers failed. Resolve the most specific error code.
  console.error(`[Transcript Pipeline] FAILED: All transcript extraction providers failed for Video ID ${videoId}`);
  for (const err of errors) {
    console.error(`  - Provider: ${err.provider}, Code: ${err.code}, Error: ${err.error}`);
  }

  const noCaptions = errors.find(e => e.code === "NO_CAPTIONS");
  const regionBlocked = errors.find(e => e.code === "REGION_BLOCKED");
  const quotaExceeded = errors.find(e => e.code === "TRANSCRIPT_QUOTA_EXCEEDED");
  const invalidKey = errors.find(e => e.code === "INVALID_API_KEY");
  const providerTimeout = errors.find(e => e.code === "PROVIDER_TIMEOUT");
  const unsupported = errors.find(e => e.code === "UNSUPPORTED_VIDEO");

  let finalCode = "TRANSCRIPT_UNAVAILABLE";
  let finalMessage = "Transcript unavailable for this video. Captions are disabled, private, or blocked.";

  if (noCaptions) {
    finalCode = "NO_CAPTIONS";
    finalMessage = "Video has no captions.";
  } else if (regionBlocked) {
    finalCode = "REGION_BLOCKED";
    finalMessage = "This video is region blocked.";
  } else if (quotaExceeded) {
    finalCode = "TRANSCRIPT_QUOTA_EXCEEDED";
    finalMessage = "Transcript provider quota exceeded.";
  } else if (providerTimeout) {
    finalCode = "PROVIDER_TIMEOUT";
    finalMessage = "Transcript provider request timed out.";
  } else if (invalidKey && !env.supadataKey) {
    finalCode = "INVALID_API_KEY";
    finalMessage = "AI provider authentication failed / Invalid API key.";
  } else if (unsupported) {
    finalCode = "UNSUPPORTED_VIDEO";
    finalMessage = "Unsupported video type.";
  }

  throw new TranscriptError(finalMessage, finalCode);
}

async function fetchSupadataTranscriptWithRetry(videoUrl: string, videoId: string): Promise<string> {
  let attempt = 0;
  const maxAttempts = 2; // Reduced to 2 to minimize Vercel timeout risk
  let lastError: any = null;

  while (attempt < maxAttempts) {
    attempt++;
    const startTime = Date.now();
    console.log(`[Supadata Client] START - Attempt ${attempt}/${maxAttempts}\n- Input: ${videoUrl}`);

    try {
      const response = await axios.get<SupadataTranscriptResponse>(`${SUPADATA_BASE_URL}/transcript`, {
        headers: { "x-api-key": env.supadataKey },
        params: {
          url: videoUrl,
          lang: "en",
          text: true,
          mode: "native",
        },
        timeout: 5000, // Strict timeout to prevent Vercel 10s execution cap
        validateStatus: () => true,
      });

      const elapsedMs = Date.now() - startTime;
      console.log(`[Supadata Client] response status: ${response.status}, elapsed: ${elapsedMs}ms`);

      if (response.status === 202 && response.data.jobId) {
        return await pollSupadataJob(response.data.jobId, videoUrl, videoId);
      }

      if (response.status === 206) {
        throw new TranscriptError("Supadata returned transcript unavailable for existing captions.", "NO_CAPTIONS");
      }

      if (response.status === 401 || response.status === 403) {
        throw new TranscriptError("Invalid API key configured for Supadata.", "INVALID_API_KEY");
      }

      if (response.status === 429) {
        throw new TranscriptError("Transcript provider quota exceeded.", "TRANSCRIPT_QUOTA_EXCEEDED");
      }

      if (response.status < 200 || response.status >= 300) {
        const errorMsg = readSupadataError(response.data);
        throw new TranscriptError(`Supadata transcript request failed with HTTP ${response.status}: ${errorMsg}`, "TRANSCRIPT_UNAVAILABLE");
      }

      const content = readSupadataContent(response.data);
      const transcript = normalizeAndValidateTranscript(content, "supadata");
      
      console.log(`[Supadata Client] SUCCESS\n- Duration: ${elapsedMs}ms\n- Output sample: ${transcript.slice(0, 80)}...`);
      return transcript;
    } catch (error: any) {
      const elapsedMs = Date.now() - startTime;
      console.error(`[Supadata Client] FAILED - Attempt ${attempt}/${maxAttempts}\n- Duration: ${elapsedMs}ms`);
      
      lastError = error;

      if (error instanceof TranscriptError && 
         (error.code === "NO_CAPTIONS" || error.code === "INVALID_API_KEY" || error.code === "TRANSCRIPT_QUOTA_EXCEEDED")) {
        throw error;
      }

      if (attempt < maxAttempts) {
        const backoff = 500;
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }

  throw lastError || new TranscriptError("Supadata failed after retries", "TRANSCRIPT_UNAVAILABLE");
}

async function pollSupadataJob(jobId: string, videoUrl: string, videoId: string): Promise<string> {
  const deadline = Date.now() + 8000; // Limit poll duration on Serverless
  let lastStatus = "queued";
  const pollStartTime = Date.now();

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const stepStart = Date.now();
    console.log(`[Supadata Client Poll] START - Job ${jobId}`);

    try {
      const response = await axios.get<SupadataTranscriptResponse>(`${SUPADATA_BASE_URL}/transcript/${jobId}`, {
        headers: { "x-api-key": env.supadataKey },
        timeout: 3000,
        validateStatus: () => true,
      });

      const elapsedMs = Date.now() - stepStart;
      console.log(`[Supadata Client Poll] response status: ${response.status}, elapsed: ${elapsedMs}ms`);

      if (response.status < 200 || response.status >= 300) {
        const errorMsg = readSupadataError(response.data);
        throw new TranscriptError(`Supadata job check failed with HTTP ${response.status}: ${errorMsg}`, "TRANSCRIPT_UNAVAILABLE");
      }

      lastStatus = response.data.status ?? lastStatus;
      if (response.data.status === "failed") {
        const errorMsg = readSupadataError(response.data);
        throw new TranscriptError(`Supadata job failed: ${errorMsg}`, "TRANSCRIPT_UNAVAILABLE");
      }

      if (response.data.status === "completed" || response.data.content) {
        const content = readSupadataContent(response.data);
        const transcript = normalizeAndValidateTranscript(content, "supadata");
        return transcript;
      }
    } catch (error: any) {
      console.error(`[Supadata Client Poll] FAILED - Job ${jobId}: ${error.message}`);
      throw error;
    }
  }

  throw new TranscriptError(`Supadata transcript job ${jobId} timed out.`, "PROVIDER_TIMEOUT");
}

async function fetchWithYoutubeTranscriptLib(videoId: string, videoUrl: string): Promise<string> {
  const startTime = Date.now();
  console.log(`[youtube-transcript Package] START\n- Input: videoId=${videoId}`);

  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    const elapsedMs = Date.now() - startTime;

    if (!segments || segments.length === 0) {
      throw new TranscriptError("No captions returned from youtube-transcript library", "NO_CAPTIONS");
    }

    const rawText = segments
      .map((item) => item.text?.trim() ?? "")
      .filter(Boolean)
      .join(" ");

    const transcript = normalizeAndValidateTranscript(rawText, "youtube-transcript");
    console.log(`[youtube-transcript Package] SUCCESS\n- Duration: ${elapsedMs}ms`);
    return transcript;
  } catch (error: any) {
    const elapsedMs = Date.now() - startTime;
    console.error(`[youtube-transcript Package] FAILED\n- Duration: ${elapsedMs}ms\n- Error: ${error.message || error}`);

    let code = "TRANSCRIPT_UNAVAILABLE";
    if (error.message && (
      error.message.includes("Could not find captions") ||
      error.message.includes("disabled") ||
      error.message.includes("no captions")
    )) {
      code = "NO_CAPTIONS";
    } else if (error.message && error.message.includes("Too many requests")) {
      code = "TRANSCRIPT_QUOTA_EXCEEDED";
    }

    throw new TranscriptError(error.message || "Failed to fetch transcript using library", code);
  }
}

async function scrapeWatchPageCaptions(videoId: string, videoUrl: string): Promise<string> {
  const startTime = Date.now();
  console.log(`[Scrape Watch Page] START\n- Input: videoId=${videoId}`);

  try {
    const response = await axios.get(videoUrl, {
      timeout: 4000, // Short timeout for race safety
      headers: browserHeaders(),
      validateStatus: () => true,
    });

    const elapsedMs = Date.now() - startTime;
    console.log(`[Scrape Watch Page] response status: ${response.status}, elapsed: ${elapsedMs}ms`);

    if (response.status === 429) {
      throw new TranscriptError("Transcript provider quota exceeded", "TRANSCRIPT_QUOTA_EXCEEDED");
    }
    if (response.status < 200 || response.status >= 300) {
      throw new TranscriptError(`Failed to fetch watch page with status ${response.status}`, "TRANSCRIPT_UNAVAILABLE");
    }

    const html = response.data;
    const tracks = extractCaptionTracks(html);
    if (!tracks || tracks.length === 0) {
      throw new TranscriptError("No caption tracks found in HTML watch page", "NO_CAPTIONS");
    }

    const track = pickCaptionTrack(tracks);
    if (!track || !track.baseUrl) {
      throw new TranscriptError("Selected caption track has no baseUrl", "NO_CAPTIONS");
    }

    const urls = captionUrlCandidates(track);
    console.log(`[Scrape Watch Page] Found ${tracks.length} tracks. Trying candidate URLs...`);

    for (const url of urls) {
      try {
        console.log(`[Scrape Watch Page] Fetching caption URL candidate: ${url}`);
        const capRes = await axios.get<unknown>(url, {
          headers: browserHeaders(),
          timeout: 3000,
        });

        const rawText =
          typeof capRes.data === "string"
            ? parseCaptionText(capRes.data)
            : parseJsonCaption(capRes.data);

        if (rawText && rawText.length > 80) {
          const transcript = normalizeAndValidateTranscript(rawText, "scrape-watch-page");
          console.log(`[Scrape Watch Page] SUCCESS\n- Duration: ${Date.now() - startTime}ms`);
          return transcript;
        }
      } catch (e: any) {
        console.warn(`[Scrape Watch Page] URL candidate failed: ${url}`, e.message || e);
      }
    }

    throw new TranscriptError("Exhausted all caption track URLs without parsing text", "NO_CAPTIONS");
  } catch (error: any) {
    const elapsedMs = Date.now() - startTime;
    console.error(`[Scrape Watch Page] FAILED\n- Duration: ${elapsedMs}ms\n- Error: ${error.message || error}`);
    throw error instanceof TranscriptError ? error : new TranscriptError(error.message || "Watch page scrape failed", "TRANSCRIPT_UNAVAILABLE");
  }
}

async function fetchYtdlSubtitles(videoId: string, videoUrl: string): Promise<string> {
  const startTime = Date.now();
  console.log(`[yt-dlp Subtitles] START\n- Input: videoId=${videoId}`);

  try {
    const infoResult = await ytdl(videoUrl, {
      dumpSingleJson: true,
      skipDownload: true,
    });

    const elapsedMs = Date.now() - startTime;
    console.log(`[yt-dlp Subtitles] fetched metadata in ${elapsedMs}ms`);

    const info = typeof infoResult === "string" ? infoResult : JSON.stringify(infoResult);
    const infoJson = JSON.parse(info);

    const hasSubtitles = infoJson.requestedSubtitles || infoJson.automatic_captions;
    if (!hasSubtitles) {
      throw new TranscriptError("No subtitles available via yt-dlp", "NO_CAPTIONS");
    }

    let subtitleUrl = null;
    if (infoJson.requestedSubtitles) {
      const enSubtitle = infoJson.requestedSubtitles.en;
      if (enSubtitle) subtitleUrl = enSubtitle.url;
    }
    if (!subtitleUrl && infoJson.automatic_captions) {
      const enAuto = infoJson.automatic_captions['en'];
      if (enAuto) subtitleUrl = enAuto.url;
    }
    if (!subtitleUrl) {
      if (infoJson.requestedSubtitles) {
        const firstLang = Object.keys(infoJson.requestedSubtitles)[0];
        if (firstLang) subtitleUrl = infoJson.requestedSubtitles[firstLang].url;
      } else if (infoJson.automatic_captions) {
        const firstLang = Object.keys(infoJson.automatic_captions)[0];
        if (firstLang) subtitleUrl = infoJson.automatic_captions[firstLang].url;
      }
    }

    if (!subtitleUrl) {
      throw new TranscriptError("No subtitle URL found via yt-dlp", "NO_CAPTIONS");
    }

    console.log(`[yt-dlp Subtitles] Fetching subtitle content from: ${subtitleUrl}`);
    const text = (await ytdl(subtitleUrl)) as unknown as string;
    
    const cleanedText = text
      .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}><\/\d{2}:\d{2}:\d{2}\.\d{3}>/g, '')
      .replace(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/g, '')
      .replace(/\(\d{2}:\d{2}:\d{2}\.\d{3}\)/, '')
      .replace(/^\s*[\d\-:]+\s*$/gm, '')
      .replace(/^\s*$/gm, '')
      .trim();

    const transcript = normalizeAndValidateTranscript(cleanedText, "yt-dlp");
    console.log(`[yt-dlp Subtitles] SUCCESS\n- Duration: ${Date.now() - startTime}ms`);
    return transcript;
  } catch (error: any) {
    const elapsedMs = Date.now() - startTime;
    console.error(`[yt-dlp Subtitles] FAILED\n- Duration: ${elapsedMs}ms\n- Error: ${error.message || error}`);

    let code = "TRANSCRIPT_UNAVAILABLE";
    if (error.message && error.message.includes("geo-restricted")) {
      code = "REGION_BLOCKED";
    } else if (error.message && (error.message.includes("No subtitles") || error.message.includes("not found"))) {
      code = "NO_CAPTIONS";
    }

    throw error instanceof TranscriptError ? error : new TranscriptError(error.message || "yt-dlp subtitles failed", code);
  }
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

  console.log(`[Transcript Normalizer] provider: ${provider}, rawChars: ${raw?.length ?? 0}, normalizedChars: ${transcript.length}, words: ${words}`);

  if (words < MIN_TRANSCRIPT_WORDS) {
    throw new TranscriptError(`Transcript is too short after normalization (${words} words; minimum is ${MIN_TRANSCRIPT_WORDS}).`, "NO_CAPTIONS");
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

function wordCount(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}

function browserHeaders() {
  return {
    Accept: "text/html,application/json,text/plain,*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
  };
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

function withCaptionFormat(baseUrl: string, format: "json3" | "vtt") {
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}fmt=${format}`;
}

// export default is not needed - exporting individual functions
function addCaptionParam(baseUrl: string, key: string, value: string) {
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function parseJsonCaption(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("events" in payload)) return "";
  const events = (payload as { events?: unknown }).events;
  if (!Array.isArray(events)) return "";

  return normalizeTranscript(
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
  if (xmlLines.length > 0) return normalizeTranscript(xmlLines.join(" "));

  return normalizeTranscript(
    raw
      .replace(/^WEBVTT[\s\S]*?\n\n/i, " ")
      .replace(/\d{1,2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{1,2}:\d{2}:\d{2}\.\d{3}[^\n]*/g, " ")
      .replace(/<[^>]+>/g, " "),
  );
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
