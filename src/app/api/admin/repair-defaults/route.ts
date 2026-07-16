// =============================================================
// /api/admin/repair-defaults — idempotente upsert van default-datarijen
// die de seed lokaal vult maar die op prod ontbreken (prod krijgt alleen
// `prisma db push`, nooit een seed). Ontstaan uit het pilot-incident van
// 2026-07-16: lege MediumEnrichment → élke canvas-generatie brak af op
// "No component template resolved".
//
// GET  → telling per dataset (diagnose, muteert niets)
// POST → upsert de defaults; alleen defaults (workspaceId=null), géén deletes
//
// Auth: uitsluitend DEVELOPER_EMAILS (requireDeveloper) — platform-beheer.
// =============================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDeveloper } from '@/lib/developer-access';
import { MEDIUM_ENRICHMENT_DEFAULTS } from '@/lib/seed-data/medium-enrichment';
import { diagnoseAnchors, repairAnchors } from '@/lib/content-locale/repair-anchors';

export async function GET() {
  const session = await requireDeveloper();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [mediumEnrichment, contentLocaleAnchors] = await Promise.all([
    prisma.mediumEnrichment.count({ where: { workspaceId: null } }),
    diagnoseAnchors(),
  ]);
  return NextResponse.json({
    mediumEnrichment: { inDb: mediumEnrichment, expected: MEDIUM_ENRICHMENT_DEFAULTS.length },
    contentLocaleAnchors,
  });
}

export async function POST() {
  const session = await requireDeveloper();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let created = 0;
  let updated = 0;
  for (const me of MEDIUM_ENRICHMENT_DEFAULTS) {
    const existing = await prisma.mediumEnrichment.findFirst({
      where: { platform: me.platform, format: me.format, workspaceId: null },
      select: { id: true },
    });
    const data = {
      specs: me.specs,
      componentTemplate: me.componentTemplate,
      bestPractices: me.bestPractices,
      phaseGuidance: me.phaseGuidance,
      optimalPublishTimes: me.optimalPublishTimes,
      isDefault: true,
    };
    if (existing) {
      await prisma.mediumEnrichment.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.mediumEnrichment.create({
        data: { platform: me.platform, format: me.format, workspaceId: null, ...data },
      });
      created++;
    }
  }

  // Content-locale-ankers (ADR 2026-07-16): zelfde klasse als de MediumEnrichment-drift
  // hierboven — defaults die alleen de seed zet en die op prod dus ontbreken. Maakt
  // ontbrekende Brand + isDefault-profielen aan en trekt een divergerende
  // Workspace.contentLanguage bij naar het profiel (profiel wint). Raakt nooit een
  // bestaande profiel-locale.
  const anchors = await repairAnchors();

  console.log(`[admin/repair-defaults] mediumEnrichment: created=${created} updated=${updated} by ${session.user.email}`);
  if (anchors.details.length > 0) {
    console.log(`[admin/repair-defaults] contentLocaleAnchors: ${anchors.details.join(' | ')}`);
  }
  return NextResponse.json({
    mediumEnrichment: { created, updated },
    contentLocaleAnchors: anchors,
  });
}
