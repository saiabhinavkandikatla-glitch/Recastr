import OpenAI from "openai";
import { env } from "@/lib/env";

const DEFAULT_NIM_MODEL = "meta/llama-3.1-70b-instruct";
const DEFAULT_NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";

let nimClient: OpenAI | undefined;

/**
 * Returns the NVIDIA NIM client (using the OpenAI SDK as an HTTP transport).
 * The client is configured to hit the NIM-compatible chat completions endpoint.
 */
export function getNIMClient(): OpenAI | undefined {
  if (!env.nvidiaKey) return undefined;
  nimClient ??= new OpenAI({
    apiKey: env.nvidiaKey,
    baseURL: DEFAULT_NIM_BASE_URL,
  });
  return nimClient;
}

/** Alias kept for backward-compatibility across the codebase. */
export function getAIClient() {
  return getNIMClient();
}

type GenerateAITextOptions = {
  prompt: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  systemInstruction?: string;
};

/**
 * Central text-generation function used by every AI call in Recastr.
 *
 * Sends a chat-completion request to NVIDIA NIM (or any OpenAI-compatible
 * endpoint) and returns the generated text.
 */
export async function generateAIText({
  prompt,
  model,
  temperature,
  maxOutputTokens,
  responseMimeType,
  systemInstruction,
}: GenerateAITextOptions): Promise<string> {
  const client = getNIMClient();
  if (!client) {
    throw new Error("AI API client not configured. Set NVIDIA_API_KEY.");
  }

  const resolvedModel = env.nvidiaModel ?? model ?? DEFAULT_NIM_MODEL;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: prompt });

  const response = await client.chat.completions.create({
    model: resolvedModel,
    messages,
    ...(typeof temperature === "number" ? { temperature } : {}),
    ...(typeof maxOutputTokens === "number"
      ? { max_tokens: maxOutputTokens }
      : {}),
    ...(responseMimeType === "application/json"
      ? { response_format: { type: "json_object" as const } }
      : {}),
  });

  return (response.choices[0]?.message?.content ?? "").trim();
}

export function getConfiguredAIModel() {
  return env.nvidiaModel ?? DEFAULT_NIM_MODEL;
}
