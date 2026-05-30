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

  await ensureUserRecord(user);
  const record = await prisma.userCredit
    .upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, credits: defaultCreditsForPlan(user.plan) },
    })
    .catch((error: unknown) => {
      if (isLocalDatabaseSetupError(error)) {
        return { credits: 999, used: 0 };
      }
      throw error;
    });
  if (record.credits < amount) throw new CreditExhaustedError(record.credits);
  return record;
}

export async function consumeCredits(user: AuthenticatedUser, amount = 1) {

  await requireCredits(user, amount);
  return prisma.userCredit
    .update({
      where: { userId: user.id },
      data: {
        credits: { decrement: amount },
        used: { increment: amount },
      },
    })
    .catch((error: unknown) => {
      if (isLocalDatabaseSetupError(error)) {
        return { credits: 999, used: 0 };
      }
      throw error;
    });
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
  return 3;
}
