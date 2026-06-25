import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma/client";
import { err } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";

const createOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
});

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const organizations = await prisma.organization.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { memberships: { some: { userId: user.id } } },
        ],
      },
      include: {
        _count: {
          select: { memberships: true, projects: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(organizations);
  } catch (error) {
    return err(error instanceof Error ? error.message : "Unknown error", "fetch_organizations_failed", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const payload = createOrganizationSchema.parse(await request.json());

    const existing = await prisma.organization.findUnique({
      where: { slug: payload.slug },
    });

    if (existing) {
      return Response.json(
        { error: "Organization slug is already taken", code: "slug_taken" },
        { status: 409 }
      );
    }

    const organization = await prisma.organization.create({
      data: {
        name: payload.name,
        slug: payload.slug,
        ownerId: user.id,
        memberships: {
          create: {
            userId: user.id,
            role: "owner",
          },
        },
      },
    });

    await logAudit({
      userId: user.id,
      organizationId: organization.id,
      action: "ORG_CREATED",
      entityType: "Organization",
      entityId: organization.id,
      metadata: { name: organization.name, slug: organization.slug },
      req: request,
    });

    return Response.json(organization, { status: 201 });
  } catch (error) {
    return err(error instanceof Error ? error.message : "Unknown error", "create_organization_failed", 400);
  }
}
