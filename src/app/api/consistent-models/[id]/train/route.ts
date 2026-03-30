import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId, requireAuth } from '@/lib/auth-server';
import { isAstriaConfigured } from '@/lib/integrations/astria/astria-client';
import { startTraining } from '@/lib/consistent-models/training-pipeline';
import { z } from 'zod';

type RouteContext = { params: Promise<{ id: string }> };

const trainSchema = z.object({
  trainingConfig: z.object({
    steps: z.number().int().min(100).max(4000).optional(),
    learningRate: z.number().min(0.00001).max(0.01).optional(),
    resolution: z.number().int().min(512).max(1536).optional(),
  }).optional(),
});

/** POST /api/consistent-models/:id/train — Start fine-tuning */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 });
    }

    if (!isAstriaConfigured()) {
      return NextResponse.json(
        { error: 'Astria API key not configured. Add ASTRIA_API_KEY to enable training.' },
        { status: 503 }
      );
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const parsed = trainSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    // Build webhook callback URL
    const origin = request.headers.get('origin') ?? process.env.BETTER_AUTH_URL ?? '';
    const callbackUrl = `${origin}/api/consistent-models/webhook`;

    const result = await startTraining(id, workspaceId, callbackUrl);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('POST /api/consistent-models/:id/train error:', error);

    // Return 400 for business logic errors
    if (message.includes('Cannot start') || message.includes('Need at least') || message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
