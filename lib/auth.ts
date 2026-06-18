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
  role: "member" | "admin" | "owner";
};

const demoUser: AuthenticatedUser = {
  id: "demo-user",
  email: "demo@recastr.app",
  plan: "PRO",
  role: "owner",
};

const localDevUser: AuthenticatedUser = {
  id: "local-user",
  email: "local@recastr.app",
  plan: "PRO",
  role: "owner",
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
    let session;
    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      session = currentSession;
    } catch {
      session = null;
    }

    let user;
    let error;
    try {
      const result = session ? await supabase.auth.getUser() : { data: { user: null }, error: null };
      user = result.data.user;
      error = result.error;
    } catch (authError) {
      user = null;
      error = authError;
    }

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
  let data;
  let error;
  try {
    const result = await supabase.auth.getUser(token);
    data = result.data;
    error = result.error;
  } catch (authError) {
    data = { user: null };
    error = authError;
  }
  if (error || !data.user?.email) {
    throw new Response("Invalid authorization token", { status: 401 });
  }

  return syncAuthenticatedUser(data.user);
}

export async function ensureUserRecord(user: Pick<AuthenticatedUser, "email" | "id" | "plan">) {
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
      const data = {
        email: user.email,
        plan: user.plan.toLowerCase(),
        ...(existing.id !== user.id ? { supabaseId: user.id } : {}),
      };

      return prisma.user.update({
        where: { id: existing.id },
        data,
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
        role: "member",
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
    const email = user.email ?? demoUser.email;
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ supabaseId: user.id }, { email }],
      },
      select: { id: true },
    });

    const dbUser = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            supabaseId: user.id,
            email,
            name: user.user_metadata?.name,
            avatarUrl: user.user_metadata?.avatar_url,
          },
          select: {
            id: true,
            email: true,
            plan: true,
            planExpiresAt: true,
            role: true,
          },
        })
      : await prisma.user.create({
          data: {
            supabaseId: user.id,
            email,
            name: user.user_metadata?.name,
            avatarUrl: user.user_metadata?.avatar_url,
            plan: "free",
            platforms: [],
          },
          select: {
            id: true,
            email: true,
            plan: true,
            planExpiresAt: true,
            role: true,
          },
        });

    return {
      id: dbUser.id,
      email: dbUser.email,
      plan: await resolveEffectivePlan(dbUser.id, dbUser.plan, dbUser.planExpiresAt),
      role: normalizeRole(dbUser.role),
    };
  } catch {
    return {
      id: user.id,
      email: user.email ?? demoUser.email,
      plan: normalizePlan(user.user_metadata?.plan),
      role: normalizeRole(user.user_metadata?.role),
    };
  }
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

function normalizeRole(value: unknown): AuthenticatedUser["role"] {
  const role = String(value ?? "member").toLowerCase();
  if (role === "owner" || role === "admin") return role;
  return "member";
}

export function requireAdmin(user: AuthenticatedUser) {
  if (user.role !== "admin" && user.role !== "owner") {
    throw new Response("Forbidden: Admin access required", { status: 403 });
  }
}

export async function requireOrgAccess(
  user: AuthenticatedUser,
  organizationId: string,
  allowedRoles: ("owner" | "admin" | "editor" | "viewer")[] = ["owner", "admin", "editor", "viewer"]
) {
  if (user.role === "admin" || user.role === "owner") return { role: user.role }; // System admins have global access

  const membership = await prisma.organizationMembership.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: user.id,
      },
    },
    select: { role: true },
  });

  if (!membership) {
    throw new Response("Forbidden: Organization access denied", { status: 403 });
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role as any)) {
    throw new Response("Forbidden: Insufficient organization role", { status: 403 });
  }

  return membership;
}
