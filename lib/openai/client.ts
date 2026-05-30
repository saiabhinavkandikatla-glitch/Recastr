import OpenAI from "openai";
import { env } from "@/lib/env";

let openai: OpenAI | undefined;

export function getOpenAIClient() {
  if (!env.openaiKey) return undefined;
  openai ??= new OpenAI({ apiKey: env.openaiKey });
  return openai;
}
