// =============================================================
// Cron endpoint — brand.md lifecycle-mails (touchpoints 2.2 t/m 2.5)
//
// Dagelijks (zie vercel.json). Stuurt hooguit ÉÉN mail per draft per
// run, met een harde cap op het totaal — een cron die per ongeluk een
// hele reeks tegelijk uitstuurt is erger dan een die een dag mist.
//
// Doelgroep-afbakening (bewust smal):
//   - alleen `status DRAFT` + een vastgelegd e-mailadres;
//   - alleen drafts mét `claimTokenEnc`. Dat veld wordt pas gezet vanaf
//     de fase-2-copy, dus élke oudere draft — die de "one-time email"-
//     belofte kreeg — valt automatisch buiten de reeks. Geen backfill,
//     geen uitzonderingslijst: de afwezigheid van het veld ís de grens.
//
// De vensterlogica zit in `@/lib/brandmd/lifecycle` (puur, gesmoket);
// deze route doet alleen kandidaten ophalen, versturen en boekhouden.
// Een stage wordt pas gemarkeerd nádat de verzending slaagde.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth/cron-auth';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/lib/security/token-crypto';
import { trySendTransactional } from '@/lib/email/transactional';
import { renderLifecycleEmail } from '@/lib/email/templates/brandmd-lifecycle';
import { decideLifecycleStage, EXPIRY_NOTICE_DAYS } from '@/lib/brandmd/lifecycle';
import {
  appBaseUrl,
  brandMdDownloadUrl,
  brandMdUnsubscribeUrl,
  claimUrl,
  BRAND_MD_GENERATOR_PATH,
  BRAND_MD_USE_HUB_PATH,
} from '@/lib/brandmd/constants';
import { draftPayloadToModel, type BrandMdDraftPayload } from '@/lib/brandmd/scan';

/** Secties waarvan de BRAND.md een validatiestatus bijhoudt. */
const VALIDATED_SECTION_KEYS = ['strategy', 'voice', 'visual', 'audience', 'products'] as const;

export const dynamic = 'force-dynamic';

/** Maximaal aantal verzendingen per run — kosten- en reputatie-backstop. */
const MAX_SENDS_PER_RUN = 200;
/** Kandidaten die we per run überhaupt bekijken (ruim boven de send-cap). */
const MAX_CANDIDATES = 1000;

