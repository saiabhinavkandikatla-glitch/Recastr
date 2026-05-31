import { getRequestUser } from "@/lib/auth";
import { razorpayCheckoutSchema } from "@/lib/ai/schemas";
import { trackServerEvent } from "@/lib/analytics";
import { recordAuditLog } from "@/lib/audit-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const amounts = {
  PRO: {
    monthly: 99900,
    annual: 999000,
  },
  TEAM: {
    monthly: 299900,
    annual: 2999000,
  },
  AGENCY: {
    monthly: 820000,
    annual: 8200000,
  },
} as const;

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    const payload = razorpayCheckoutSchema.parse(await request.json());
    const amount = amounts[payload.plan][payload.interval];
    const key = process.env.RAZORPAY_KEY_ID ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (process.env.RECASTR_DEMO_MODE === "true" || !key || !secret) {
      await trackServerEvent("checkout_started", {
        userId: user.id,
        plan: payload.plan.toLowerCase(),
        metadata: { interval: payload.interval, demo: true },
      });
      return Response.json({
        orderId: `order_demo_${payload.plan.toLowerCase()}_${payload.interval}`,
        amount,
        currency: "INR",
        key: key ?? "rzp_test_demo",
      });
    }

    const { default: Razorpay } = await import("razorpay");
    const razorpay = new Razorpay({ key_id: key, key_secret: secret });
    await trackServerEvent("checkout_started", {
      userId: user.id,
      plan: payload.plan,
      metadata: { interval: payload.interval },
    });
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `${user.id}-${payload.plan}-${payload.interval}-${Date.now()}`,
      notes: {
        userId: user.id,
        plan: payload.plan.toLowerCase(),
        interval: payload.interval,
      },
    });
    await recordAuditLog({
      userId: user.id,
      action: "checkout_order_created",
      entityType: "billing_order",
      entityId: order.id,
      metadata: { plan: payload.plan, interval: payload.interval, amount },
      request,
    });

    return Response.json({
      orderId: order.id,
      amount,
      currency: "INR",
      key,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "checkout_failed",
        code: "checkout_failed",
      },
      { status: 400 },
    );
  }
}
