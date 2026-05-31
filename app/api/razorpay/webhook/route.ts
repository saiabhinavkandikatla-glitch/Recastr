import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const webhookSchema = z.object({
  event: z.string().optional(),
  payload: z
    .object({
      payment: z
        .object({
          entity: z
            .object({
              notes: z
                .object({
                  userId: z.string().optional(),
                  plan: z.enum(["PRO", "TEAM", "AGENCY", "pro", "team", "agency"]).optional(),
                })
                .optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature") ?? "";
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? process.env.RAZORPAY_KEY_SECRET;

    if (!secret || !verifySignature(body, signature, secret)) {
      return Response.json(
        { error: "signature_mismatch", code: "signature_mismatch" },
        { status: 400 },
      );
    }

    const event = webhookSchema.parse(JSON.parse(body));
    if (event.event === "payment.captured" && process.env.RECASTR_DEMO_MODE === "true") {
      return Response.json({ received: true, demo: true });
    }

    const notes = event.payload?.payment?.entity?.notes;
    if (event.event === "payment.captured" && notes?.userId && notes.plan) {
      await prisma.user.update({
        where: { id: notes.userId },
        data: { plan: notes.plan.toLowerCase() },
      });
    }

    return Response.json({ received: true });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "webhook_failed",
        code: "webhook_failed",
      },
      { status: 500 },
    );
  }
}

function verifySignature(body: string, signature: string, secret: string) {
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  if (!signature || signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ""));
}
