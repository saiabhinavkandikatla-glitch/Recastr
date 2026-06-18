import { NextResponse } from "next/server";
import { ensureUserRecord, getRequestUser } from "@/lib/auth";
import { ingestYoutube } from "@/lib/ingest";
import { ingestYoutubeSchema } from "@/lib/ai/schemas";
import { trackServerEvent } from "@/lib/analytics";
import { consumeCredits, creditErrorResponse, requireCredits } from "@/lib/credits";
import { assertCanCreateProject, planLimitErrorResponse } from "@/lib/plan-limits";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    await requireCredits(user);
    const payload = ingestYoutubeSchema.parse(await request.json());
    console.log("[api:ingest:youtube] Request url:", payload.url);
    await assertCanCreateProject(user, "YOUTUBE");
    // Ensure a DB user row exists before creating a project row (FK constraint)
    await ensureUserRecord(user);
    const project = await ingestYoutube(payload.url, user.id);
    console.log("[api:ingest:youtube] Success projectId:", project.id, "transcript chars:", project.transcript?.length ?? 0);
    await trackServerEvent("source_ingested", {
      userId: user.id,
      projectId: project.id,
      metadata: { sourceType: "YOUTUBE" },
    });
    await consumeCredits(user);
    return NextResponse.json({
      projectId: project.id,
      title: project.title,
      thumbnailUrl: project.thumbnailUrl,
      transcript: project.transcript,
      summary: project.summary,
      project,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    const planResponse = planLimitErrorResponse(error);
    if (planResponse) return planResponse;
    const creditResponse = creditErrorResponse(error);
    if (creditResponse) return creditResponse;
    console.error("[api:ingest:youtube] Unhandled error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "video_unavailable",
        code: "video_unavailable",
      },
      { status: 400 },
    );
  }
}

