import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession, resolveWorkspaceId } from "@/lib/auth-server";
import { hashPassword, verifyPassword } from "better-auth/crypto";

// =============================================================
// POST /api/settings/password — Change password
// =============================================================
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify current password against the Account table (Better Auth stores it there)
    const account = await prisma.account.findFirst({
      where: { userId, providerId: "credential" },
    });

    if (account?.password) {
      const isValid = await verifyPassword({
        hash: account.password,
        password: parsed.data.currentPassword,
      });
      if (!isValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 },
        );
      }
    }

    const newHash = await hashPassword(parsed.data.newPassword);
    const now = new Date();

    // Update the Account password (Better Auth credential provider)
    if (account) {
      await prisma.account.update({
        where: { id: account.id },
        data: { password: newHash },
      });
    }

    // Upsert UserPassword record for tracking
    await prisma.userPassword.upsert({
      where: { userId },
      update: {
        passwordHash: newHash,
        lastChangedAt: now,
      },
      create: {
        userId,
        passwordHash: newHash,
        lastChangedAt: now,
      },
    });

    return NextResponse.json({ success: true, lastChangedAt: now });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/settings/password]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
