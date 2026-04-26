// =============================================================
// Design System Linter
//
// Lightweight kwaliteits-checks bovenop DesignSystemModel. Deze
// linter reproduceert de kern-regels uit de Google Stitch
// `@google/design.md` alpha-linter zonder externe dependency:
//
// - missing-primary       → primary color MOET aanwezig zijn
// - missing-on-pair       → elke branded kleur heeft WCAG-safe on-*
// - contrast-ratio        → WCAG AA (4.5:1) op paired colors
// - missing-typography    → minimaal 1 heading + 1 body role
// - missing-rounded-scale → minimaal sm/md/lg gedefinieerd
// - missing-spacing-scale → minimaal sm/md/lg gedefinieerd
// - broken-ref            → token-refs ({colors.primary}) die niet resolven
//
// Elk finding heeft severity (error/warning/info) + deep-link source
// zodat de UI naar de juiste tab + modal kan navigeren.
// =============================================================

import type {
  DesignSystemModel,
  SemanticColorRole,
} from './canonical';
import { contrastRatio } from '@/features/brandstyle/utils/color-utils';

export type LintSeverity = 'error' | 'warning' | 'info';

export interface LintFinding {
  rule: string;
  severity: LintSeverity;
  message: string;
  /** Machine-readable bron; UI kan hier op deep-linken (tab + rol). */
  source: {
    tab: 'colors' | 'typography' | 'spacing' | 'visual_system' | 'components' | 'design_system';
    role?: string;
    token?: string;
  };
}

export interface LintReport {
  findings: LintFinding[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  passed: boolean;
}

export function lintDesignSystem(model: DesignSystemModel): LintReport {
  const findings: LintFinding[] = [];

  checkRequiredColors(model, findings);
  checkOnPairContrast(model, findings);
  checkTypography(model, findings);
  checkRoundedScale(model, findings);
  checkSpacingScale(model, findings);
  checkBrokenRefs(model, findings);

  const counts = countSeverity(findings);
  return {
    findings,
    errorCount: counts.error,
    warningCount: counts.warning,
    infoCount: counts.info,
    passed: counts.error === 0,
  };
}

// ─── Rules ────────────────────────────────────────────

function checkRequiredColors(model: DesignSystemModel, findings: LintFinding[]): void {
  const required: SemanticColorRole[] = ['primary', 'on-primary', 'surface', 'on-surface'];
  for (const role of required) {
    if (!model.colors[role]) {
      findings.push({
        rule: role === 'primary' ? 'missing-primary' : 'missing-required-role',
        severity: role === 'primary' ? 'error' : 'warning',
        message: `Required semantic role "${role}" is not resolved.`,
        source: { tab: 'colors', role },
      });
    }
  }
}

function checkOnPairContrast(model: DesignSystemModel, findings: LintFinding[]): void {
  const pairs: Array<[SemanticColorRole, SemanticColorRole]> = [
    ['primary', 'on-primary'],
    ['secondary', 'on-secondary'],
    ['tertiary', 'on-tertiary'],
    ['error', 'on-error'],
    ['surface', 'on-surface'],
  ];
  for (const [bg, fg] of pairs) {
    const bgTok = model.colors[bg];
    const fgTok = model.colors[fg];
    if (!bgTok || !fgTok) continue;
    const ratio = contrastRatio(bgTok.value, fgTok.value);
    if (ratio < 4.5) {
      findings.push({
        rule: 'contrast-ratio',
        severity: 'warning',
        message: `Contrast ratio ${ratio.toFixed(2)}:1 between ${fg} (${fgTok.value}) and ${bg} (${bgTok.value}) fails WCAG AA (needs 4.5:1).`,
        source: { tab: 'colors', role: fg },
      });
    }
  }
}

function checkTypography(model: DesignSystemModel, findings: LintFinding[]): void {
  const roles = Object.keys(model.typography);
  if (roles.length === 0) {
    findings.push({
      rule: 'missing-typography',
      severity: 'warning',
      message: 'No typography roles resolved. At least one heading + one body role is expected.',
      source: { tab: 'typography' },
    });
    return;
  }
  const hasHeadline = roles.some((r) => r.startsWith('headline-'));
  const hasBody = roles.some((r) => r.startsWith('body-'));
  if (!hasHeadline) {
    findings.push({
      rule: 'missing-headline',
      severity: 'info',
      message: 'No headline typography role. Consider defining headline-lg for hero copy.',
      source: { tab: 'typography' },
    });
  }
  if (!hasBody) {
    findings.push({
      rule: 'missing-body',
      severity: 'warning',
      message: 'No body typography role. body-md is required for paragraph copy.',
      source: { tab: 'typography' },
    });
  }
}

function checkRoundedScale(model: DesignSystemModel, findings: LintFinding[]): void {
  const required = ['sm', 'md', 'lg'] as const;
  const missing = required.filter((k) => !model.rounded[k]);
  if (missing.length > 0) {
    findings.push({
      rule: 'incomplete-rounded-scale',
      severity: missing.length >= 2 ? 'warning' : 'info',
      message: `Rounded scale missing: ${missing.join(', ')}. A 3+ step scale is recommended.`,
      source: { tab: 'visual_system' },
    });
  }
}

function checkSpacingScale(model: DesignSystemModel, findings: LintFinding[]): void {
  const required = ['sm', 'md', 'lg'] as const;
  const missing = required.filter((k) => !model.spacing[k]);
  if (missing.length > 0) {
    findings.push({
      rule: 'incomplete-spacing-scale',
      severity: missing.length >= 2 ? 'warning' : 'info',
      message: `Spacing scale missing: ${missing.join(', ')}. Minimum sm/md/lg expected.`,
      source: { tab: 'visual_system' },
    });
  }
}

function checkBrokenRefs(model: DesignSystemModel, findings: LintFinding[]): void {
  // Scan component-token refs {group.role} en verify dat het token bestaat.
  const refRegex = /^\{([^.]+)\.([^}]+)\}$/;
  for (const [variant, tok] of Object.entries(model.components)) {
    for (const [prop, value] of Object.entries(tok.props)) {
      const match = refRegex.exec(value);
      if (!match) continue;
      const [, group, key] = match;
      const exists = tokenExists(model, group, key);
      if (!exists) {
        findings.push({
          rule: 'broken-ref',
          severity: 'warning',
          message: `Component "${variant}.${prop}" references {${group}.${key}} which does not resolve to a defined token.`,
          source: { tab: 'components', token: `${variant}.${prop}` },
        });
      }
    }
  }
}

function tokenExists(model: DesignSystemModel, group: string, key: string): boolean {
  switch (group) {
    case 'colors':
      return Boolean(model.colors[key as SemanticColorRole]);
    case 'typography':
      return key in model.typography;
    case 'rounded':
      return key in model.rounded;
    case 'spacing':
      return key in model.spacing;
    case 'elevation':
      return key in model.elevation;
    default:
      return false;
  }
}

function countSeverity(findings: LintFinding[]): Record<LintSeverity, number> {
  const out: Record<LintSeverity, number> = { error: 0, warning: 0, info: 0 };
  for (const f of findings) out[f.severity]++;
  return out;
}
