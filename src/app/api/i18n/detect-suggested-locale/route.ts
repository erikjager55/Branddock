// ============================================================
// GET /api/i18n/detect-suggested-locale
//
// Twee onafhankelijke laagjes:
//   1. `detectBrandLanguage(workspaceId)` — heuristische suggestie op basis
//      van brand-content (writing samples / assets).
//   2. `resolveLocaleForBrandWithSource(workspaceId)` — wat F-VAL daadwerkelijk
//      momenteel gebruikt (canonical resolver uit locale-resolver.ts — single
//      source of truth per ADR-3).
//
// Beide blokken hebben hun eigen try/catch zodat een failure in één laag de
// andere niet onbruikbaar maakt. Op resolve-failure returnt `activeLocale`
// = null zodat de UI eerlijk kan zijn ("kon niet bepalen") in plaats van een
// gefabriceerde fallback te tonen.
// ============================================================

import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { detectBrandLanguage } from '@/lib/i18n/detect-brand-language';
import {
  resolveLocaleForBrandWithSource,
  type Locale,
  type LocaleSource,
} from '@/lib/brand-fidelity/heuristics/locale-resolver';

interface DetectSuggestedLocaleResponse {
  locale: Locale | null;
  language: 'nl' | 'en' | 'de' | null;
  confidence: 'high' | 'medium' | 'low';
  sourceCount: number;
  totalChars: number;
  activeLocale: Locale | null;
  activeSource: LocaleSource | null;
}

export async function GET() {
  let workspaceId: string | null;
  try {
    workspaceId = await resolveWorkspaceId();
  } catch (error) {
    console.error('[detect-suggested-locale] resolveWorkspaceId failed', error);
    return NextResponse.json({ error: 'Auth resolution failed' }, { status: 500 });
  }
  if (!workspaceId) {
    return NextResponse.json({ error: 'No workspace' }, { status: 403 });
  }

  const response: DetectSuggestedLocaleResponse = {
    locale: null,
    language: null,
    confidence: 'low',
    sourceCount: 0,
    totalChars: 0,
    activeLocale: null,
    activeSource: null,
  };

  try {
    const detection = await detectBrandLanguage(workspaceId);
    response.locale = detection.locale;
    response.language = detection.language;
    response.confidence = detection.confidence;
    response.sourceCount = detection.sourcesUsed.length;
    response.totalChars = detection.totalChars;
  } catch (error) {
    console.error('[detect-suggested-locale] detection failed', error);
  }

  try {
    const active = await resolveLocaleForBrandWithSource(workspaceId);
    response.activeLocale = active.locale;
    response.activeSource = active.source;
  } catch (error) {
    console.error('[detect-suggested-locale] resolve-active failed', error);
  }

  return NextResponse.json(response);
}
