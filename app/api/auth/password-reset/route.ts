import { z } from "zod";
import { ok } from "@/lib/api-response";
import { checkAuthEndpointRateLimit, normalizeEmail } from "@/lib/security/auth-protection";
import { hashSecurityValue, recordSecurityEvent } from "@/lib/security/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const passwordResetSchema = z.object({
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  const parsed = passwordResetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return ok({ message: "If an account exists, a reset link will be sent." });
  }

  const rateLimit = await checkAuthEndpointRateLimit({
    action: "password_reset",
    email: parsed.data.email,
    request,
  });
  if (!rateLimit.ok) {
    return ok({ message: "If an account exists, a reset link will be sent." });
  }

  const supabase = createSupabaseServerClient();
  const origin = getRequestOrigin(request);
  const createPasswordPath = `/reset-password?mode=change&verified=1&next=${encodeURIComponent(
    "/login?password=updated",
  )}`;
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(createPasswordPath)}`;

  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo }).catch(() => null);
  await recordSecurityEvent({
    action: "auth.password_reset_requested",
    metadata: { identifierHash: hashSecurityValue(normalizeEmail(parsed.data.email)) },
    request,
  });

  return ok({ message: "If an account exists, a reset link will be sent." });
}

function getRequestOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;
  return new URL(request.url).origin;
}
