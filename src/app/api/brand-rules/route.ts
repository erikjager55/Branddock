import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { listBrandRules } from '@/lib/brand-fidelity/brand-rule-sync';

async function getWorkspaceOrError() {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), workspaceId: null };
  }
  return { error: null, workspaceId };
}

const createBrandRuleSchema = z.object({
  ruleType: z.enum(['FORBIDDEN_WORD', 'REQUIRED_PHRASE', 'STYLE_LIMIT', 'PILLAR_REFERENCE']),
  pattern: z.string().min(1).max(500),
  patternIsRegex: z.boolean().default(false),
  message: z.string().max(500).optional().nullable(),
  severity: z.enum(['info', 'warning', 'error']).default('warning'),
  contentTypeFilter: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const { error, workspaceId } = await getWorkspaceOrError();
    if (error) return error;
    const url = new URL(req.url);
    const activeOnly = url.searchParams.get('activeOnly') === 'true';
    const rules = await listBrandRules(workspaceId, { activeOnly });
    return NextResponse.json({ rules });
  } catch (err) {
    console.error('[GET /api/brand-rules]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error, workspaceId } = await getWorkspaceOrError();
    if (error) return error;
    const body = await req.json();
    const parsed = createBrandRuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Validate regex pattern if marked as regex — fail fast on invalid regex
    if (parsed.data.patternIsRegex) {
      try {
        new RegExp(parsed.data.pattern);
      } catch (regexErr) {
        return NextResponse.json(
          { error: `Invalid regex pattern: ${(regexErr as Error).message}` },
          { status: 400 },
        );
      }
    }

    const rule = await prisma.brandRule.create({
      data: {
        workspaceId,
        ...parsed.data,
        message: parsed.data.message ?? null,
        source: 'manual',
      },
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/brand-rules]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
