import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";

let gemini: GoogleGenAI | undefined;

export function getGeminiClient() {
  if (!env.geminiKey) return undefined;
  gemini ??= new GoogleGenAI({ apiKey: env.geminiKey });
  return gemini;
}

type GenerateGeminiTextOptions = {
  prompt: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  systemInstruction?: string;
};

export async function generateGeminiText({
  prompt,
  model = "gemini-2.5-flash",
  temperature,
  maxOutputTokens,
  responseMimeType,
  systemInstruction,
}: GenerateGeminiTextOptions): Promise<string> {
  const geminiClient = getGeminiClient();
  if (!geminiClient) {
    throw new Error("Gemini API client not configured.");
  }

  if (isAuthorizationApiKey()) {
    const interaction = await geminiClient.interactions.create({
      api_version: "v1beta",
      model,
      input: prompt,
      system_instruction: systemInstruction,
      response_mime_type: responseMimeType,
      ...(responseMimeType ? {
        response_format: {
          type: "text",
          mime_type: responseMimeType as any,
        },
      } : {}),
      generation_config: {
        ...(typeof temperature === "number" ? { temperature } : {}),
        ...(typeof maxOutputTokens === "number" ? { max_output_tokens: maxOutputTokens } : {}),
      },
    });

    return extractInteractionText(interaction).trim();
  }

  const response = await geminiClient.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      ...(typeof temperature === "number" ? { temperature } : {}),
      ...(typeof maxOutputTokens === "number" ? { maxOutputTokens } : {}),
      ...(responseMimeType ? { responseMimeType } : {}),
      ...(systemInstruction ? { systemInstruction } : {}),
    },
  });

  return (response.text ?? "").trim();
}

function isAuthorizationApiKey() {
  return env.geminiKey?.startsWith("AQ.") ?? false;
}

function extractInteractionText(interaction: unknown): string {
  const directText = (interaction as { output_text?: unknown })?.output_text;
  if (typeof directText === "string") return directText;

  const steps = (interaction as { steps?: unknown })?.steps;
  if (!Array.isArray(steps)) return "";

  const modelOutputs = steps
    .filter((step): step is { type?: string; content?: unknown } => {
      return Boolean(step && typeof step === "object" && (step as { type?: string }).type === "model_output");
    })
    .flatMap((step) => Array.isArray(step.content) ? step.content : []);

  return modelOutputs
    .map((content) => {
      if (!content || typeof content !== "object") return "";
      const text = (content as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    })
    .filter(Boolean)
    .join("\n");
}
