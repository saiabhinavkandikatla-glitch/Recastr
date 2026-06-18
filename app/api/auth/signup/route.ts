import { z } from "zod";
import { ensureUserRecord } from "@/lib/auth";
import { err, ok } from "@/lib/api-response";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma/client";
import { checkAuthEndpointRateLimit } from "@/lib/security/auth-protection";
import { recordSecurityEvent } from "@/lib/security/audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const signupSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(2).max(80).optional().or(z.literal("")),
  password: z.string().min(8).max(128),
  next: z.string().optional(),
});

function normalizeNextPath(value: string | undefined | null, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export async function POST(request: Request) {
  try {
    const payload = signupSchema.parse(await request.json());
    const rateLimit = await checkAuthEndpointRateLimit({
      action: "signup",
      email: payload.email,
      request,
    });
    if (!rateLimit.ok) {
      return Response.json(
        { data: null, error: { message: "Too many attempts. Try again later.", code: "rate_limited" } },
        { headers: { "Retry-After": String(rateLimit.retryAfter) }, status: 429 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: payload.email },
      select: { id: true },
    }).catch(() => null);

    if (existingUser) {
      await recordSecurityEvent({
        action: "auth.signup_duplicate_requested",
        request,
      });
      return ok({ verificationRequired: true });
    }

    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return err("Signup is temporarily unavailable.", "signup_admin_unavailable", 503);
    }

    const supabase = createSupabaseServerClient();
    const requestOrigin = getRequestOrigin(request);
    const nextPath = normalizeNextPath(payload.next, "/onboarding");

    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          name: payload.name || payload.email.split("@")[0],
        },
        emailRedirectTo: `${requestOrigin}/auth/callback?source=email&next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (error) {
      return signupErrorResponse(error.message, request);
    }

    if (!data.user?.email) {
      return err("Could not create account. Try again.", "signup_failed", 400);
    }

    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      await recordSecurityEvent({
        action: "auth.signup_duplicate_requested",
        request,
      });
      return ok({ verificationRequired: true });
    }

    await ensureUserRecord({
      id: data.user.id,
      email: data.user.email,
      plan: "FREE",
    });

    await recordSecurityEvent({
      action: "auth.signup_created",
      request,
    });

    return ok({
      verificationRequired: !data.session,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return err("Invalid request", "validation_error", 400);
    return err("Could not create account. Try again.", "signup_failed", 400);
  }
}

function getRequestOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;
  return new URL(request.url).origin || env.appUrl;
}

async function signupErrorResponse(message: string, request: Request) {
  const lower = message.toLowerCase();

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return err("Too many attempts. Try again later.", "email_rate_limited", 429);
  }

  if (lower.includes("already") || lower.includes("registered") || lower.includes("exists")) {
    await recordSecurityEvent({
      action: "auth.signup_duplicate_requested",
      request,
    });
    return ok({ verificationRequired: true });
  }

  if (lower.includes("invalid") && lower.includes("email")) {
    return err("Invalid request", "validation_error", 400);
  }

  return err("Could not create account. Try again.", "signup_failed", 400);
}
