// =============================================================
// POST /api/stripe/purchase — Create one-time purchase
//
// Creates a Stripe Payment Intent for workshops or research bundles.
// When billing is disabled, the purchase completes instantly (free).
//
// Body: { type: 'research_bundle' | 'workshop', itemId: string, amount: number, description?: string }
// Returns: { clientSecret, paymentIntentId, autoCompleted }
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { createPaymentIntent } from '@/lib/stripe/one-time';
import type { PurchaseType } from '@/lib/stripe/one-time';

const VALID_TYPES: PurchaseType[] = ['research_bundle', 'workshop'];

export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 401 });
    }

    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { type, itemId, amount, description } = body;

    // Validate type
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate itemId
    if (!itemId || typeof itemId !== 'string') {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }

    // Validate amount
    if (typeof amount !== 'number' || amount < 0) {
      return NextResponse.json({ error: 'amount must be a non-negative number' }, { status: 400 });
    }

    const result = await createPaymentIntent({
      workspaceId,
      userId: session.user.id,
      type,
      itemId,
      amountEur: amount,
      description,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? 'Payment creation failed' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      clientSecret: result.clientSecret ?? null,
      paymentIntentId: result.paymentIntentId ?? null,
      autoCompleted: result.autoCompleted ?? false,
    });
  } catch (err) {
    console.error('[POST /api/stripe/purchase] Error:', err);
    return NextResponse.json({ error: 'Failed to create purchase' }, { status: 500 });
  }
}
