import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { parseJsonBody } from "@/lib/api/parse-json-body";

// L8 Zod-sweep (audit 2026-06-26, batch 2): de PATCH kopieerde allowlist-keys
// met ongetypeerde waarden in prisma.update (string-`rating`, arbitraire JSON
// in tags/isFeatured). Zelfde veld-caps als de create-schema in ../route.ts.
const strArray = z.array(z.string().max(200)).max(100);
const updateKnowledgeSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  type: z.string().max(100).optional(),
  author: z.string().max(300).optional(),
  category: z.string().max(200).optional(),
  tags: strArray.optional(),
  difficulty: z.string().max(100).nullish(),
  language: z.string().max(20).optional(),
  url: z.string().max(2000).optional(),
  thumbnail: z.string().max(2000).nullish(),
  rating: z.number().min(0).max(5).optional(),
  status: z.string().max(100).optional(),
  aiSummary: z.string().max(20000).nullish(),
  // De vier list-velden zijn Json?-kolommen: Prisma weigert daar een kale
  // JS-null (vereist Prisma.DbNull) — dus geen .nullish() maar .optional(),
  // anders adverteert het schema een null-contract dat runtime 500't.
  aiKeyTakeaways: strArray.optional(),
  relatedTrends: strArray.optional(),
  relatedPersonas: strArray.optional(),
  relatedAssets: strArray.optional(),
  isFeatured: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

// PATCH /api/knowledge/:id — update resource fields
/**
 * GET /api/knowledge/[id] — één resource inclusief content (de list-route
 * levert bewust geen content mee; detail-consumers zoals de Competitors
 * "Agent analyses"-sectie halen de markdown hier op).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }
    const { id } = await params;
    const resource = await prisma.knowledgeResource.findFirst({ where: { id, workspaceId } });
    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }
    return NextResponse.json({
      resource: {
        id: resource.id,
        title: resource.title,
        description: resource.description,
        category: resource.category,
        content: resource.content,
        aiSummary: resource.aiSummary,
        createdAt: resource.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[GET /api/knowledge/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const { id } = await params;

    const resource = await prisma.knowledgeResource.findFirst({
      where: { id, workspaceId },
    });
    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const parsed = await parseJsonBody(request, updateKnowledgeSchema);
    if (!parsed.ok) return parsed.response;

    // Alleen meegestuurde velden updaten (null blijft betekenisvol als "leegmaken").
    const data = Object.fromEntries(
      Object.entries(parsed.data).filter(([, value]) => value !== undefined),
    );

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await prisma.knowledgeResource.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      description: updated.description,
      type: updated.type,
      author: updated.author,
      category: updated.category,
      tags: (updated.tags as string[]) ?? [],
      difficulty: updated.difficulty,
      language: updated.language,
      url: updated.url,
      thumbnail: updated.thumbnail,
      rating: updated.rating,
      status: updated.status,
      addedBy: updated.addedBy,
      aiSummary: updated.aiSummary,
      aiKeyTakeaways: (updated.aiKeyTakeaways as string[]) ?? null,
      relatedTrends: (updated.relatedTrends as string[]) ?? null,
      relatedPersonas: (updated.relatedPersonas as string[]) ?? null,
      relatedAssets: (updated.relatedAssets as string[]) ?? null,
      isFeatured: updated.isFeatured,
      isFavorite: updated.isFavorite,
      isArchived: updated.isArchived,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[PATCH /api/knowledge/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
