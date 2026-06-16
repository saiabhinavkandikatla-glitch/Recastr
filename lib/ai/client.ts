import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";

let gemini: GoogleGenAI | undefined;

export function getGeminiClient() {
  if (!env.geminiKey) return undefined;
  gemini ??= new GoogleGenAI({ apiKey: env.geminiKey });
  return gemini;
}
