import { ensureUserRecord, type AuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { isLocalDatabaseSetupError } from "@/lib/prisma/errors";

export class CreditExhaustedError extends Error {
  constructor(public readonly credits: number) {
    super("Credit exhausted");
    this.name = "CreditExhaustedError";
  }
}

export async function requireCredits(user: AuthenticatedUser, amount = 1) {
  // Bypassing credit system for now
  return { credits: 9999, used: 0 };
}

export async function consumeCredits(user: AuthenticatedUser, amount = 1) {
  // Bypassing credit system for now
  return { credits: 9999, used: 0 };
}

export function creditErrorResponse(error: unknown) {
  if (!(error instanceof CreditExhaustedError)) return null;
  return Response.json(
    {
      error: "Credit Exhausted",
      code: "credit_exhausted",
      credits: error.credits,
      upgradeUrl: "/settings?tab=billing",
    },
    { status: 403 },
  );
}

function defaultCreditsForPlan(plan: AuthenticatedUser["plan"]) {
  if (plan === "AGENCY" || plan === "TEAM") return 250;
  if (plan === "PRO") return 100;
  return 5; // FREE plan: matches project limit
}