const DAY = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const base = appBaseUrl();
  if (!base) {
    // Zonder basis-URL zijn download-/claim-/unsubscribe-links onbouwbaar;
    // een mail zonder werkende links is schadelijker dan geen mail.
    console.error('[cron/brandmd-lifecycle] no app base URL configured — skipping run');
    return NextResponse.json({ error: 'No app base URL configured' }, { status: 500 });
  }

  try {
    const now = new Date();
    const expiryCutoff = new Date(now.getTime() + EXPIRY_NOTICE_DAYS * DAY);

    const candidates = await prisma.generatedBrandProfile.findMany({
      where: {
        status: 'DRAFT',
        email: { not: null },
        claimTokenEnc: { not: null },
        OR: [
          // 2.5-kandidaat: TTL in zicht, ongeacht toestemming.
          { expiresAt: { lte: expiryCutoff } },
          // 2.2-2.4-kandidaat: expliciet opt-in en niet uitgeschreven.
          { lifecycleOptInAt: { not: null }, lifecycleOptOutAt: null },
        ],
      },
      select: {
        id: true,
        domain: true,
        brandName: true,
        email: true,
        score: true,
        createdAt: true,
        expiresAt: true,
        emailCapturedAt: true,
        claimTokenEnc: true,
        payload: true,
        lifecycleOptInAt: true,
        lifecycleOptOutAt: true,
        lifecycleStagesSent: true,
      },
      orderBy: { createdAt: 'asc' },
      take: MAX_CANDIDATES,
    });

    const sentByStage: Record<string, number> = {};
    let sent = 0;
    let failed = 0;
    let silentlyMarked = 0;
    let capReached = false;

    for (const profile of candidates) {
      if (sent >= MAX_SENDS_PER_RUN) {
        capReached = true;
        break;
      }

      const decision = decideLifecycleStage({
        now,
        expiresAt: profile.expiresAt,
        createdAt: profile.createdAt,
        emailCapturedAt: profile.emailCapturedAt,
        lifecycleOptInAt: profile.lifecycleOptInAt,
        lifecycleOptOutAt: profile.lifecycleOptOutAt,
        lifecycleStagesSent: profile.lifecycleStagesSent,
      });

      // Stille markeringen zijn onafhankelijk van het verzendresultaat:
      // ze zeggen "dit venster is gemist", niet "dit is verstuurd".
      const persistSilentMarks = async () => {
        if (decision.silentMarks.length === 0) return;
        await prisma.generatedBrandProfile.update({
          where: { id: profile.id },
          data: { lifecycleStagesSent: { set: decision.stagesSentAfterSilentMarks } },
        });
        silentlyMarked += decision.silentMarks.length;
      };

      if (!decision.stage) {
        await persistSilentMarks();
        continue;
      }

      let rawToken: string | null = null;
      try {
        rawToken = decryptToken(profile.claimTokenEnc);
      } catch (error) {
        console.error(`[cron/brandmd-lifecycle] token decrypt failed for ${profile.id}:`, error);
      }
      const downloadUrl = rawToken ? brandMdDownloadUrl(rawToken) : undefined;
      const unsubscribeUrl = rawToken ? brandMdUnsubscribeUrl(rawToken) : undefined;
      if (!rawToken || !downloadUrl || !unsubscribeUrl || !profile.email) {
        failed += 1;
        await persistSilentMarks();
        continue;
      }

      // Per-merk feiten uit het opgeslagen scan-payload. Zonder deze twee
      // waren 2.2 en 2.4 onderling uitwisselbaar — precies de reden dat de
      // eerste versie van deze reeks generiek aanvoelde (review 2026-08-15).
      // `validation` hangt aan de BrandMd-extensie van het model, niet aan het
      // rauwe payload — `draftPayloadToModel` is puur en goedkoop, dus die
      // mapping is de goedkoopste eerlijke bron.
      const payload = profile.payload as unknown as BrandMdDraftPayload | null;
      let unvalidatedSections: string[] = [];
      let hasVoice = false;
      let inferredPositioning: string | undefined;
      if (payload) {
        try {
          const md = draftPayloadToModel(payload).extensions.brandMd;
          unvalidatedSections = VALIDATED_SECTION_KEYS.filter(
            (k) => md?.validation?.[k]?.status !== 'validated',
          );
          hasVoice = !!md?.voiceDescription;
          // Positionering eerst; promise en tagline als terugval — alle drie
          // per merk verschillend en kort genoeg om te citeren.
          const candidate =
            payload.strategy?.positioning ?? payload.strategy?.promise ?? payload.tagline;
          inferredPositioning =
            candidate && candidate.trim().length > 20 ? candidate.trim() : undefined;
        } catch (error) {
          // Een onverwacht payload-formaat mag de mail niet blokkeren — de
          // template valt terug op de niet-gepersonaliseerde variant.
          console.warn(`[cron/brandmd-lifecycle] payload onbruikbaar voor ${profile.id}:`, error);
        }
      }

      const rendered = renderLifecycleEmail(decision.stage, {
        brandName: profile.brandName,
        domain: profile.domain,
        score: profile.score,
        downloadUrl,
        claimUrl: claimUrl(rawToken),
        generatorUrl: `${base}${BRAND_MD_GENERATOR_PATH}`,
        useHubUrl: `${base}${BRAND_MD_USE_HUB_PATH}`,
        unsubscribeUrl,
        generatedAt: profile.createdAt,
        expiresAt: profile.expiresAt,
        unvalidatedSections,
        hasVoice,
        inferredPositioning,
      });

      const result = await trySendTransactional({
        to: profile.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tags: { flow: 'brandmd-lifecycle', stage: decision.stage, domain: profile.domain },
        // RFC 8058 one-click: alleen op de opt-in-mails. 2.5 is een
        // service-bericht — daar is uitschrijven niet van toepassing.
        ...(decision.stage === '2.5'
          ? {}
          : {
              headers: {
                'List-Unsubscribe': `<${unsubscribeUrl}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
              },
            }),
      });

      if (!result.ok) {
        // Fail-soft: stage NIET markeren, zodat de volgende run het opnieuw
        // probeert zolang het venster open staat.
        console.error(
          `[cron/brandmd-lifecycle] send failed for ${profile.id} (${decision.stage}):`,
          result.error,
        );
        failed += 1;
        await persistSilentMarks();
        continue;
      }

      await prisma.generatedBrandProfile.update({
        where: { id: profile.id },
        data: {
          lifecycleStagesSent: {
            set: [...decision.stagesSentAfterSilentMarks, decision.stage],
          },
        },
      });

      sent += 1;
      silentlyMarked += decision.silentMarks.length;
      sentByStage[decision.stage] = (sentByStage[decision.stage] ?? 0) + 1;
    }

    return NextResponse.json({
      scanned: candidates.length,
      sent,
      failed,
      silentlyMarked,
      sentByStage,
      capReached,
    });
  } catch (error) {
    console.error('[GET /api/cron/brandmd-lifecycle]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
