import { z } from "zod";
import { err, ok } from "@/lib/api-response";
import { apiError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";

export const runtime = "nodejs";

const profileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  creatorType: z.string().trim().min(1).max(40).optional(),
  defaultTone: z.string().trim().min(1).max(40).optional(),
  platforms: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);

    if (process.env.RECASTR_DEMO_MODE === "true") {
      return ok({
        name: user.email.split("@")[0],
        email: user.email,
        creatorType: "Founder",
        tonePref: "casual",
        platforms: ["Twitter / X", "LinkedIn", "Instagram"],
        avatarUrl: null,
      });
    }

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        email: true,
        creatorType: true,
        tonePref: true,
        platforms: true,
        avatarUrl: true,
      },
    });

    return ok(
      profile ?? {
        name: null,
        email: user.email,
        creatorType: null,
        tonePref: "casual",
        platforms: [],
        avatarUrl: null,
      },
    );
  } catch (error) {
    return apiError(error, "profile_fetch_failed", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getRequestUser(request);
    const payload = profileSchema.parse(await request.json());

    if (process.env.RECASTR_DEMO_MODE === "true") {
      return ok({
        name: payload.name ?? user.email.split("@")[0],
        email: user.email,
        creatorType: payload.creatorType ?? "Founder",
        tonePref: normalizeTone(payload.defaultTone),
        platforms: payload.platforms ?? ["Twitter / X", "LinkedIn", "Instagram"],
        avatarUrl: null,
      });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.creatorType !== undefined ? { creatorType: payload.creatorType } : {}),
        ...(payload.defaultTone !== undefined ? { tonePref: normalizeTone(payload.defaultTone) } : {}),
        ...(payload.platforms !== undefined ? { platforms: payload.platforms } : {}),
      },
      select: {
        name: true,
        email: true,
        creatorType: true,
        tonePref: true,
        platforms: true,
        avatarUrl: true,
      },
    });

    return ok(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return err(error.issues[0]?.message ?? "Invalid profile", "invalid_profile", 400);
    }
    return apiError(error, "profile_update_failed", 500);
  }
}

function normalizeTone(value: string | undefined) {
  return (value ?? "casual").trim().toLowerCase();
}
