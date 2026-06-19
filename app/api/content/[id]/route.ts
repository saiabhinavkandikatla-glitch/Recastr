import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "@/lib/auth";
import { getPlatformCharacterLimit } from "@/lib/platform-limits";
import { prisma } from "@/lib/prisma/client";
import { updateStoredContent } from "@/lib/projects/store";

export const runtime = "nodejs";

const patchContentSchema = z.object({
  body: z.string().min(1).max(20_000).optional(),
  approved: z.boolean().optional(),
  tone: z.enum(["professional", "casual", "educational", "entertaining"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getRequestUser(request);
    const payload = patchContentSchema.parse(await request.json());

    if (process.env.RECASTR_DEMO_MODE === "true" || isLocalContent(params.id)) {
      const updated = updateStoredContent(params.id, payload);
      return NextResponse.json({ content: updated ?? { id: params.id, ...payload } });
    }

    const existing = await prisma.content.findFirst({
      where: {
        id: params.id,
        project: { userId: user.id },
      },
      select: { id: true, platform: true, body: true, approved: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Content not found", code: "content_not_found", status: 404 },
        { status: 404 },
      );
    }

    const nextBody = payload.body ?? existing.body;
    const limit = getPlatformCharacterLimit(existing.platform);
    if (payload.approved === true && nextBody.length > limit) {
      return NextResponse.json(
        {
          error: `Content exceeds the ${limit} character limit for ${existing.platform}`,
          code: "platform_limit_exceeded",
          status: 422,
        },
        { status: 422 },
      );
    }

    const content = await prisma.content.update({
      where: { id: params.id },
      data: {
        body: payload.body,
        approved: payload.body && payload.body.length > limit && existing.approved ? false : payload.approved,
        tone: payload.tone,
      },
    });

    return NextResponse.json({ content });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "content_update_failed",
        code: "content_update_failed",
        status: 400,
      },
      { status: 400 },
    );
  }
}

function isLocalContent(contentId: string) {
  if (contentId.startsWith("demo-")) return true;
  return process.env.NODE_ENV !== "production" && /^(text|youtube|blog|podcast)-/.test(contentId);
}
