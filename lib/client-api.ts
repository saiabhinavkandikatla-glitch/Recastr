"use client";

import type { ScheduledPost } from "@/lib/types";

type CreditPayload = {
  error?: string | { code?: string; message?: string };
  code?: string;
  reason?: string;
  provider?: string;
  credits?: number;
  status?: number;
  upgradeUrl?: string;
};

export async function readApiJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as CreditPayload;
  if (isCreditExhausted(response, payload)) {
    emitCreditExhausted(payload);
    throw new Error("credit_exhausted");
  }
  if (!response.ok) {
    throw new Error(friendlyApiMessage(response, payload));
  }
  return payload as T;
}

export async function assertApiOk(response: Response) {
  if (response.ok) return;
  const payload = (await response.json().catch(() => ({}))) as CreditPayload;
  if (isCreditExhausted(response, payload)) {
    emitCreditExhausted(payload);
    throw new Error("credit_exhausted");
  }
  throw new Error(friendlyApiMessage(response, payload));
}

export function emitCreditExhausted(payload: CreditPayload = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("recastr:credit-exhausted", {
      detail: {
        credits: payload.credits ?? 0,
        upgradeUrl: payload.upgradeUrl ?? "/settings?tab=billing",
      },
    }),
  );
}

export function emitScheduleCreated(post: ScheduledPost) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("recastr:schedule-created", {
      detail: { post },
    }),
  );
}

function isCreditExhausted(response: Response, payload: CreditPayload) {
  const nestedCode = typeof payload.error === "object" ? payload.error.code : undefined;
  return response.status === 403 && (payload.code === "credit_exhausted" || nestedCode === "credit_exhausted");
}

function friendlyApiMessage(response: Response, payload: CreditPayload) {
  const code = typeof payload.error === "object" ? payload.error.code ?? payload.code : payload.code;
  const raw =
    typeof payload.error === "string"
      ? payload.error
      : payload.error?.message;
  const path = getResponsePath(response);

  if (isPlanLimitCode(code)) {
    return raw ?? "Your current plan does not include this action.";
  }

  if (response.status === 401) {
    return "Please sign in again to continue.";
  }

  if (response.status === 403) {
    return raw && !looksLikeProviderError(raw)
      ? raw
      : "You do not have access to this action.";
  }

  if (response.status === 429) {
    return code === "rate_limit"
      ? "Too many requests. Wait a moment and try again."
      : "The AI service is temporarily quota-limited. Try again later.";
  }

  if (code === "NO_TRANSCRIPT") {
    return raw ?? "No transcript available for this video. Enable captions in YouTube Studio or try a different video.";
  }

  if (code === "NO_CAPTIONS") {
    return "Video has no captions";
  }

  if (code === "TRANSCRIPT_QUOTA_EXCEEDED") {
    return providerName(payload) === "nvidia-nim"
      ? "NVIDIA NIM quota exceeded. Update NVIDIA_API_KEY, then retry."
      : raw ?? "Transcript provider quota exceeded. Try again later or paste the transcript.";
  }

  if (code === "INVALID_API_KEY") {
    return "Invalid API key";
  }

  if (code === "PROVIDER_TIMEOUT") {
    return "Provider timeout";
  }

  if (code === "UNSUPPORTED_VIDEO") {
    return "Unsupported video";
  }

  if (code === "REGION_BLOCKED") {
    return "Region blocked";
  }

  if (code === "TRANSCRIPT_UNAVAILABLE") {
    return "Transcript unavailable for this video";
  }

  if (code === "AI_CONFIG_INVALID") {
    return "AI provider authentication failed. Replace NVIDIA_API_KEY with a valid NVIDIA Build API key.";
  }

  if (path.startsWith("/api/ingest")) {
    // Pass through the raw message if available (e.g. specific ingest errors)
    return raw && !looksLikeProviderError(raw)
      ? raw
      : "We could not analyze that source. Try another URL or paste the transcript.";
  }

  if (path.startsWith("/api/generate") || path.startsWith("/api/tone")) {
    return "Content generation is temporarily unavailable. Try again later.";
  }

  if (path.startsWith("/api/schedule") || path.startsWith("/api/scheduled")) {
    return "Could not schedule this post. Check the time and try again.";
  }

  if (raw && !looksLikeProviderError(raw) && response.status < 500) {
    return raw;
  }

  return response.status >= 500
    ? "Something went wrong on our side. Try again in a moment."
    : "Request failed. Check the details and try again.";
}

function providerName(payload: CreditPayload) {
  return payload.provider?.toLowerCase();
}

function getResponsePath(response: Response) {
  try {
    return new URL(response.url).pathname;
  } catch {
    return "";
  }
}

function isPlanLimitCode(code?: string) {
  return Boolean(
    code &&
      [
        "source_not_in_plan",
        "project_limit_reached",
        "platform_not_in_plan",
        "content_limit_reached",
        "scheduling_not_in_plan",
        "schedule_limit_reached",
        "export_not_in_plan",
      ].includes(code),
  );
}

function looksLikeProviderError(message: string) {
  return /nvidia|nim|gemini|google ai|quota|api key|stack|prisma|database|supabase|internal/i.test(message);
}
