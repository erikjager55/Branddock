// =============================================================
// Content Validator — Post-generation quality checks
//
// Synchronous, regex-based validator that scans generated content.
// Returns warnings with severity levels. Never blocks saving.
// =============================================================

export interface ValidationWarning {
  check: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  match?: string;
}

export interface ValidationResult {
  warnings: ValidationWarning[];
  passedChecks: string[];
  score: number; // 0-100
}

export interface ValidationContext {
  personaNames: string[];
  competitorNames: string[];
  brandName: string;
  contentType: string;
}

// ─── Check Functions ──────────────────────────────────────

function checkPlaceholders(content: string): ValidationWarning[] {
  const patterns = [
    /€\s*XX/gi,
    /\$\s*XX/gi,
    /\[PRICE\]/gi,
    /\[INSERT[^\]]*\]/gi,
    /\bTBD\b/g,
    /\{[a-zA-Z_]+\}/g, // {variable} template tags
    /\[YOUR[^\]]*\]/gi,
    /\[COMPANY[^\]]*\]/gi,
    /\[PRODUCT[^\]]*\]/gi,
    /\[NAME[^\]]*\]/gi,
    /\[DATE[^\]]*\]/gi,
    /\[NUMBER[^\]]*\]/gi,
    /\[AMOUNT[^\]]*\]/gi,
    /XX%/g,
    /XXX/g,
  ];

  const warnings: ValidationWarning[] = [];
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      for (const match of matches) {
        warnings.push({
          check: 'placeholders',
          severity: 'error',
          message: `Placeholder value found: "${match}"`,
          match,
        });
      }
    }
  }
  return warnings;
}

function checkInternalJargon(content: string): ValidationWarning[] {
  const patterns = [
    /\bQ[1-4]\b/g,
    /\bFY\d{4}\b/gi,
    /\bSKU\b/gi,
    /\bKPI\b/gi,
    /\bCAMP[-_]?\d+/gi, // campaign IDs like CAMP-123
    /\bROI\b/g,
    /\bCPC\b/g,
    /\bCPM\b/g,
    /\bCTR\b/g,
    /\bMQL\b/g,
    /\bSQL\b/g,
    /\bARR\b/g,
    /\bMRR\b/g,
    /\bH[12]\s*\d{4}/gi, // H1 2025, H2 2026
  ];

  const warnings: ValidationWarning[] = [];
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      for (const match of new Set(matches)) {
        warnings.push({
          check: 'internal-jargon',
          severity: 'warning',
          message: `Internal jargon detected: "${match}" — use consumer-friendly language`,
          match,
        });
      }
    }
  }
  return warnings;
}

function checkCompetitorBashing(
  content: string,
  competitorNames: string[],
): ValidationWarning[] {
  if (competitorNames.length === 0) return [];

  const negativePatterns = [
    'unlike',
    'inferior',
    'worse',
    'fails',
    'lacking',
    'outdated',
    'behind',
    'poor',
    'weak',
    'limited',
    'can\'t',
    'doesn\'t',
    'won\'t',
    'never',
  ];

  const warnings: ValidationWarning[] = [];
  const lowerContent = content.toLowerCase();

  for (const competitor of competitorNames) {
    if (!competitor || competitor.length < 2) continue;
    const lowerName = competitor.toLowerCase();
    const nameIndex = lowerContent.indexOf(lowerName);
    if (nameIndex === -1) continue;

    // Check 80-char window around the mention for negative language
    const windowStart = Math.max(0, nameIndex - 40);
    const windowEnd = Math.min(lowerContent.length, nameIndex + lowerName.length + 40);
    const window = lowerContent.slice(windowStart, windowEnd);

    for (const neg of negativePatterns) {
      if (window.includes(neg)) {
        warnings.push({
          check: 'competitor-bashing',
          severity: 'warning',
          message: `Possible negative competitor reference: "${competitor}" near "${neg}"`,
          match: competitor,
        });
        break; // One warning per competitor
      }
    }
  }
  return warnings;
}

function checkVagueClaims(content: string): ValidationWarning[] {
  const patterns = [
    { regex: /\bmany (customers|users|clients|people|businesses)\b/gi, label: 'vague quantity' },
    { regex: /\b(market|industry)[\s-]leading\b/gi, label: 'unsubstantiated claim' },
    { regex: /\b(the )?best[\s-](in[\s-]class|solution|choice|option)\b/gi, label: 'superlative claim' },
    { regex: /\bworld[\s-]?class\b/gi, label: 'unverifiable claim' },
    { regex: /\bnumber[\s-]?one\b/gi, label: 'unsubstantiated ranking' },
    { regex: /\bunmatched\b/gi, label: 'unverifiable claim' },
    { regex: /\bunparalleled\b/gi, label: 'unverifiable claim' },
  ];

  const warnings: ValidationWarning[] = [];
  for (const { regex, label } of patterns) {
    const matches = content.match(regex);
    if (matches) {
      for (const match of new Set(matches)) {
        warnings.push({
          check: 'vague-claims',
          severity: 'info',
          message: `${label}: "${match}" — consider adding specific evidence`,
          match,
        });
      }
    }
  }
  return warnings;
}

