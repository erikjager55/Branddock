import { NextRequest, NextResponse } from 'next/server';
import { handleTrainingComplete } from '@/lib/consistent-models/training-pipeline';
import crypto from 'crypto';

/** Verify Astria webhook HMAC signature */
function verifySignature(body: string, signature: string | null): boolean {
  const secret = process.env.ASTRIA_WEBHOOK_SECRET;
  if (!secret) {
    // No secret configured — skip verification (development mode)
    return true;
  }

  if (!signature) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

/**
 * POST /api/consistent-models/webhook
 *
 * Astria calls this endpoint when a tune finishes training.
 * No workspace auth required (server-to-server).
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-astria-signature');

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as {
      tune_id?: number;
      status?: string;
      error?: string;
    };

    if (!body.tune_id) {
      return NextResponse.json(
        { error: 'Missing tune_id' },
        { status: 400 }
      );
    }

    const astriaModelId = String(body.tune_id);
    const success = body.status === 'succeeded';
    const error = body.error ?? undefined;

    await handleTrainingComplete(astriaModelId, success, error);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    // Return 200 to prevent Astria from retrying on application errors
    return NextResponse.json({ ok: true, warning: 'Processed with errors' });
  }
}
