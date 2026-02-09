import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/../auth";
import { z } from "zod";
import { getAIProvider } from "@/lib/ai/provider";

const analyzeSchema = z.object({
  content: z.string().min(1).max(50000),
  brandContext: z.string().max(20000).optional(),
  provider: z.enum(["openai", "anthropic"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = analyzeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { content, brandContext, provider: providerType } = parsed.data;

    const aiProvider = getAIProvider(providerType);

    const result = await aiProvider.analyzeText(
      content,
      brandContext || "No specific brand context provided. Analyze based on general best practices."
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error analyzing content:", error);
    return NextResponse.json(
      { error: "Failed to analyze content" },
      { status: 500 }
    );
  }
}
