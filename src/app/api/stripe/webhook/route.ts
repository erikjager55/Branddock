// =============================================================
// POST /api/stripe/webhook
//
// Receives Stripe webhook events.
// Verifies signature, checks idempotency, dispatches to handlers.
// Must use raw body for signature verification.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe/client";
import { getWebhookSecret } from "@/lib/stripe/config";
import { dispatchWebhookEvent } from "@/lib/stripe/webhook-handlers";

// Next.js 16: disable body parsing for raw access
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const webhookSecret = getWebhookSecret();
  if (!webhookSecret || webhookSecret === "whsec_placeholder") {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // 1. Read raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  // 2. Verify Stripe signature
  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[stripe/webhook] Signature verification failed: ${message}`);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  // 3. Idempotency check — skip already-processed events
  const alreadyProcessed = await prisma.processedStripeEvent.findUnique({
    where: { eventId: event.id },
  });
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, status: "already_processed" });
  }

  // 4. Dispatch to handler
  try {
    const handled = await dispatchWebhookEvent(event);

    // 5. Record event as processed (only after successful handling)
    await prisma.processedStripeEvent.create({
      data: {
        eventId: event.id,
        eventType: event.type,
      },
    });

    return NextResponse.json({
      received: true,
      type: event.type,
      handled,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[stripe/webhook] Error processing event ${event.type} (${event.id}): ${message}`
    );

    // Return 500 so Stripe retries the event
    return NextResponse.json(
      { error: `Webhook handler error: ${message}` },
      { status: 500 }
    );
  }
}
