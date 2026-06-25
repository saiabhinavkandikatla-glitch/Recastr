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
  role: "member" | "admin" | "owner";
};

const localDevUser: CurrentUser = {
  id: "local-user",
  email: "local@recastr.app",
  name: "Local workspace",
  plan: "PRO",
  role: "owner",
};

const demoUser: CurrentUser = {
  id: "demo-user",
  email: "demo@recastr.app",
  name: "Demo user",
  plan: "PRO",
  role: "owner",
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
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        planExpiresAt: true,
        role: true,
      },
    });

    if (dbUser) {
      return {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name ?? undefined,
        plan: await resolveEffectivePlan(dbUser.id, dbUser.plan, dbUser.planExpiresAt),
        role: normalizeRole(dbUser.role),
      };
    }
  } catch {
    return getAuthUserFallback(authUser);
  }

  try {
    const createdUser = await prisma.user.upsert({
      where: { supabaseId: authUser.id },
      create: {
        supabaseId: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.name,
        avatarUrl: authUser.user_metadata?.avatar_url,
        plan: "free",
        role: "member",
        platforms: [],
      },
      update: {},
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        planExpiresAt: true,
        role: true,
      },
    });

    return {
      id: createdUser.id,
      email: createdUser.email,
      name: createdUser.name ?? undefined,
      plan: await resolveEffectivePlan(createdUser.id, createdUser.plan, createdUser.planExpiresAt),
      role: normalizeRole(createdUser.role),
    };
  } catch {
    return getAuthUserFallback(authUser);
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

async function resolveEffectivePlan(userId: string, value: unknown, expiresAt: Date | null): Promise<Plan> {
  const plan = normalizePlan(value);
  if (plan === "FREE" || !expiresAt || expiresAt.getTime() > Date.now()) return plan;

  await Promise.all([
    prisma.user.update({
      where: { id: userId },
      data: { plan: "free", planExpiresAt: null },
    }),
    prisma.billingSubscription.updateMany({
      where: { userId, status: "active" },
      data: { status: "past_due" },
    }),
  ]).catch(() => undefined);

  return "FREE";
}

function normalizeRole(value: unknown): CurrentUser["role"] {
  const role = String(value ?? "member").toLowerCase();
  if (role === "owner" || role === "admin") return role;
  return "member";
}

function getAuthUserFallback(authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): CurrentUser | null {
  if (!authUser.email) return null;
  return {
    id: authUser.id,
    email: authUser.email,
    name: typeof authUser.user_metadata?.name === "string" ? authUser.user_metadata.name : undefined,
    plan: normalizePlan(authUser.user_metadata?.plan),
    role: normalizeRole(authUser.user_metadata?.role),
  };
}

export async function requireCurrentUser(nextPath = "/dashboard") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}