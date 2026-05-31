import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Plan } from "@/lib/types";

export type CurrentUser = {
  id: string;
  email: string;
  name?: string;
  plan: Plan;
};

const localDevUser: CurrentUser = {
  id: "local-user",
  email: "local@recastr.app",
  name: "Local workspace",
  plan: "PRO",
};

const demoUser: CurrentUser = {
  id: "demo-user",
  email: "demo@recastr.app",
  name: "Demo user",
  plan: "PRO",
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const canUseDemoUser = env.demoMode && !env.requireAuth;

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    if (canUseDemoUser) return demoUser;
    if (process.env.NODE_ENV !== "production" && !env.requireAuth) return localDevUser;
    return null;
  }

  const supabase = createSupabaseServerClient();
  const fallback = getAuthFallback(canUseDemoUser);
  let sessionUserEmail: string | undefined;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    sessionUserEmail = session?.user?.email;
  } catch {
    return fallback;
  }

  if (!sessionUserEmail) {
    return fallback;
  }

  let authUser;
  let authError;
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    authUser = user;
    authError = error;
  } catch {
    return fallback;
  }

  if (authError || !authUser?.email) {
    return fallback;
  }

  try {
    const dbUser = await prisma.user.upsert({
      where: { supabaseId: authUser.id },
      update: {
        email: authUser.email,
        name: authUser.user_metadata?.name,
        avatarUrl: authUser.user_metadata?.avatar_url,
      },
      create: {
        supabaseId: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.name,
        avatarUrl: authUser.user_metadata?.avatar_url,
        plan: "free",
        platforms: [],
      },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
      },
    });

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name ?? undefined,
      plan: normalizePlan(dbUser.plan),
    };
  } catch {
    return {
      id: authUser.id,
      email: authUser.email,
      name: authUser.user_metadata?.name,
      plan: normalizePlan(authUser.user_metadata?.plan),
    };
  }
}

function getAuthFallback(canUseDemoUser: boolean) {
  if (canUseDemoUser) return demoUser;
  if (process.env.NODE_ENV !== "production" && !env.requireAuth) return localDevUser;
  return null;
}

function normalizePlan(value: unknown): Plan {
  const plan = String(value ?? "FREE").toUpperCase();
  if (plan === "PRO" || plan === "TEAM" || plan === "AGENCY") return plan;
  return "FREE";
}

export async function requireCurrentUser(nextPath = "/dashboard") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}
