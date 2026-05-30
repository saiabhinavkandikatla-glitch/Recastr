import { z } from "zod";
import { getRequestUser } from "@/lib/auth";
import { createJson } from "@/lib/exporters";

export const runtime = "nodejs";

const exportFileSchema = z.object({
  projectId: z.string(),
  contentIds: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    const payload = exportFileSchema.parse(await request.json());
    return new Response(await createJson(payload.projectId, user.id, payload.contentIds), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="recastr-${payload.projectId}.json"`,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json(
      { error: "json_export_failed", code: "json_export_failed", status: 500 },
      { status: 500 },
    );
  }
}
