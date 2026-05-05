import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { listBrandRules } from '@/lib/brand-fidelity/brand-rule-sync';

const previewSchema = z.object({
  text: z.string().min(1).max(50000),
  /** Optionele individuele rule-test; als afwezig: alle actieve rules tegen text */
  pattern: z.string().min(1).max(500).optional(),
  patternIsRegex: z.boolean().optional(),
});

interface PreviewMatch {
  ruleId?: string;
  pattern: string;
  patternIsRegex: boolean;
  matches: Array<{ value: string; index: number }>;
}

function compilePattern(pattern: string, isRegex: boolean): RegExp {
  if (isRegex) return new RegExp(pattern, 'gi');
  // Escape literal pattern + word boundary
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'gi');
}

function findMatches(text: string, regex: RegExp): Array<{ value: string; index: number }> {
  const out: Array<{ value: string; index: number }> = [];
  for (const m of text.matchAll(regex)) {
    if (m.index === undefined) continue;
    out.push({ value: m[0], index: m.index });
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const parsed = previewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    // Single-pattern preview — test ad-hoc rule before creating it
    if (parsed.data.pattern) {
      const isRegex = parsed.data.patternIsRegex ?? false;
      try {
        const regex = compilePattern(parsed.data.pattern, isRegex);
        const matches = findMatches(parsed.data.text, regex);
        return NextResponse.json({
          singlePattern: {
            pattern: parsed.data.pattern,
            patternIsRegex: isRegex,
            matches,
          } as PreviewMatch,
        });
      } catch (regexErr) {
        return NextResponse.json(
          { error: `Invalid pattern: ${(regexErr as Error).message}` },
          { status: 400 },
        );
      }
    }

    // Workspace-wide preview — run all active rules
    const rules = await listBrandRules(workspaceId, { activeOnly: true });
    const allMatches: PreviewMatch[] = [];
    for (const rule of rules) {
      try {
        const regex = compilePattern(rule.pattern, rule.patternIsRegex);
        const matches = findMatches(parsed.data.text, regex);
        if (matches.length > 0) {
          allMatches.push({
            ruleId: rule.id,
            pattern: rule.pattern,
            patternIsRegex: rule.patternIsRegex,
            matches,
          });
        }
      } catch {
        // Skip invalid regex (shouldn't happen — validated on create)
      }
    }

    return NextResponse.json({
      totalRules: rules.length,
      rulesWithMatches: allMatches.length,
      totalMatches: allMatches.reduce((sum, r) => sum + r.matches.length, 0),
      results: allMatches,
    });
  } catch (err) {
    console.error('[POST /api/brand-rules/preview]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