function checkPersonaLeak(
  content: string,
  personaNames: string[],
): ValidationWarning[] {
  if (personaNames.length === 0) return [];

  const warnings: ValidationWarning[] = [];
  for (const name of personaNames) {
    if (!name || name.length < 3) continue;
    // Match as a whole word (case-insensitive)
    const regex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (regex.test(content)) {
      warnings.push({
        check: 'persona-leak',
        severity: 'error',
        message: `Persona name "${name}" appears in the content — this is internal data`,
        match: name,
      });
    }
  }
  return warnings;
}

function checkCtaPresence(content: string): ValidationWarning[] {
  // Look for common CTA patterns
  const ctaPatterns = [
    /\b(sign up|register|subscribe|download|buy|order|get started|learn more|contact|try|book|schedule|request|join|apply|start|discover|explore|shop|claim)\b/gi,
    /\bhttps?:\/\/\S+/gi, // URLs
    /\b(click|tap|visit|go to)\b/gi,
  ];

  for (const pattern of ctaPatterns) {
    if (pattern.test(content)) return [];
  }

  return [{
    check: 'cta-presence',
    severity: 'warning',
    message: 'No clear call-to-action detected — consider adding one',
  }];
}

function checkContentLength(content: string, contentType: string): ValidationWarning[] {
  const textLength = content.replace(/<[^>]+>/g, '').trim().length;
  const warnings: ValidationWarning[] = [];

  if (textLength < 50) {
    warnings.push({
      check: 'content-length',
      severity: 'info',
      message: `Content is very short (${textLength} characters) — may need more substance`,
    });
  }

  // Flag excessively long content for short-form types
  const shortFormTypes = [
    'linkedin-post', 'instagram-post', 'twitter-thread', 'facebook-post',
    'tiktok-script', 'search-ad', 'social-ad', 'display-ad', 'sms-message',
  ];
  if (shortFormTypes.includes(contentType) && textLength > 3000) {
    warnings.push({
      check: 'content-length',
      severity: 'info',
      message: `Content seems long (${textLength} chars) for ${contentType} — consider trimming`,
    });
  }

  return warnings;
}

function checkVagueUrgency(content: string): ValidationWarning[] {
  const patterns = [
    { regex: /\blimited[\s-]time\b/gi, label: 'limited time' },
    { regex: /\bact[\s-](now|fast|quickly)\b/gi, label: 'urgency phrase' },
    { regex: /\bhurry\b/gi, label: 'urgency word' },
    { regex: /\bbinnenkort\b/gi, label: 'vague timing (NL)' },
    { regex: /\bsnel\b/gi, label: 'vague timing (NL)' },
    { regex: /\bdon'?t miss\b/gi, label: 'urgency phrase' },
    { regex: /\bbefore it'?s too late\b/gi, label: 'urgency phrase' },
    { regex: /\bwhile (supplies|stocks) last\b/gi, label: 'vague scarcity' },
  ];

  const warnings: ValidationWarning[] = [];

  // Check if there's a concrete date nearby (within 200 chars)
  const hasDate = /\b\d{1,2}[\s/.-]\w+[\s/.-]\d{2,4}\b/.test(content) ||
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i.test(content) ||
    /\b\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(content);

  if (hasDate) return []; // Urgency is backed by a date — OK

  for (const { regex, label } of patterns) {
    const matches = content.match(regex);
    if (matches) {
      for (const match of new Set(matches)) {
        warnings.push({
          check: 'vague-urgency',
          severity: 'warning',
          message: `${label}: "${match}" without a specific deadline — add a date`,
          match,
        });
      }
    }
  }
  return warnings;
}

// ─── Main Validator ───────────────────────────────────────

const ALL_CHECKS = [
  'placeholders',
  'internal-jargon',
  'competitor-bashing',
  'vague-claims',
  'persona-leak',
  'cta-presence',
  'content-length',
  'vague-urgency',
] as const;

export function validateContent(
  content: string,
  context: ValidationContext,
): ValidationResult {
  if (!content || content.trim().length === 0) {
    return { warnings: [], passedChecks: [], score: 100 };
  }

  // Strip HTML tags for text analysis
  const plainText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  const allWarnings: ValidationWarning[] = [
    ...checkPlaceholders(plainText),
    ...checkInternalJargon(plainText),
    ...checkCompetitorBashing(plainText, context.competitorNames),
    ...checkVagueClaims(plainText),
    ...checkPersonaLeak(plainText, context.personaNames),
    ...checkCtaPresence(plainText),
    ...checkContentLength(plainText, context.contentType),
    ...checkVagueUrgency(plainText),
  ];

  // Determine which checks passed (no warnings)
  const failedChecks = new Set(allWarnings.map((w) => w.check));
  const passedChecks = ALL_CHECKS.filter((c) => !failedChecks.has(c));

  // Calculate score: start at 100, deduct per warning by severity
  const deductions = { error: 15, warning: 8, info: 3 };
  const totalDeduction = allWarnings.reduce(
    (sum, w) => sum + deductions[w.severity],
    0,
  );
  const score = Math.max(0, 100 - totalDeduction);

  return { warnings: allWarnings, passedChecks, score };
}
