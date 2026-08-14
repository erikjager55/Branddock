// =============================================================
// Leken-laag: hoofdbevindingen in gewone taal (feedback 2026-08-14)
//
// Deterministisch afgeleid uit het scan-payload — sterk én zwak,
// geen analist-jargon. Gedeeld door de resultaatpagina (generate-
// response) en de rapport-mail (track-route), zodat beide exact
// hetzelfde verhaal vertellen.
// =============================================================

import type { BrandMdDraftPayload } from './scan';

export interface HumanFinding {
  positive: boolean;
  text: string;
}

export function buildHumanFindings(payload: BrandMdDraftPayload): HumanFinding[] {
  const findings: HumanFinding[] = [];

  if (payload.voice.description) {
    findings.push({
      positive: true,
      text: 'Your tone of voice is recognizable — with this file, AI tools can imitate it instead of guessing.',
    });
  } else {
    findings.push({
      positive: false,
      text: "We couldn't pin down a distinctive tone of voice from your site — AI output will sound generic until this is defined.",
    });
  }

  if (payload.colors.length >= 3) {
    findings.push({
      positive: true,
      text: `Your visual identity is detectable: ${payload.colors.length} brand colors${payload.fonts.length ? ` and ${payload.fonts.length} typefaces` : ''} found.`,
    });
  } else {
    findings.push({
      positive: false,
      text: "We couldn't detect a clear color system — AI design tools have nothing to hold on to yet.",
    });
  }

  if (payload.audience.length > 0) {
    findings.push({
      positive: true,
      text: `We found who you're talking to (${payload.audience.map((a) => a.name).join(', ')}) — AI can now write for them, not for everyone.`,
    });
  } else {
    findings.push({
      positive: false,
      text: "Your target audience isn't visible on your site — right now every AI tool is guessing who it's writing for.",
    });
  }

  if (payload.exampleLines?.length) {
    findings.push({
      positive: true,
      text: 'We captured real sentences from your site as voice examples — the strongest signal an AI can copy.',
    });
  } else if (payload.strategy.purpose || payload.strategy.positioning) {
    findings.push({
      positive: true,
      text: 'Your positioning comes through — AI tools will know what you stand for, not just what you sell.',
    });
  }

  return findings.slice(0, 4);
}
