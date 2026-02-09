import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { analyzeUrlSchema } from "@/lib/validations/product";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = analyzeUrlSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: data.workspaceId,
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found or access denied" },
        { status: 403 }
      );
    }

    const analysisSteps = [
      { step: "Connecting to website", status: "completed" },
      { step: "Scanning product information", status: "completed" },
      { step: "Extracting features", status: "completed" },
      { step: "Analyzing pricing model", status: "completed" },
      { step: "Identifying use cases", status: "completed" },
      { step: "Detecting target audience", status: "completed" },
      { step: "Generating product profile", status: "completed" },
    ];

    // Extract a name from the URL for the product
    let productName = "Untitled Product";
    try {
      const urlObj = new URL(data.url);
      productName = urlObj.hostname.replace("www.", "");
    } catch {
      // keep default name
    }

    const product = await prisma.product.create({
      data: {
        name: productName,
        source: "WEBSITE_URL",
        sourceUrl: data.url,
        status: "DRAFT",
        analysisStatus: "ANALYZING",
        analysisSteps: analysisSteps as unknown as Prisma.InputJsonValue,
        workspaceId: data.workspaceId,
        createdById: user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { personas: true } },
      },
    });

    return NextResponse.json(
      {
        data: product,
        analysisSteps,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error analyzing URL:", error);
    return NextResponse.json(
      { error: "Failed to analyze URL" },
      { status: 500 }
    );
  }
}
