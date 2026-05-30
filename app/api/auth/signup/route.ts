import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ensureUserRecord } from "@/lib/auth";
import { apiError } from "@/lib/api/response";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const signupSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  name: z.string().trim().min(2).max(80).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  try {
    const payload = signupSchema.parse(await request.json());
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return Response.json(
        {
          error: "Server signup is not configured",
          code: "signup_admin_unavailable",
          status: 503,
        },
        { status: 503 },
      );
    }

    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          name: payload.name || payload.email.split("@")[0],
        },
        emailRedirectTo: `${env.appUrl}/auth/callback?next=${encodeURIComponent("/onboarding")}`,
      },
    });

    if (error) {
      const alreadyExists = /already|registered|exists/i.test(error.message);
      return Response.json(
        {
          error: alreadyExists ? "Account already exists. Sign in instead." : error.message,
          code: alreadyExists ? "user_exists" : "signup_failed",
          status: alreadyExists ? 409 : 400,
        },
        { status: alreadyExists ? 409 : 400 },
      );
    }

    if (!data.user?.email) {
      return Response.json(
        {
          error: "Could not create account",
          code: "signup_failed",
          status: 400,
        },
        { status: 400 },
      );
    }

    await ensureUserRecord({
      id: data.user.id,
      email: data.user.email,
      plan: "FREE",
    });

    return Response.json({
      userId: data.user.id,
      email: data.user.email,
      verificationRequired: true,
    });
  } catch (error) {
    return apiError(error, "signup_failed", 400);
  }
}
