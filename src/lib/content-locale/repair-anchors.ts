import { prisma } from '@/lib/prisma';
import { ensureBrandWithDefaultProfile, resolveInitialLocale, languageForLocale } from './default-profile';
import { invalidateBrandContext } from '@/lib/ai/brand-context';

/**
 * Reparatie van het content-locale-anker op bestaande workspaces (ADR 2026-07-16).
 *
 * Twee kwalen, allebei aangetroffen op prod (2026-07-16):
 *  1. **Geen anker** — `provisionNewUser` maakte geen Brand + isDefault-profiel; alleen
 *     de workspaces-route deed dat. 3 van de 4 prod-workspaces stonden zonder anker, dus
 *     `resolveTargetProfile` gaf `null` en generatie was niet locale-adresseerbaar.
 *     Zelfde klasse als het MediumEnrichment-incident: defaults die alleen de seed zet.
 *  2. **Divergentie** — `Workspace.contentLanguage` en het profiel spraken elkaar tegen
 *     (de pilotklant: `contentLanguage='en'`, profiel `nl-NL`). De generatie volgde het
 *     profiel (Nederlands), de settings-UI toonde `contentLanguage` (English). Eén keer
 *     opslaan zou het profiel stil naar `en-GB` flippen. Het profiel wint (ADR); we
 *     trekken `contentLanguage` bij zodat de UI toont wat de generatie doet.
 *
 * Idempotent: een tweede run doet niets. Raakt nooit een bestaande profiel-locale.
 */


export interface AnchorDiagnosis {
  workspaces: number;
  withAnchor: number;
  missingAnchor: number;
  diverged: Array<{ workspaceId: string; name: string; contentLanguage: string; profileLocale: string }>;
}

/** Read-only telling — muteert niets. */
export async function diagnoseAnchors(): Promise<AnchorDiagnosis> {
  const workspaces = await prisma.workspace.findMany({
    select: {
      id: true,
      name: true,
      contentLanguage: true,
      localeProfiles: { where: { isDefault: true }, select: { locale: true } },
    },
  });

  const diverged: AnchorDiagnosis['diverged'] = [];
  let withAnchor = 0;
  for (const ws of workspaces) {
    const profileLocale = ws.localeProfiles[0]?.locale;
    if (!profileLocale) continue;
    withAnchor++;
    const langFromProfile = languageForLocale(profileLocale);
    if (langFromProfile && langFromProfile !== ws.contentLanguage) {
      diverged.push({
        workspaceId: ws.id,
        name: ws.name,
        contentLanguage: ws.contentLanguage,
        profileLocale,
      });
    }
  }

  return {
    workspaces: workspaces.length,
    withAnchor,
    missingAnchor: workspaces.length - withAnchor,
    diverged,
  };
}

export interface AnchorRepairResult {
  anchorsCreated: number;
  languagesReconciled: number;
  details: string[];
}

/** Maakt ontbrekende ankers + trekt contentLanguage bij naar het profiel. */
export async function repairAnchors(): Promise<AnchorRepairResult> {
  const workspaces = await prisma.workspace.findMany({
    select: {
      id: true,
      name: true,
      contentLanguage: true,
      localeProfiles: { where: { isDefault: true }, select: { locale: true } },
      brandVoiceguide: { select: { contentLocale: true } },
    },
  });

  let anchorsCreated = 0;
  let languagesReconciled = 0;
  const details: string[] = [];

  for (const ws of workspaces) {
    let profileLocale = ws.localeProfiles[0]?.locale;
    let touched = false;

    if (!profileLocale) {
      // Aanmaak-precedentie: voiceguide → contentLanguage → en-GB (ADR 2026-07-16).
      const locale = resolveInitialLocale(ws.brandVoiceguide?.contentLocale, ws.contentLanguage);
      await ensureBrandWithDefaultProfile(prisma, ws.id, locale);
      profileLocale = locale;
      anchorsCreated++;
      touched = true;
      details.push(`anchor: ${ws.name} → ${locale}`);
    }

    // Profiel wint: trek contentLanguage bij zodat de settings-UI niet liegt.
    const langFromProfile = languageForLocale(profileLocale);
    if (langFromProfile && langFromProfile !== ws.contentLanguage) {
      await prisma.workspace.update({
        where: { id: ws.id },
        data: { contentLanguage: langFromProfile },
      });
      languagesReconciled++;
      touched = true;
      details.push(`reconcile: ${ws.name} contentLanguage ${ws.contentLanguage} → ${langFromProfile} (profiel ${profileLocale})`);
    }

    // We schrijven exact de velden die getBrandContext leest (profiel-locale +
    // contentLanguage) en die 5 min gecached staan — zonder invalidatie serveert de
    // generatie na de repair nog minuten de oude taal. De PATCH-route doet dit al;
    // deze POST deed het niet (CLAUDE.md-regel #10).
    if (touched) invalidateBrandContext(ws.id);
  }

  return { anchorsCreated, languagesReconciled, details };
}
