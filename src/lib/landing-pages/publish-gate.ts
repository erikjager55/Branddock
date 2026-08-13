/**
 * Publish-gate (P6, verbeterplan v3) — deterministische merk-/integriteits-
 * checks ín de publish-actie. Marktonderzoek 2026-08-07: Lovable draait een
 * scan op elke publish, maar níemand valideert mérk/anatomie — dit is
 * differentiatie. Bewust zonder AI-calls op dit pad (latency + kosten:
 * F-VAL/vision-judges blijven pre-publish surfaces in Step 2/3); alles
 * hieronder is puur en < 1 ms.
 *
 * Severity-model:
 *  - `blocker`  → publiceren geweigerd (data-integriteit / anti-fabricatie:
 *                 placeholder-copy van de templates mag nooit live).
 *  - `warning`  → user ziet de bevinding en bevestigt expliciet
 *                 ("Toch publiceren") — twee-fasen-flow via dryRun.
 */
import { validatePageDataShape } from './page-data';
import { requiredSectionTypesFor } from './section-edit-tools';
import { evaluatePageQuality } from './page-quality';

export type PublishGateSeverity = 'blocker' | 'warning';

export interface PublishGateFinding {
  severity: PublishGateSeverity;
  /** Stabiele code — de UI vertaalt op code, de message is dev-leesbare context. */
  code:
    | 'invalid-tree'
    | 'unknown-section-types'
    | 'missing-required-section'
    | 'placeholder-copy'
    | 'empty-cta-href'
    | 'missing-hero-image'
    | 'quality-below-threshold';
  message: string;
}

export interface PublishGateResult {
  ok: boolean;
  findings: PublishGateFinding[];
  blockers: number;
  warnings: number;
}

interface GateInput {
  puckData: unknown;
  contentType: string | null | undefined;
  /**
   * True wanneer deze pagina al eens gepubliceerd is. Een republish van een
   * reeds-live pagina mag niet hard stranden op `missing-required-section`:
   * de tree ging ooit (pre-gate of bewust) zo live, en een tekstfix moet
   * altijd uit kunnen — de bevinding degradeert dan naar warning (review
   * 2026-08-13, M3). Placeholder-copy blijft óók dan een blocker.
   */
  hasBeenPublished?: boolean;
}

interface TreeItem {
  type: string;
  props?: Record<string, unknown>;
}

/**
 * Template-fallback-copy heeft een vaste vorm: de waarde begint of eindigt
 * met het woord "placeholder" ('Headline placeholder', 'Pain point
 * placeholder', … — zie template-helpers). Alleen díe vorm is een blocker.
 * Het woord ergens middenin echte klant-copy ("…the input's placeholder
 * text…") is verdacht maar legitiem mogelijk → warning met override, anders
 * is zo'n pagina permanent onpubliceerbaar (review 2026-08-13, M3).
 */
const PLACEHOLDER_EDGE_PATTERN = /^placeholder\b|\bplaceholder$/i;
const PLACEHOLDER_ANYWHERE_PATTERN = /placeholder/i;

/** Verzamel alle string-waarden uit props (genest door arrays/objecten). */
function collectStrings(value: unknown, out: string[], depth = 0): void {
  if (depth > 6 || value == null) return;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) out.push(trimmed);
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectStrings(entry, out, depth + 1);
    return;
  }
  if (typeof value === 'object') {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      collectStrings(entry, out, depth + 1);
    }
  }
}

export function runPublishGate({ puckData, contentType, hasBeenPublished = false }: GateInput): PublishGateResult {
  const findings: PublishGateFinding[] = [];

  const shape = validatePageDataShape(puckData);
  if (!shape.ok) {
    findings.push({
      severity: 'blocker',
      code: 'invalid-tree',
      message: shape.errors.join('; '),
    });
    return summarize(findings);
  }
  if (shape.unknownTypes.length > 0) {
    findings.push({
      severity: 'warning',
      code: 'unknown-section-types',
      message: `Onbekende sectie-types worden niet gerenderd: ${[...new Set(shape.unknownTypes)].join(', ')}`,
    });
  }

  const tree = puckData as { content: TreeItem[] };

  for (const required of requiredSectionTypesFor(contentType)) {
    if (!tree.content.some((item) => item?.type === required)) {
      findings.push({
        // Republish van een reeds-live pagina: warning (met override) i.p.v.
        // hard blok — anders is een tekstfix op een oude tree onmogelijk.
        severity: hasBeenPublished ? 'warning' : 'blocker',
        code: 'missing-required-section',
        message: `Verplichte sectie ontbreekt voor ${contentType}: ${required}`,
      });
    }
  }

  // Anti-fabricatie: template-fallbacks zijn bewust herkenbaar ("… placeholder");
  // die mogen nooit op een klantpagina live (W-spec §2.2 risico-notitie).
  // Edge-vorm (waarde begint/eindigt op "placeholder") = blocker; het woord
  // middenin echte copy = warning met override.
  const strings: string[] = [];
  for (const item of tree.content) collectStrings(item?.props ?? {}, strings);
  const edgeHits = strings.filter((s) => PLACEHOLDER_EDGE_PATTERN.test(s));
  if (edgeHits.length > 0) {
    findings.push({
      severity: 'blocker',
      code: 'placeholder-copy',
      message: `De pagina bevat nog herkenbare template-placeholder-copy (${edgeHits.length} veld(en), bv. "${edgeHits[0].slice(0, 60)}")`,
    });
  } else if (strings.some((s) => PLACEHOLDER_ANYWHERE_PATTERN.test(s))) {
    findings.push({
      severity: 'warning',
      code: 'placeholder-copy',
      message: 'De copy bevat het woord "placeholder" — controleer of dit bewuste klant-copy is',
    });
  }

  // Lege of '#'-CTA's: pagina publiceert wel, maar de conversieknop doet niets.
  const deadHrefs = tree.content.filter((item) => {
    const props = item?.props ?? {};
    return Object.entries(props).some(
      ([key, value]) =>
        /href$/i.test(key) && (value === '' || value === '#'),
    );
  });
  if (deadHrefs.length > 0) {
    findings.push({
      severity: 'warning',
      code: 'empty-cta-href',
      message: `${deadHrefs.length} sectie(s) met lege of '#'-links (${deadHrefs.map((d) => d.type).join(', ')})`,
    });
  }

  const hero = tree.content.find((item) => item?.type === 'BrandHero');
  if (hero) {
    const url = (hero.props ?? {}).heroVisualUrl;
    if (typeof url !== 'string' || url.trim().length === 0) {
      findings.push({
        severity: 'warning',
        code: 'missing-hero-image',
        message: 'De hero heeft geen header-beeld',
      });
    }
  }

  const quality = evaluatePageQuality(tree as never);
  if (quality.score < quality.threshold) {
    findings.push({
      severity: 'warning',
      code: 'quality-below-threshold',
      message: `Paginakwaliteit ${quality.score} ligt onder de drempel ${quality.threshold}`,
    });
  }

  return summarize(findings);
}

function summarize(findings: PublishGateFinding[]): PublishGateResult {
  const blockers = findings.filter((f) => f.severity === 'blocker').length;
  return {
    ok: blockers === 0,
    findings,
    blockers,
    warnings: findings.length - blockers,
  };
}
