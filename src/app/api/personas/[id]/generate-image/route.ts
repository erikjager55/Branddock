import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { requireUnlocked } from "@/lib/lock-guard";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import { createVersion } from "@/lib/versioning";
import { buildPersonaSnapshot } from "@/lib/snapshot-builders";

// DiceBear PNG fallback — unique per persona, works reliably with next/image
function diceBearUrl(persona: { name: string; age?: string | null; occupation?: string | null; location?: string | null }) {
  const seed = encodeURIComponent(
    `${persona.name}-${persona.age ?? ''}-${persona.occupation ?? ''}-${persona.location ?? ''}`
  );
  return `https://api.dicebear.com/9.x/notionists/png?seed=${seed}&size=256&backgroundColor=b6e3f4,c0aede,d1d4f9&backgroundType=gradientLinear`;
}

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

    const session = await getServerSession();

    const { id } = await params;

    const lockResponse = await requireUnlocked("persona", id);
    if (lockResponse) return lockResponse;

    const persona = await prisma.persona.findFirst({
      where: { id, workspaceId },
    });
    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      const avatarUrl = diceBearUrl(persona);
      await prisma.persona.update({
        where: { id },
        data: { avatarUrl, avatarSource: "AI_GENERATED" },
      });
      return NextResponse.json({ avatarUrl, provider: "fallback" });
    }

    // Build photorealistic prompt from all available persona data
    const promptParts = buildPhotoPrompt(persona);

    // Gemini 2.5 Flash Image — supports responseModalities: IMAGE
    const model = "gemini-2.5-flash-image";

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

      // Fallback to DiceBear on API error (quota exceeded, etc.)
      const avatarUrl = diceBearUrl(persona);
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
      const avatarUrl = diceBearUrl(persona);
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

    // Create AI generation version snapshot
    try {
      const fullPersona = await prisma.persona.findUniqueOrThrow({ where: { id } });
      await createVersion({
        resourceType: 'PERSONA',
        resourceId: id,
        snapshot: buildPersonaSnapshot(fullPersona),
        changeType: 'AI_GENERATED',
        changeNote: 'Avatar image regenerated',
        userId: session?.user?.id ?? 'unknown',
        workspaceId,
      });
    } catch (versionError) {
      console.error('[Image generation snapshot failed]', versionError);
    }

    invalidateCache(cacheKeys.prefixes.personas(workspaceId));

    return NextResponse.json({ avatarUrl, provider: "gemini" });
  } catch (error) {
    console.error("[POST /api/personas/:id/generate-image]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Builds a photorealistic prompt from all available persona data.
 * More filled fields → more specific and better photo.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPhotoPrompt(persona: any): string {
  const parts: string[] = [];

  // Core instruction
  parts.push("Generate a photorealistic professional headshot portrait photograph of a fictional person.");
  parts.push("The photo should look like it was taken with a DSLR camera with an 85mm lens, shallow depth of field, natural lighting, neutral background.");
  parts.push("This is NOT a real person — create a believable fictional individual.");

  // Demographics
  if (persona.age) parts.push(`Age: approximately ${persona.age} years old.`);
  if (persona.gender) parts.push(`Gender: ${persona.gender}.`);
  if (persona.location) {
    parts.push(`This person lives in ${persona.location}. Their appearance should be ethnically appropriate for someone living in this region.`);
  }
  if (persona.occupation) {
    parts.push(`Occupation: ${persona.occupation}. Their clothing and grooming should reflect this profession.`);
  }
  if (persona.education) {
    parts.push(`Education level: ${persona.education}.`);
  }

  // Personality → expression & demeanor
  if (persona.personalityType) {
    const personalityMap: Record<string, string> = {
      'INFP': 'warm, thoughtful, slightly creative expression',
      'INTJ': 'composed, confident, analytical gaze',
      'ENFP': 'bright, enthusiastic, warm smile',
      'ENTJ': 'assertive, determined, professional demeanor',
      'ISFJ': 'kind, approachable, gentle expression',
      'ISTP': 'calm, observant, understated style',
      'ENFJ': 'charismatic, welcoming, engaging smile',
      'INTP': 'contemplative, curious, relaxed posture',
      'ESFP': 'energetic, friendly, lively expression',
      'ESTP': 'confident, bold, direct gaze',
      'ISFP': 'gentle, artistic, serene expression',
      'ESTJ': 'authoritative, organized, poised demeanor',
      'ESFJ': 'warm, sociable, caring expression',
      'ISTJ': 'serious, dependable, steady gaze',
      'INFJ': 'insightful, calm, empathetic expression',
      'ENTP': 'witty, energetic, mischievous smile',
    };
    const appearance = personalityMap[persona.personalityType] || 'approachable, professional';
    parts.push(`Expression and demeanor: ${appearance}.`);
  }

  // Interests → subtle style cues
  const interests = Array.isArray(persona.interests) ? persona.interests : [];
  if (interests.length > 0) {
    parts.push(`This person is interested in ${interests.slice(0, 3).join(', ')} — their style may subtly reflect this.`);
  }

  // Income → styling level
  if (persona.income) {
    const income = persona.income.toLowerCase();
    if (income.includes('150') || income.includes('200') || income.includes('high') || income.includes('executive')) {
      parts.push("Well-dressed, polished appearance suggesting upper-middle-class income.");
    } else if (income.includes('100') || income.includes('upper')) {
      parts.push("Professionally dressed with quality clothing and accessories.");
    } else if (income.includes('50') || income.includes('70') || income.includes('middle')) {
      parts.push("Neatly dressed, professional but not overly formal.");
    }
  }

  // Technical requirements
  parts.push("Square format (1:1 ratio). Sharp focus on the face. Clean, uncluttered background.");
  parts.push("Do NOT include any text, watermarks, or logos in the image.");
  parts.push("The result must be indistinguishable from a real photograph.");

  return parts.join(" ");
}
