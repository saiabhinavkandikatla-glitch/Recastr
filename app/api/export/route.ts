import { getRequestUser } from "@/lib/auth";
import { exportSchema } from "@/lib/ai/schemas";
import { createCsv, createJson, createPdf } from "@/lib/exporters";
import { addRecastrJob, jobNames } from "@/lib/queue/client";
import { trackServerEvent } from "@/lib/analytics";
import { recordUsageEvent } from "@/lib/usage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    const payload = exportSchema.parse(await request.json());
    await recordUsageEvent({
      userId: user.id,
      eventType: "content_exported",
      metadata: payload,
    });
    await trackServerEvent("content_exported", {
      userId: user.id,
      projectId: payload.projectId,
      format: payload.format,
    });

    if (payload.format === "pdf") {
      const pdf = await createPdf(payload.projectId, user.id, payload.contentIds);
      return Response.json({
        format: "pdf",
        base64: pdf.toString("base64"),
      });
    }

    if (payload.format === "csv") {
      return new Response(await createCsv(payload.projectId, user.id, payload.contentIds), {
        headers: { "Content-Type": "text/csv" },
      });
    }

    if (payload.format === "json") {
      return Response.json(JSON.parse(await createJson(payload.projectId, user.id, payload.contentIds)));
    }

    const job = await addRecastrJob(jobNames.exportNotion, {
      projectId: payload.projectId,
    });
    return Response.json({ jobId: job.id });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "export_failed",
        code: "export_failed",
      },
      { status: 500 },
    );
  }
}
