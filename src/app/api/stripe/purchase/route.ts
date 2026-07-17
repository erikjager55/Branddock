// =============================================================
// POST /api/stripe/purchase — Create one-time purchase
//
// Creates a Stripe Payment Intent for workshops or research bundles.
// When billing is disabled, the purchase completes instantly (free).
//
// Body: { type: 'research_bundle' | 'workshop', itemId: string, description?: string }
// NB: any client-supplied `amount` is IGNORED — the price is derived server-side
// from the catalog/workshop (security-audit 2026-06-26 H3).
// Returns: { clientSecret, paymentIntentId, autoCompleted }
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { parseJsonBody } from '@/lib/api/parse-json-body';
import { createPaymentIntent } from '@/lib/stripe/one-time';

// L8 Zod-sweep (audit 2026-06-26, batch 6): `description` was een vrije,
// ongelimiteerde string die de Stripe-PaymentIntent in ging.
const purchaseSchema = z.object({
  type: z.enum(['research_bundle', 'workshop']),
  itemId: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

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

    const parsed = await parseJsonBody(request, purchaseSchema);
    if (!parsed.ok) return parsed.response;
    const { type, itemId, description } = parsed.data;

    const result = await createPaymentIntent({
      workspaceId,
      userId: session.user.id,
      type,
      itemId,
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
