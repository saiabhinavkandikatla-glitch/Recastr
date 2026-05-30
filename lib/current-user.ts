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
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.email) {
    if (canUseDemoUser) return demoUser;
    if (process.env.NODE_ENV !== "production" && !env.requireAuth) return localDevUser;
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    if (canUseDemoUser) return demoUser;
    if (process.env.NODE_ENV !== "production" && !env.requireAuth) return localDevUser;
    return null;
  }

  try {
    const dbUser = await prisma.user.upsert({
      where: { supabaseId: user.id },
      update: {
        email: user.email,
        name: user.user_metadata?.name,
        avatarUrl: user.user_metadata?.avatar_url,
      },
      create: {
        supabaseId: user.id,
        email: user.email,
        name: user.user_metadata?.name,
        avatarUrl: user.user_metadata?.avatar_url,
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
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name,
      plan: normalizePlan(user.user_metadata?.plan),
    };
  }
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
