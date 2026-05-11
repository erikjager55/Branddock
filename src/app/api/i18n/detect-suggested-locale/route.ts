// ============================================================
// GET /api/i18n/detect-suggested-locale
//
// Wraps `detectBrandLanguage(workspaceId)` voor de Voice DNA tab UI
// zodat het ContentLocaleField een "Auto-detected: ..." suggestion kan
// tonen. Read-only — geen DB-writes; tolerant voor detection-fail.
// ============================================================

import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { detectBrandLanguage } from '@/lib/i18n/detect-brand-language';

export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace' }, { status: 403 });
    }

    const detection = await detectBrandLanguage(workspaceId);

    return NextResponse.json({
      locale: detection.locale,
      language: detection.language,
      confidence: detection.confidence,
      sourceCount: detection.sourcesUsed.length,
      totalChars: detection.totalChars,
    });
  } catch (error) {
    console.error('[GET /api/i18n/detect-suggested-locale]', error);
    // Graceful degradation: UI mag werken zonder suggestion. Returnt
    // dezelfde shape als low-confidence detection.
    return NextResponse.json({
      locale: null,
      language: null,
      confidence: 'low',
      sourceCount: 0,
      totalChars: 0,
    });
  }
}
