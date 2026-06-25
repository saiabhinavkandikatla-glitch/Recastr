import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { requireOrgAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { err } from "@/lib/api-response";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    await requireOrgAccess(user as any, params.id, ["owner", "admin", "editor", "viewer"]);

    const members = await prisma.organizationMembership.findMany({
      where: { organizationId: params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return Response.json(members);
  } catch (error) {
    if (error instanceof Response) return error;
    return err(error instanceof Error ? error.message : "Unknown error", "fetch_members_failed", 500);
  }
}

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "editor", "viewer"]).default("viewer"),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return new Response("Unauthorized", { status: 401 });

    // Only owners and admins can add members
    await requireOrgAccess(currentUser as any, params.id, ["owner", "admin"]);

    const payload = addMemberSchema.parse(await request.json());

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!targetUser) {
      // Create invitation instead of direct membership if user doesn't exist
      // Since this API is just for adding members directly, we could either error out or create invite.
      // For now, let's error and require they use the invitations API.
      return Response.json(
        { error: "User not found. Use the invitation flow for new users.", code: "user_not_found" },
        { status: 404 }
      );
    }

    const existingMembership = await prisma.organizationMembership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: params.id,
          userId: targetUser.id,
        },
      },
    });

    if (existingMembership) {
      return Response.json(
        { error: "User is already a member of this organization", code: "already_member" },
        { status: 409 }
      );
    }

    const membership = await prisma.organizationMembership.create({
      data: {
        organizationId: params.id,
        userId: targetUser.id,
        role: payload.role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return Response.json(membership, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return err(error instanceof Error ? error.message : "Unknown error", "add_member_failed", 400);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return new Response("Unauthorized", { status: 401 });

    const url = new URL(request.url);
    const userIdToRemove = url.searchParams.get("userId");

    if (!userIdToRemove) {
      return Response.json({ error: "Missing userId parameter" }, { status: 400 });
    }

    // A user can remove themselves (leave), otherwise requires owner/admin
    if (currentUser.id !== userIdToRemove) {
      await requireOrgAccess(currentUser as any, params.id, ["owner", "admin"]);
    } else {
      await requireOrgAccess(currentUser as any, params.id, ["owner", "admin", "editor", "viewer"]);
    }

    // Check if trying to remove the owner
    const org = await prisma.organization.findUnique({
      where: { id: params.id },
      select: { ownerId: true },
    });

    if (org?.ownerId === userIdToRemove) {
      return Response.json({ error: "Cannot remove the organization owner" }, { status: 400 });
    }

    await prisma.organizationMembership.delete({
      where: {
        organizationId_userId: {
          organizationId: params.id,
          userId: userIdToRemove,
        },
      },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof Response) return error;
    return err(error instanceof Error ? error.message : "Unknown error", "remove_member_failed", 400);
  }
}
