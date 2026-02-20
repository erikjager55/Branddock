import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    // Check feature request exists
    const featureRequest = await prisma.featureRequest.findUnique({
      where: { id },
    });

    if (!featureRequest) {
      return NextResponse.json(
        { error: "Feature request not found" },
        { status: 404 }
      );
    }

    // Toggle vote: if already voted, remove; otherwise add
    const existingVote = await prisma.featureVote.findUnique({
      where: { featureRequestId_userId: { featureRequestId: id, userId } },
    });

    if (existingVote) {
      // Remove vote
      await prisma.featureVote.delete({
        where: { id: existingVote.id },
      });

      const updated = await prisma.featureRequest.update({
        where: { id },
        data: { voteCount: { decrement: 1 } },
        select: { id: true, voteCount: true },
      });

      return NextResponse.json({ ...updated, voted: false });
    } else {
      // Add vote
      await prisma.featureVote.create({
        data: { featureRequestId: id, userId },
      });

      const updated = await prisma.featureRequest.update({
        where: { id },
        data: { voteCount: { increment: 1 } },
        select: { id: true, voteCount: true },
      });

      return NextResponse.json({ ...updated, voted: true });
    }
  } catch (error) {
    console.error("[POST /api/help/feature-requests/[id]/vote]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
