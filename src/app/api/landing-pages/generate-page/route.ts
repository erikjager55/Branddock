import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { chargeAfter } from '@/lib/billing/credits/meter-generation';
import { enforceNotLocked } from '@/lib/stripe/enforcement';
import { generatePuckPageCore } from '@/lib/content/headless-webpage';
import { dispatchWebhookEvent } from '@/lib/api/public/webhooks';

/**
 * POST /api/landing-pages/generate-page
 *
 * Free-text prompt → Puck data-tree generator for Phase 6 direct prompt UX.
 * De generatie-kern (Claude FilledFields → template-builder, met heuristic-
 * fallback) is gedeeld met de headless service (`headless-webpage.ts`,
 * P3.2 Fase D3) — deze route houdt sessie-auth, trial-lock en de charge;
 * de client persisteert de puckData zelf (bestaand UI-contract).
 *
 * Body: { deliverableId: string, prompt: string }
 * Returns: { puckData, source: 'ai' | 'heuristic-fallback' }
 */

interface RequestBody {
  deliverableId: string;
  prompt: string;
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.prompt || body.prompt.trim().length < 5) {
    return NextResponse.json(
      { error: 'prompt must be at least 5 characters' },
      { status: 400 },
    );
  }
  if (!body.deliverableId) {
    return NextResponse.json({ error: 'deliverableId required' }, { status: 400 });
  }

  const deliverable = await prisma.deliverable.findUnique({
    where: { id: body.deliverableId },
    select: { id: true, contentType: true, campaign: { select: { id: true, workspaceId: true } } },
  });
  if (!deliverable) {
    return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
  }
  const workspaceId = deliverable.campaign.workspaceId;

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organization: { workspaces: { some: { id: workspaceId } } },
    },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json({ error: 'No access to this workspace' }, { status: 403 });
  }

  // Fase 4: verlopen no-card trial → generatie dicht (read-only-lock).
  const trialLock = await enforceNotLocked(workspaceId);
  if (trialLock) return trialLock;

  const { puckData, source } = await generatePuckPageCore(
    deliverable.id,
    workspaceId,
    deliverable.contentType,
    body.prompt,
  );

  // Credit-afboeking (Fase 2): alleen als de AI de pagina vulde (source 'ai'),
  // niet de heuristic-fallback. Eén moderate content-call → 'short'.
  if (source === 'ai') {
    await chargeAfter({ workspaceId, action: 'short', feature: 'landing-page-generate' }, { count: 1 }).catch(() => {});
  }

  // P3.3 outbound webhook — fire-and-forget, metadata-only. NB: de client
  // persisteert de puckData hierna zelf (bestaand UI-contract); een ontvanger
  // die direct get_deliverable_content doet kan de pagina dus nét missen.
  void dispatchWebhookEvent(workspaceId, 'deliverable.generated', {
    deliverableId: deliverable.id,
    campaignId: deliverable.campaign.id,
    contentType: deliverable.contentType,
    fidelityScore: null,
  });

  return NextResponse.json({ puckData, source });
}
