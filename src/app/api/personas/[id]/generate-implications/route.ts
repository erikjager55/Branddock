import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const persona = await prisma.persona.findUnique({
      where: { id, deletedAt: null },
      include: {
        workspace: {
          include: { members: true },
        },
      },
    });

    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    // Check workspace access
    const hasAccess =
      persona.workspace.ownerId === user.id ||
      persona.workspace.members.some((m) => m.userId === user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Stub: return mock strategic implications
    const strategicImplications = [
      {
        category: "Messaging",
        title: "Value-Driven Communication",
        description: `Emphasize ROI and efficiency gains in all messaging targeting ${persona.name}. Lead with data-backed claims and concrete outcomes.`,
        priority: "high",
      },
      {
        category: "Channel Strategy",
        title: "Professional Network Focus",
        description: `Prioritize LinkedIn and industry publications for reaching ${persona.name}. Consider webinars and whitepapers as lead magnets.`,
        priority: "high",
      },
      {
        category: "Content",
        title: "Case Study Development",
        description: `Create detailed case studies showing transformation stories relevant to ${persona.name}'s pain points and goals.`,
        priority: "medium",
      },
      {
        category: "Product",
        title: "Onboarding Optimization",
        description: `Streamline the onboarding experience to demonstrate value within the first session, addressing ${persona.name}'s time constraints.`,
        priority: "medium",
      },
      {
        category: "Brand",
        title: "Trust Building",
        description: `Incorporate social proof, certifications, and security badges prominently to address ${persona.name}'s risk aversion.`,
        priority: "low",
      },
    ];

    // Update persona with generated strategic implications
    await prisma.persona.update({
      where: { id },
      data: {
        strategicImplications: strategicImplications as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      strategicImplications,
    });
  } catch (error) {
    console.error("Error generating strategic implications:", error);
    return NextResponse.json(
      { error: "Failed to generate strategic implications" },
      { status: 500 }
    );
  }
}
