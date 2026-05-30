import { createClient, type User as SupabaseAuthUser } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma/client";
import { isLocalDatabaseSetupError } from "@/lib/prisma/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Plan } from "@/lib/types";

export type AuthenticatedUser = {
  id: string;
  email: string;
  plan: Plan;
};

const demoUser: AuthenticatedUser = {
  id: "demo-user",
  email: "demo@recastr.app",
  plan: "PRO",
};

const localDevUser: AuthenticatedUser = {
  id: "local-user",
  email: "local@recastr.app",
  plan: "PRO",
};

export async function getRequestUser(request: Request): Promise<AuthenticatedUser> {
  const canUseDemoUser = env.demoMode && !env.requireAuth;

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    if (canUseDemoUser) return demoUser;
    if (process.env.NODE_ENV !== "production" && !env.requireAuth) return localDevUser;
    throw new Response("Supabase auth is not configured", { status: 500 });
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    const supabase = createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const {
      data: { user },
      error,
    } = session ? await supabase.auth.getUser() : { data: { user: null }, error: null };

    if (!error && user?.email) {
      return syncAuthenticatedUser(user);
    }

    if (canUseDemoUser) return demoUser;
    if (!env.requireAuth) return localDevUser;
    throw new Response("Missing authorization token", { status: 401 });
  }

  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) {
    throw new Response("Invalid authorization token", { status: 401 });
  }

  return syncAuthenticatedUser(data.user);
}

export async function ensureUserRecord(user: AuthenticatedUser) {
  try {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { id: user.id },
          { supabaseId: user.id },
          { email: user.email },
        ],
      },
      select: { id: true, supabaseId: true },
    });

    if (existing) {
      return prisma.user.update({
        where: { id: existing.id },
        data: {
          email: user.email,
          plan: user.plan.toLowerCase(),
          ...(existing.supabaseId === user.id ? {} : { supabaseId: existing.supabaseId }),
        },
        select: { id: true },
      });
    }

    return prisma.user.create({
      data: {
        id: user.id,
        supabaseId: user.id,
        email: user.email,
        plan: user.plan.toLowerCase(),
        platforms: [],
      },
      select: { id: true },
    });
  } catch (error) {
    if (isLocalDatabaseSetupError(error)) return { id: user.id };
    throw error;
  }
}

async function syncAuthenticatedUser(user: SupabaseAuthUser): Promise<AuthenticatedUser> {
  try {
    const dbUser = await prisma.user.upsert({
      where: { supabaseId: user.id },
      update: {
        email: user.email ?? demoUser.email,
        name: user.user_metadata?.name,
        avatarUrl: user.user_metadata?.avatar_url,
      },
      create: {
        supabaseId: user.id,
        email: user.email ?? demoUser.email,
        name: user.user_metadata?.name,
        avatarUrl: user.user_metadata?.avatar_url,
        plan: "free",
        platforms: [],
      },
      select: {
        id: true,
        email: true,
        plan: true,
      },
    });

    return {
      id: dbUser.id,
      email: dbUser.email,
      plan: normalizePlan(dbUser.plan),
    };
  } catch {
    return {
      id: user.id,
      email: user.email ?? demoUser.email,
      plan: normalizePlan(user.user_metadata?.plan),
    };
  }
}

function normalizePlan(value: unknown): Plan {
  const plan = String(value ?? "FREE").toUpperCase();
  if (plan === "PRO" || plan === "TEAM" || plan === "AGENCY") return plan;
  return "FREE";
}
