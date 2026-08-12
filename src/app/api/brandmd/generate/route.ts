// =============================================================
// POST /api/brandmd/generate — de gratis brand.md-generator
//
// Anoniem (geen account, touchpoints v2 gate-architectuur): URL in →
// scan → draft-profiel geborgd (GeneratedBrandProfile, TTL ~90d) →
// bestand + Brand Score + claim-token terug. Het claim-token gaat
// alleen naar de aanvrager (response/bestand/e-mail) — drafts zijn
// nooit publiek opsombaar.
//
// Rate-limits per IP-hash én per doeldomein (kostenparagraaf
// 2026-08-03); credit-vrij per pricing-ADR (geen metering).
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { parseJsonBody } from '@/lib/api/parse-json-body';
import { scanWebsiteForBrandMd, draftPayloadToModel, normalizeDomain } from '@/lib/brandmd/scan';
import { computeBrandScore } from '@/lib/brandmd/score';
import { emitBrandMd, countValidation } from '@/lib/export/design-system/emitters/brandmd';
import {
  DRAFT_TTL_DAYS,
  DRAFT_PAYLOAD_VERSION,
  GENERATOR_MAX_RUNS_PER_IP_PER_DAY,
  GENERATOR_MAX_RUNS_PER_DOMAIN_PER_DAY,
  appBaseUrl,
  claimUrl,
  BRAND_MD_USE_HUB_PATH,
} from '@/lib/brandmd/constants';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const bodySchema = z.object({
  url: z.string().min(4).max(500),
  email: z.string().email().max(200).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, bodySchema);
    if (!parsed.ok) return parsed.response;

    let domain: string;
    try {
      const normalized = parsed.data.url.startsWith('http')
        ? parsed.data.url
        : `https://${parsed.data.url}`;
      domain = normalizeDomain(normalized);
      if (!domain.includes('.')) throw new Error('no tld');
    } catch {
      return NextResponse.json({ error: 'Please enter a valid website URL' }, { status: 400 });
    }

    const ipHash = hashIp(request);
    const limited = await enforceRateLimits(ipHash, domain);
    if (limited) return limited;

    const payload = await scanWebsiteForBrandMd(parsed.data.url);

    // Token vóór render: de claim-URL hoort ín het bestand (provenance).
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = sha256(rawToken);
    const claim = claimUrl(rawToken);

    const model = draftPayloadToModel(payload, claim);
    const score = computeBrandScore(model);
    const base = appBaseUrl();
    const file = emitBrandMd(model, {
      profile: 'public',
      useHubUrl: base ? `${base}${BRAND_MD_USE_HUB_PATH}` : undefined,
    });
    const counts = countValidation(model.extensions.brandMd);

    const expiresAt = new Date(Date.now() + DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000);
    const profile = await prisma.generatedBrandProfile.create({
      data: {
        sourceUrl: payload.sourceUrl,
        domain,
        payload: JSON.parse(JSON.stringify(payload)),
        payloadVersion: DRAFT_PAYLOAD_VERSION,
        fileContent: file,
        brandName: payload.name,
        score: score.total,
        scoreBreakdown: JSON.parse(JSON.stringify(score.dimensions)),
        email: parsed.data.email ?? null,
        emailCapturedAt: parsed.data.email ? new Date() : null,
        claimTokenHash: tokenHash,
        requestIpHash: ipHash,
        expiresAt,
      },
      select: { id: true },
    });

    return NextResponse.json({
      id: profile.id,
      token: rawToken,
      brandName: payload.name,
      domain,
      file,
      fileName: `${domain}-brand.md`,
      score: score.total,
      dimensions: score.dimensions,
      validatedSections: counts.validated,
      totalSections: counts.total,
      claimUrl: claim ?? null,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('[POST /api/brandmd/generate]', error);
    const message = error instanceof Error ? error.message : 'Scan failed';
    // safeFetch/SSRF-weigeringen en HTTP-fouten netjes terug naar de UI.
    const isClientish = /HTTP \d|unsafe|blocked|valid|resolve|timeout|abort/i.test(message);
    return NextResponse.json(
      { error: isClientish ? `We couldn't scan that site: ${message}` : 'Scan failed — please try again' },
      { status: isClientish ? 422 : 500 },
    );
  }
}

async function enforceRateLimits(ipHash: string, domain: string): Promise<NextResponse | null> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [byIp, byDomain] = await Promise.all([
    prisma.generatedBrandProfile.count({ where: { requestIpHash: ipHash, createdAt: { gte: since } } }),
    prisma.generatedBrandProfile.count({ where: { domain, createdAt: { gte: since } } }),
  ]);
  if (byIp >= GENERATOR_MAX_RUNS_PER_IP_PER_DAY) {
    return NextResponse.json(
      { error: 'Daily scan limit reached — try again tomorrow', code: 'RATE_LIMIT_IP' },
      { status: 429 },
    );
  }
  if (byDomain >= GENERATOR_MAX_RUNS_PER_DOMAIN_PER_DAY) {
    return NextResponse.json(
      { error: 'This site was scanned a lot today — try again tomorrow', code: 'RATE_LIMIT_DOMAIN' },
      { status: 429 },
    );
  }
  return null;
}

function hashIp(request: NextRequest): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  const salt = process.env.BETTER_AUTH_SECRET ?? 'brandmd';
  return sha256(`${ip}:${salt}`);
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
