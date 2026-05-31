import { POST as createCheckoutOrder } from "@/app/api/razorpay/checkout/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return createCheckoutOrder(request);
}
