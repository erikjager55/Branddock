import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";

const submitTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  category: z.enum([
    "GENERAL",
    "TECHNICAL",
    "BILLING",
    "FEATURE_REQUEST",
    "BUG_REPORT",
  ]),
  description: z.string().min(1).max(5000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().default("MEDIUM"),
  attachmentUrls: z.array(z.string().url()).optional().default([]),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = submitTicketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        subject: parsed.data.subject,
        category: parsed.data.category,
        description: parsed.data.description,
        priority: parsed.data.priority,
        attachmentUrls: parsed.data.attachmentUrls,
        userId: session.user.id,
        workspaceId,
      },
      select: {
        id: true,
        subject: true,
        category: true,
        priority: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error("[POST /api/help/support-ticket]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
