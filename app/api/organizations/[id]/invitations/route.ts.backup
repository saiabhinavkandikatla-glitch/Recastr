import { z } from "zod";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/current-user";
import { requireOrgAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { err } from "@/lib/api-response";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    await requireOrgAccess(user as any, params.id, ["owner", "admin", "editor", "viewer"]);

    const invitations = await prisma.invitation.findMany({
      where: { organizationId: params.id },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(invitations);
  } catch (error) {
    if (error instanceof Response) return error;
    return err(error instanceof Error ? error.message : "Unknown error", "fetch_invitations_failed", 500);
  }
}

const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "editor", "viewer"]).default("viewer"),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return new Response("Unauthorized", { status: 401 });

    await requireOrgAccess(currentUser as any, params.id, ["owner", "admin"]);

    const payload = createInvitationSchema.parse(await request.json());

    // Check if already a member
    const targetUser = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (targetUser) {
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
    }

    // Check if there's already a pending invite
    const existingInvite = await prisma.invitation.findFirst({
      where: {
        organizationId: params.id,
        email: payload.email,
        acceptedAt: null,
      },
    });

    if (existingInvite) {
      return Response.json(
        { error: "An invitation has already been sent to this email", code: "already_invited" },
        { status: 409 }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    const invitation = await prisma.invitation.create({
      data: {
        organizationId: params.id,
        email: payload.email,
        role: payload.role,
        token,
        expiresAt,
        createdBy: currentUser.id,
      },
    });

    // In a real implementation, we would send an email here using lib/email.ts
    // await sendInvitationEmail(payload.email, token, currentUser.name, organization.name);

    return Response.json(invitation, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return err(error instanceof Error ? error.message : "Unknown error", "create_invitation_failed", 400);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return new Response("Unauthorized", { status: 401 });

    await requireOrgAccess(currentUser as any, params.id, ["owner", "admin"]);

    const url = new URL(request.url);
    const inviteId = url.searchParams.get("inviteId");

    if (!inviteId) {
      return Response.json({ error: "Missing inviteId parameter" }, { status: 400 });
    }

    await prisma.invitation.delete({
      where: { id: inviteId },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof Response) return error;
    return err(error instanceof Error ? error.message : "Unknown error", "delete_invitation_failed", 400);
  }
}
