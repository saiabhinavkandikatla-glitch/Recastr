import { NextResponse, type NextRequest } from "next/server";
import { ensureUserRecord } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = normalizeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(nextPath)}`, request.url));
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=callback_failed&next=${encodeURIComponent(nextPath)}`, request.url),
    );
  }

  const session = data.session;
  if (session?.user?.id && session.user.email) {
    const existingUser = await prisma.user.findUnique({
      where: { supabaseId: session.user.id },
      select: { id: true },
    });

    if (!existingUser) {
      await ensureUserRecord({
        id: session.user.id,
        email: session.user.email,
        plan: "FREE",
      });
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}

function normalizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}
