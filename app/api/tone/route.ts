import { NextResponse } from "next/server";
import { SourceSummary } from "@/lib/types";
import { getRequestUser } from "@/lib/auth";
import { toneSchema } from "@/lib/ai/schemas";
import { trackServerEvent } from "@/lib/analytics";
import { creditErrorResponse, requireCredits } from "@/lib/credits";
import { prisma } from "@/lib/prisma/client";
import { getGeminiClient } from "@/lib/ai/client";
import { cleanupPost } from "@/lib/ai/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    await requireCredits(user);
    const payload = toneSchema.parse(await request.json());
    const newTone = payload.newTone ?? payload.toTone ?? payload.tone ?? "casual";
    const blend = payload.blend ?? 80;

    let projectTitle = "";
    let projectTranscript = "";
    let projectSummary: SourceSummary | null = null;
    let platform = "social media";

    if (payload.contentId) {
      const existingContent = await prisma.content.findUnique({
        where: { id: payload.contentId },
        include: { project: true },
      });
      if (existingContent) {
        platform = existingContent.platform;
        if (existingContent.project) {
          projectTitle = existingContent.project.title;
          projectTranscript = existingContent.project.transcript;
          projectSummary = existingContent.project.summary as SourceSummary | null;
        }
      }
    }

    const gemini = getGeminiClient();
    let rewritten = "";
    const isRegen = payload.regenerate === true;

    if (gemini) {
      try {
        let prompt = "";
        if (isRegen) {
          prompt = `You are an expert social media content creator.
Your task is to write a completely new, high-performance social media post for the platform: ${platform}.
The post must be written in the tone: ${newTone}.

Base the post on the following source material from the project "${projectTitle}":
- Summary/Brief: ${JSON.stringify(projectSummary || {})}
- Source Transcript snippet: ${projectTranscript.slice(0, 4000)}

Make sure to choose a completely different hook, structure, and angle than before. Do NOT just repeat the same copy.
Output ONLY the raw content of the new post. Do not include introductory text, explanations, or quotes.`;
        } else {
          prompt = `You are an expert copywriter.
Your task is to rewrite the following social media post to sound more ${newTone} while keeping the core message and platform formatting:

Original Post:
"""
${payload.content}
"""

Tone style guidelines for "${newTone}":
- professional: authoritative, clear, industry-expert, polished, no slang.
- casual: friendly, conversational, approachable, relaxed, everyday language.
- educational: informative, structured, teaching key takeaways, analytical, helpful.
- entertaining: engaging, lively, humorous or high energy, storytelling, catchy.

If available, here is the background context of the project "${projectTitle}":
- Summary/Brief: ${JSON.stringify(projectSummary || {})}

Output ONLY the rewritten raw content of the post. Do not include markdown wraps, quote marks, introductory text, or explanations.`;
        }

        const response = await gemini.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            temperature: isRegen ? 0.85 : 0.6,
          },
        });
        rewritten = cleanupPost(response.text ?? "");
      } catch (geminiError) {
        console.error("Gemini API call failed, falling back to local generator:", geminiError);
        if (isRegen) {
          rewritten = fallbackLocalRegenerate(projectSummary, platform, projectTitle);
        } else {
          rewritten = fallbackLocalRewrite(payload.content, newTone, blend);
        }
      }
    } else {
      if (isRegen) {
        rewritten = fallbackLocalRegenerate(projectSummary, platform, projectTitle);
      } else {
        rewritten = fallbackLocalRewrite(payload.content, newTone, blend);
      }
    }

    await trackServerEvent(payload.regenerate ? "content_generated" : "tone_rewritten", {
      userId: user.id,
      metadata: {
        tone: newTone,
        blend,
        ...(payload.contentId !== undefined ? { contentId: payload.contentId } : {})
      }
    });
    return NextResponse.json({ rewritten, content: rewritten });
  } catch (error) {
    const creditResponse = creditErrorResponse(error);
    if (creditResponse) return creditResponse;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "tone_rewrite_failed",
        code: "tone_rewrite_failed",
      },
      { status: 400 },
    );
  }
}

function fallbackLocalRewrite(content: string, toTone: string, blend: number) {
  const prefix =
    toTone === "witty" || toTone === "entertaining"
      ? "Sharper version:\n\n"
      : toTone === "bold" || toTone === "professional"
        ? "Professional take:\n\n"
        : toTone === "empathetic" || toTone === "casual"
          ? "Friendly version:\n\n"
          : toTone === "educational"
            ? "Educational breakdown:\n\n"
            : "";
  const cleaned = content
    .replace(/In today's fast-paced world,?\s*/gi, "")
    .replace(/In conclusion,?\s*/gi, "")
    .trim();
  const cta =
    blend > 65
      ? "\n\nSave this before your next sprint."
      : "";
  return `${prefix}${cleaned}${cta}`;
}

function fallbackLocalRegenerate(projectSummary: SourceSummary | null, platform: string, projectTitle: string) {
  const hooks = projectSummary?.hooks ?? [];
  const seed = hooks[Math.floor(Math.random() * (hooks.length || 1))] ?? projectTitle;
  const body =
    platform === "TWITTER"
      ? `${seed}\n\nOne simple idea. One clear next step. That is what makes the lesson easy to remember and use.`
      : platform === "LINKEDIN"
        ? `${seed}\n\nI used to overcomplicate this.\n\nThen I realized the best explanation does three things:\n\n1. Names the real problem\n2. Gives people a simple mental model\n3. Ends with one action they can use today\n\nThat is the difference between content people skim and content people save.`
        : `${seed}\n\n-> Name the problem\n-> Give the simple mental model\n-> Show the next step\n\nSave this before your next project.`;
  return body;
}
