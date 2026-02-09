import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/../auth";
import { z } from "zod";
import { getAIProvider } from "@/lib/ai/provider";

const generateSchema = z.object({
  prompt: z.string().min(1).max(10000),
  type: z.enum(["generate", "improve", "shorten", "expand"]),
  context: z.string().max(20000).optional(),
  provider: z.enum(["openai", "anthropic"]).optional(),
});

const typePrompts: Record<string, string> = {
  generate: "Generate content based on the following brief:",
  improve: "Improve the following content while maintaining its core message. Make it more engaging, clear, and professional:",
  shorten: "Shorten the following content while preserving key points and brand voice. Aim for 50% reduction:",
  expand: "Expand the following content with more detail, examples, and supporting arguments while maintaining brand voice:",
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = generateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { prompt, type, context, provider: providerType } = parsed.data;

    const aiProvider = getAIProvider(providerType);

    const systemPrompt = context
      ? `You are a brand content specialist. Use the following brand context to inform your writing style, tone, and messaging:\n\n${context}\n\nAlways maintain consistency with the brand guidelines above.`
      : "You are a professional content writer. Write clear, engaging content.";

    const fullPrompt = `${typePrompts[type]}\n\n${prompt}`;

    const result = await aiProvider.generateText({
      prompt: fullPrompt,
      systemPrompt,
      maxTokens: type === "shorten" ? 500 : 2000,
      temperature: type === "generate" ? 0.8 : 0.6,
    });

    return NextResponse.json({ text: result, type, provider: providerType || "auto" });
  } catch (error) {
    console.error("Error generating content:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}
