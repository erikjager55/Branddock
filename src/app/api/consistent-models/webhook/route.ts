import { NextRequest, NextResponse } from 'next/server';
import { handleTrainingComplete } from '@/lib/consistent-models/training-pipeline';
import { verifyReplicateWebhook } from '@/lib/integrations/replicate/replicate-client';

/**
 * POST /api/consistent-models/webhook
 *
 * Replicate calls this endpoint when a training finishes.
 * No workspace auth required (server-to-server).
 * Uses svix-standard signature verification.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Verify webhook signature (svix standard headers)
    const isValid = await verifyReplicateWebhook(rawBody, {
      webhookId: request.headers.get('webhook-id'),
      webhookTimestamp: request.headers.get('webhook-timestamp'),
      webhookSignature: request.headers.get('webhook-signature'),
    });

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as {
      id?: string;
      status?: string;
      output?: Record<string, unknown>;
      error?: string | null;
      version?: string;
    };

    if (!body.id) {
      return NextResponse.json(
        { error: 'Missing training id' },
        { status: 400 }
      );
    }

    const success = body.status === 'succeeded';
    const error = body.error ?? undefined;
    const modelVersion = body.version ?? undefined;

    await handleTrainingComplete(body.id, success, error, modelVersion);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    // Return 200 to prevent Replicate from retrying on application errors
    return NextResponse.json({ ok: true, warning: 'Processed with errors' });
  }
}
