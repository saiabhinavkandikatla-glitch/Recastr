export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return Response.json(
    {
      error: "Billing checkout is temporarily disabled.",
      code: "billing_disabled",
    },
    { status: 503 },
  );
}
