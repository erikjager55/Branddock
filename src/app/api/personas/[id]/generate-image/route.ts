import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";

// POST /api/personas/[id]/generate-image
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    await getServerSession();

    const { id } = await params;

    const persona = await prisma.persona.findFirst({
      where: { id, workspaceId },
    });
    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      // Fallback: DiceBear avatar when no API key configured
      const seed = encodeURIComponent(persona.name);
      const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

      await prisma.persona.update({
        where: { id },
        data: { avatarUrl, avatarSource: "AI_GENERATED" },
      });

      return NextResponse.json({ avatarUrl, provider: "fallback" });
    }

    // Build descriptive prompt from persona demographics
    const promptParts = [
      "A photorealistic professional headshot portrait photo of a person.",
      persona.age ? `Age: approximately ${persona.age}.` : null,
      persona.gender ? `Gender: ${persona.gender}.` : null,
      persona.occupation ? `Profession: ${persona.occupation}.` : null,
      persona.location ? `Based in: ${persona.location}.` : null,
      persona.education ? `Education level: ${persona.education}.` : null,
      "Style: clean professional headshot, soft neutral background, natural studio lighting, high quality, photorealistic.",
      "The photo should look like a real professional LinkedIn profile photo. No text, no watermarks.",
    ]
      .filter(Boolean)
      .join(" ");

    // Gemini 2.0 Flash with image generation
    const model = "gemini-2.0-flash-exp";

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptParts }] }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const error = await geminiResponse.json().catch(() => ({}));
      console.error("[Gemini image generation error]", error);

      // Fallback to DiceBear on API error
      const seed = encodeURIComponent(persona.name);
      const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

      await prisma.persona.update({
        where: { id },
        data: { avatarUrl, avatarSource: "AI_GENERATED" },
      });

      return NextResponse.json({ avatarUrl, provider: "fallback" });
    }

    const geminiData = await geminiResponse.json();

    // Find the image part in the response
    const imagePart = geminiData.candidates?.[0]?.content?.parts?.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (part: any) => part.inlineData?.mimeType?.startsWith("image/")
    );

    if (!imagePart?.inlineData?.data) {
      // No image returned — fall back to DiceBear
      const seed = encodeURIComponent(persona.name);
      const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

      await prisma.persona.update({
        where: { id },
        data: { avatarUrl, avatarSource: "AI_GENERATED" },
      });

      return NextResponse.json({ avatarUrl, provider: "fallback" });
    }

    // Convert base64 to data URI for direct display
    // TODO: Upload to persistent storage (S3/R2/Cloudflare) for production
    const mimeType = imagePart.inlineData.mimeType;
    const base64Data = imagePart.inlineData.data;
    const avatarUrl = `data:${mimeType};base64,${base64Data}`;

    await prisma.persona.update({
      where: { id },
      data: { avatarUrl, avatarSource: "AI_GENERATED" },
    });

    return NextResponse.json({ avatarUrl, provider: "nanobanana" });
  } catch (error) {
    console.error("[POST /api/personas/:id/generate-image]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
