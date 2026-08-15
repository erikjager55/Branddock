import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { DELIVERABLE_TYPES } from "@/features/campaigns/lib/deliverable-types";

// GET /api/campaigns/wizard/deliverable-types — Return available deliverable types
//
// Afgeleid van de canonieke registry (`deliverable-types.ts`), niet langer een
// eigen hardcoded lijst. Die lijst was uit de pas gelopen en bevatte zes IDs die
// nergens meer bestonden (`blog-article`, `social-post`, `email-newsletter`,
// `video-script`, `presentation`, `brand-guidelines`). Een client die daarop
// vertrouwde kreeg types terug die `createAndGenerateDeliverable` vervolgens
// afkeurt met CONTENT_TYPE_UNKNOWN — een storing die pas bij genereren zichtbaar
// wordt. Gevonden in de e2e-sweep van 2026-08-15.
//
// `hidden`-types blijven eruit: dit endpoint beschrijft wat een gebruiker mag
// kiezen, net als de pickers.
export async function GET() {
  // Statische data, maar gated voor consistentie met de rest van de API —
  // geen reden om onze deliverable-catalogus aan anonieme callers te tonen.
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const types = DELIVERABLE_TYPES.filter((t) => !t.hidden).map((t) => ({
    id: t.id,
    label: t.name,
    category: t.category,
  }));

  return NextResponse.json(types);
}
