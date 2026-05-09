// ============================================================
// POST /api/alignment/review-external — Δ-1 sub-cluster B
//
// Single endpoint voor alle drie review-surfaces (Brand Alignment Tab 3,
// Brand Assistant `review_content` chat-tool, PublishGate uitbreiding).
// Roept de Δ-1 engine `runFidelityForExternalContent` aan na ingest.
//
// Workspace-isolation: resolveWorkspaceId() + Prisma where-clauses afgedwongen
// in de runner. Geen cross-workspace lookups mogelijk.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import {
  runFidelityForExternalContent,
  WorkspaceNotFoundError,
} from '@/lib/brand-fidelity/external-content-runner';
import {
  ingestPaste,
  ingestUrl,
  ingestFile,
  IngestError,
} from '@/lib/alignment/external-content-ingest';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

// ─── Request schema (discriminated union per sourceType) ──

const requestSchema = z.discriminatedUnion('sourceType', [
  z.object({
    sourceType: z.literal('paste'),
    content: z.string().min(1).max(100_000),
    language: z.string().optional(),
    runJudge: z.boolean().optional(),
  }),
  z.object({
    sourceType: z.literal('url'),
    url: z
      .string()
      .url()
      .refine((u) => {
        try {
          return ['http:', 'https:'].includes(new URL(u).protocol);
        } catch {
          return false;
        }
      }, { message: 'Alleen http(s) URLs toegestaan' }),
    language: z.string().optional(),
    runJudge: z.boolean().optional(),
  }),
  z.object({
    sourceType: z.literal('file'),
    fileId: z.string(),
    language: z.string().optional(),
    runJudge: z.boolean().optional(),
  }),
]);

// ─── POST handler ───────────────────────────────────

export async function POST(request: NextRequest) {
  // ── Auth + workspace ──
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'No workspace' }, { status: 403 });
  }

  // ── Validate body ──
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // ── Ingest per source-type ──
  let contentText: string;
  let sourceUrl: string | undefined;
  try {
    if (input.sourceType === 'paste') {
      contentText = ingestPaste(input.content).text;
    } else if (input.sourceType === 'url') {
      const ingest = await ingestUrl(input.url);
      contentText = ingest.text;
      sourceUrl = input.url;
    } else {
      // 'file' — placeholder, throws NOT_SUPPORTED in v1 (returnt `never`).
      ingestFile(input.fileId);
      // Onbereikbaar; alleen voor type-narrowing.
      contentText = '';
    }
  } catch (err) {
    if (err instanceof IngestError) {
      const status =
        err.code === 'NOT_SUPPORTED'
          ? 501
          : err.code === 'BLOCKED_HOST'
            ? 403
            : err.code === 'INVALID_URL'
              ? 400
              : err.code === 'PAYLOAD_TOO_LARGE'
                ? 413
                : err.code === 'TIMEOUT'
                  ? 504
                  : 422;
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status },
      );
    }
    throw err;
  }

  // ── Run F-VAL + persist ──
  try {
    const result = await runFidelityForExternalContent({
      workspaceId,
      contentText,
      sourceType: input.sourceType,
      sourceUrl,
      userId: session.user.id,
      language: input.language,
      runJudge: input.runJudge ?? true,
    });

    invalidateCache(cacheKeys.prefixes.alignment(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({
      reviewLogId: result.reviewLogId,
      compositeScore: result.result.compositeScore,
      thresholdMet: result.result.thresholdMet,
      findingsCount: result.findingsCount,
      durationMs: result.result.elapsedMs,
      scorerVersion: result.result.scorerVersion,
    });
  } catch (err) {
    // Workspace lookup-mismatch (zou theoretisch niet mogen na resolveWorkspaceId,
    // maar guards tegen race waarbij workspace tussentijds verwijderd wordt).
    if (err instanceof WorkspaceNotFoundError) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }
    console.error('[POST /api/alignment/review-external]', err);
    return NextResponse.json(
      { error: 'Review failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
