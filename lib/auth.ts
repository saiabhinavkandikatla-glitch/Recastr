import { createClient, type User as SupabaseAuthUser } from "@supabase/supabase-js";
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
  const demoMode = process.env.RECASTR_DEMO_MODE === "true";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (demoMode || !supabaseUrl || !supabaseAnonKey) return demoUser;

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!error && user?.email) {
      return syncAuthenticatedUser(user);
    }

    if (process.env.REQUIRE_AUTH !== "true") return localDevUser;
    throw new Response("Missing authorization token", { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) {
    throw new Response("Invalid authorization token", { status: 401 });
  }

  return syncAuthenticatedUser(data.user);
}

export async function ensureUserRecord(user: AuthenticatedUser) {
  return prisma.user
    .upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        plan: user.plan.toLowerCase(),
      },
      create: {
        id: user.id,
        supabaseId: user.id,
        email: user.email,
        plan: user.plan.toLowerCase(),
        platforms: [],
      },
      select: { id: true },
    })
    .catch((error: unknown) => {
      if (isLocalDatabaseSetupError(error)) return { id: user.id };
      throw error;
    });
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
