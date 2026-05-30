import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import sanitizeHtml from "sanitize-html";
import { nanoid } from "nanoid";
import { ensureUserRecord, getRequestUser } from "@/lib/auth";
import { ingestTextSchema } from "@/lib/ai/schemas";
import { apiError } from "@/lib/api/response";
import { consumeCredits, creditErrorResponse, requireCredits } from "@/lib/credits";
import { summarizeTranscript } from "@/lib/ai/service";
import { prisma } from "@/lib/prisma/client";
import { getStoredProject } from "@/lib/projects/store";
import { addRecastrJob, jobNames } from "@/lib/queue/client";
import { assertIngestRateLimit } from "@/lib/rate-limit";
import type { SourceSummary } from "@/lib/types";

export const runtime = "nodejs";

const defaultSummary: SourceSummary = {
  tldr: "A pasted source is ready for hook extraction and platform-native content.",
  takeaways: [
    "Start with the clearest promise in the source.",
    "Turn the best lesson into multiple platform-native angles.",
    "Keep each output specific to the audience and format.",
  ],
  hooks: [
    "One source can become a complete content system.",
    "The best post is usually hiding in the strongest tension point.",
    "Repurpose the idea, not the exact wording.",
  ],
  detectedTone: "educational",
  topics: ["content repurposing", "creator workflow"],
  targetAudience: "Founders, creators, and content teams",
};

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    await assertIngestRateLimit(user.id);
    await requireCredits(user);

    if (process.env.RECASTR_DEMO_MODE === "true") {
      const project = getStoredProject("demo-founder-podcast")!;
      await consumeCredits(user);
      return NextResponse.json({
        projectId: project.id,
        title: project.title,
        duration: 0,
        wordCount: project.wordCount ?? project.transcript.split(/\s+/).length,
        project,
      });
    }

    const payload = await parseTextPayload(request);
    const cleanText = sanitizeHtml(payload.text, {
      allowedTags: [],
      allowedAttributes: {},
    })
      .replace(/\s+/g, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 16_000)
      .join(" ");
    const summary = cleanText.length > 100 ? await summarizeTranscript(cleanText) : defaultSummary;
    const title = payload.title ?? `Imported source ${nanoid(5)}`;
    await ensureUserRecord(user);
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        title,
        sourceType: "text",
        sourceText: cleanText,
        transcript: cleanText,
        summary: summary as Prisma.InputJsonValue,
        wordCount: cleanText.split(/\s+/).filter(Boolean).length,
        hooks: {
          create: summary.hooks.slice(0, 5).map((hook, index) => ({
            text: hook,
            hookType: index % 2 === 0 ? "Curiosity gap" : "Story",
            reachScore: 86 - index * 4,
          })),
        },
      },
    });
    await addRecastrJob(jobNames.extractHooks, { projectId: project.id, userId: user.id });
    await consumeCredits(user);

    return NextResponse.json({
      projectId: project.id,
      title: project.title,
      duration: 0,
      wordCount: project.wordCount ?? 0,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const creditResponse = creditErrorResponse(error);
    if (creditResponse) return creditResponse;
    return apiError(error, "text_ingest_failed", 400);
  }
}

async function parseTextPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    const text =
      typeof form.get("text") === "string"
        ? String(form.get("text"))
        : file instanceof File
          ? await file.text()
          : "";
    return ingestTextSchema.parse({
      title: typeof form.get("title") === "string" ? String(form.get("title")) : undefined,
      text,
    }) as { title?: string; text: string };
  }

  return ingestTextSchema.parse(await request.json()) as { title?: string; text: string };
}
