// =============================================================
// Composite Brand Book PDF — a single jsPDF document covering:
//  - Cover
//  - Table of contents
//  - Styleguide (logos, colors, typography, tone, imagery)
//  - All 12 brand assets with curated framework detail
//  - Personas
//  - Products
//  - Competitors
//
// Targeted at Claude Design onboarding (its "documents" input).
// Curated field selection keeps the PDF under ~40 pages even
// for fully-populated workspaces.
// =============================================================

import { jsPDF } from "jspdf";
import type {
  BrandKitData,
  BrandKitBrandAsset,
  BrandKitPersona,
  BrandKitProduct,
  BrandKitCompetitor,
  BrandKitStyleguide,
  BrandKitVoiceguide,
} from "./types";

const BRAND_PURPLE: [number, number, number] = [147, 51, 234];
const TEXT_DARK: [number, number, number] = [17, 24, 39];
const TEXT_MID: [number, number, number] = [75, 85, 99];
const TEXT_MUTED: [number, number, number] = [107, 114, 128];
const DIVIDER: [number, number, number] = [209, 213, 219];

// ─── Context ─────────────────────────────────────────────────

interface Ctx {
  doc: jsPDF;
  y: number;
  margin: number;
  contentWidth: number;
  pageWidth: number;
  setY: (y: number) => void;
  checkPageBreak: (needed: number) => void;
  addPage: () => void;
  addSectionHeader: (title: string) => void;
  addSubHeader: (title: string) => void;
  addLabel: (label: string) => void;
  addParagraph: (text: string) => void;
  addField: (label: string, value: unknown) => void;
  addList: (title: string, items: unknown) => void;
  addPairs: (pairs: { label: string; value: unknown }[]) => void;
}

function parseHex(hex: string | null | undefined): [number, number, number] {
  if (!hex) return [200, 200, 200];
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [200, 200, 200];
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function buildCtx(doc: jsPDF): Ctx {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const setY = (next: number) => {
    y = next;
  };
  const checkPageBreak = (needed: number) => {
    if (y + needed > 270) {
      doc.addPage();
      y = 20;
    }
  };
  const addPage = () => {
    doc.addPage();
    y = 20;
  };
  const addSectionHeader = (title: string) => {
    checkPageBreak(18);
    doc.setTextColor(...BRAND_PURPLE);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, y);
    y += 6;
    doc.setDrawColor(...BRAND_PURPLE);
    doc.setLineWidth(0.8);
    doc.line(margin, y, margin + 60, y);
    doc.setLineWidth(0.2);
    y += 6;
    doc.setFont("helvetica", "normal");
  };
  const addSubHeader = (title: string) => {
    checkPageBreak(10);
    doc.setTextColor(...TEXT_MID);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
  };
  const addLabel = (label: string) => {
    checkPageBreak(6);
    doc.setTextColor(...TEXT_MUTED);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(label.toUpperCase(), margin, y);
    y += 4;
    doc.setFont("helvetica", "normal");
  };
  const addParagraph = (text: string) => {
    if (!text) return;
    checkPageBreak(10);
    doc.setTextColor(...TEXT_DARK);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, contentWidth);
    lines.forEach((line: string) => {
      checkPageBreak(6);
      doc.text(line, margin, y);
      y += 5;
    });
    y += 3;
  };
  const isEmpty = (value: unknown): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === "string") return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    return false;
  };
  const addField = (label: string, value: unknown) => {
    if (isEmpty(value)) return;
    const text = Array.isArray(value) ? value.join(", ") : String(value);
    addLabel(label);
    doc.setTextColor(...TEXT_DARK);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, contentWidth);
    lines.forEach((line: string) => {
      checkPageBreak(6);
      doc.text(line, margin, y);
      y += 5;
    });
    y += 3;
  };
  const addList = (title: string, items: unknown) => {
    if (!Array.isArray(items) || items.length === 0) return;
    const stringItems = items.filter(
      (it): it is string => typeof it === "string" && it.trim().length > 0,
    );
    if (stringItems.length === 0) return;
    addSubHeader(title);
    doc.setTextColor(...TEXT_MID);
    doc.setFontSize(10);
    for (const item of stringItems) {
      checkPageBreak(8);
      const lines = doc.splitTextToSize(`•  ${item}`, contentWidth - 5);
      lines.forEach((line: string) => {
        checkPageBreak(5);
        doc.text(line, margin + 2, y);
        y += 5;
      });
      y += 1;
    }
    y += 3;
  };
  const addPairs = (pairs: { label: string; value: unknown }[]) => {
    for (const p of pairs) addField(p.label, p.value);
  };

  return {
    doc,
    get y() {
      return y;
    },
    margin,
    contentWidth,
    pageWidth,
    setY,
    checkPageBreak,
    addPage,
    addSectionHeader,
    addSubHeader,
    addLabel,
    addParagraph,
    addField,
    addList,
    addPairs,
  };
}

// ─── Header bar (runs on every page) ─────────────────────────

function addPageDecor(doc: jsPDF, brandName: string, pageLabel: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  // Top bar
  doc.setFillColor(...BRAND_PURPLE);
  doc.rect(0, 0, pageWidth, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("BRANDDOCK", 20, 6.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(brandName, pageWidth - 20, 6.5, { align: "right" });
  // Footer label
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setTextColor(...TEXT_MUTED);
  doc.setFontSize(8);
  doc.text(pageLabel, 20, pageHeight - 8);
}

// ─── Cover ───────────────────────────────────────────────────

function renderCover(ctx: Ctx, data: BrandKitData) {
  const { doc, pageWidth, margin } = ctx;
  const pageHeight = doc.internal.pageSize.getHeight();

  // Full-bleed colored header
  doc.setFillColor(...BRAND_PURPLE);
  doc.rect(0, 0, pageWidth, 80, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("BRANDDOCK BRAND KIT", margin, 20);

  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  const nameLines = doc.splitTextToSize(data.workspace.name, pageWidth - margin * 2);
  doc.text(nameLines, margin, 50);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Brand Guidelines", margin, 50 + nameLines.length * 12);

  // Footer
  doc.setTextColor(...TEXT_MUTED);
  doc.setFontSize(9);
  const exportedAt = new Date(data.generatedAt).toLocaleDateString("en-US", {
    dateStyle: "long",
  });
  doc.text(`Exported on ${exportedAt}`, margin, pageHeight - 30);
  doc.text(
    `${data.brandAssets.length} brand assets · ${data.personas.length} personas · ${data.products.length} products · ${data.competitors.length} competitors`,
    margin,
    pageHeight - 22,
  );

  ctx.setY(90);
}

// ─── TOC ─────────────────────────────────────────────────────

function renderTOC(ctx: Ctx, data: BrandKitData) {
  ctx.addPage();
  ctx.addSectionHeader("Contents");
  ctx.doc.setTextColor(...TEXT_DARK);
  ctx.doc.setFontSize(11);
  const items: string[] = [];
  items.push("1. Visual Identity");
  items.push("2. Brand Foundation");
  data.brandAssets.forEach((asset, i) => {
    items.push(`   2.${i + 1}  ${asset.name}`);
  });
  if (data.personas.length > 0) items.push("3. Target Audiences");
  if (data.products.length > 0) items.push("4. Products");
  if (data.competitors.length > 0) items.push("5. Competitive Landscape");

  for (const line of items) {
    ctx.checkPageBreak(6);
    ctx.doc.text(line, ctx.margin, ctx.y);
    ctx.setY(ctx.y + 6);
  }
}

// ─── Styleguide ──────────────────────────────────────────────

export interface EmbeddedLogo {
  name: string;
  type: string; // primary | secondary | monochrome | ...
  format: "PNG" | "JPEG";
  dataUrl: string; // "data:image/png;base64,..."
  aspectRatio: number; // width / height
}

function renderStyleguide(
  ctx: Ctx,
  sg: BrandKitStyleguide,
  voiceguide: BrandKitVoiceguide | null,
  logos: EmbeddedLogo[] = [],
) {
  ctx.addPage();
  ctx.addSectionHeader("1. Visual Identity");

  // Embedded logo images — lets Claude Design "see" the brand visually
  if (logos.length > 0) {
    ctx.addSubHeader("Logo Variations");
    const maxWidth = ctx.contentWidth * 0.6;
    const maxHeight = 50;
    for (const logo of logos) {
      // Fit within a 60% width / 50mm height box
      let w = maxWidth;
      let h = maxWidth / logo.aspectRatio;
      if (h > maxHeight) {
        h = maxHeight;
        w = maxHeight * logo.aspectRatio;
      }
      ctx.checkPageBreak(h + 10);
      try {
        ctx.doc.addImage(logo.dataUrl, logo.format, ctx.margin, ctx.y, w, h);
      } catch {
        // If the image fails to decode, fall back to a text placeholder
        ctx.doc.setTextColor(...TEXT_MUTED);
        ctx.doc.setFontSize(9);
        ctx.doc.text(`[logo: ${logo.name}]`, ctx.margin, ctx.y + 6);
      }
      ctx.setY(ctx.y + h + 2);
      ctx.doc.setTextColor(...TEXT_MUTED);
      ctx.doc.setFontSize(8);
      ctx.doc.setFont("helvetica", "italic");
      ctx.doc.text(`${logo.name} — ${logo.type}`, ctx.margin, ctx.y);
      ctx.doc.setFont("helvetica", "normal");
      ctx.setY(ctx.y + 8);
    }
  } else if (sg.logos && sg.logos.length > 0) {
    // No embedded bytes — fall back to a text list
    ctx.addSubHeader("Logo Variations");
    ctx.addList(
      "",
      sg.logos.map((v) => `${v.description ?? v.fileName} (${v.variant.toLowerCase()})`),
    );
  }
  ctx.addList("Logo Guidelines", sg.logoGuidelines);
  ctx.addList("Logo Don'ts", sg.logoDonts);

  // Colors — with swatches
  if (sg.colors.length > 0) {
    ctx.addSubHeader("Color Palette");
    ctx.doc.setTextColor(...TEXT_DARK);
    ctx.doc.setFontSize(10);
    for (const c of sg.colors) {
      ctx.checkPageBreak(12);
      const rgb = parseHex(c.hex);
      ctx.doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      ctx.doc.rect(ctx.margin, ctx.y - 3, 8, 8, "F");
      ctx.doc.setDrawColor(...DIVIDER);
      ctx.doc.rect(ctx.margin, ctx.y - 3, 8, 8, "S");
      ctx.doc.setTextColor(...TEXT_DARK);
      ctx.doc.setFont("helvetica", "bold");
      ctx.doc.setFontSize(10);
      ctx.doc.text(c.name, ctx.margin + 12, ctx.y + 1);
      ctx.doc.setFont("helvetica", "normal");
      ctx.doc.setTextColor(...TEXT_MUTED);
      ctx.doc.setFontSize(8);
      ctx.doc.text(
        `${c.hex.toUpperCase()} · ${c.category}`,
        ctx.margin + 12,
        ctx.y + 5,
      );
      ctx.setY(ctx.y + 10);
    }
    ctx.setY(ctx.y + 3);
  }

  // Typography
  if (sg.primaryFontName || sg.typeScale) {
    ctx.addSubHeader("Typography");
    if (sg.primaryFontName) ctx.addField("Primary typeface", sg.primaryFontName);
    if (sg.additionalFonts.length > 0) {
      ctx.addField("Additional typefaces", sg.additionalFonts);
    }
    if (sg.typeScale && sg.typeScale.length > 0) {
      ctx.addLabel("Type scale");
      ctx.doc.setTextColor(...TEXT_DARK);
      ctx.doc.setFontSize(10);
      for (const lvl of sg.typeScale) {
        ctx.checkPageBreak(6);
        const bits = [
          lvl.level || lvl.name,
          lvl.size,
          lvl.weight && `${lvl.weight}`,
          lvl.lineHeight && `lh ${lvl.lineHeight}`,
          lvl.usage,
        ].filter(Boolean);
        ctx.doc.text(`•  ${bits.join(" · ")}`, ctx.margin + 2, ctx.y);
        ctx.setY(ctx.y + 5);
      }
      ctx.setY(ctx.y + 3);
    }
  }

  // Tone of voice — leest uit voiceguide (verhuisd uit styleguide, ADR 2026-05-15).
  // Render het blok als er minstens één voice-veld is — examples renderen
  // onafhankelijk van guidelines.
  if (voiceguide) {
    const hasGuidelines = voiceguide.contentGuidelines.length > 0 || voiceguide.writingGuidelines.length > 0;
    const hasExamples = !!voiceguide.examplePhrases && voiceguide.examplePhrases.length > 0;
    if (hasGuidelines || hasExamples) {
      ctx.addSubHeader("Tone of Voice");
      if (voiceguide.contentGuidelines.length > 0) ctx.addList("Content guidelines", voiceguide.contentGuidelines);
      if (voiceguide.writingGuidelines.length > 0) ctx.addList("Writing guidelines", voiceguide.writingGuidelines);
      if (hasExamples && voiceguide.examplePhrases) {
        const dos = voiceguide.examplePhrases.filter((p) => p.type === "do").map((p) => p.text);
        const donts = voiceguide.examplePhrases.filter((p) => p.type === "dont").map((p) => p.text);
        if (dos.length > 0) ctx.addList("Do say", dos);
        if (donts.length > 0) ctx.addList("Don't say", donts);
      }
    }
  }

  // Imagery
  if (sg.photographyGuidelines.length > 0 || sg.illustrationGuidelines.length > 0) {
    ctx.addSubHeader("Imagery");
    ctx.addList("Photography guidelines", sg.photographyGuidelines);
    ctx.addList("Illustration guidelines", sg.illustrationGuidelines);
    ctx.addList("Imagery don'ts", sg.imageryDonts);
  }
}

// ─── Framework-specific renderers ────────────────────────────

type FrameworkData = Record<string, unknown>;

function fieldOf<T = unknown>(fw: FrameworkData | null, key: string): T | undefined {
  if (!fw) return undefined;
  return fw[key] as T | undefined;
}

function renderPurposeWheel(ctx: Ctx, fw: FrameworkData) {
  ctx.addPairs([
    { label: "Purpose statement", value: fieldOf(fw, "statement") },
    { label: "Impact type", value: fieldOf(fw, "impactType") },
    { label: "Impact description", value: fieldOf(fw, "impactDescription") },
    { label: "Mechanism", value: fieldOf(fw, "mechanism") },
    { label: "Mechanism category", value: fieldOf(fw, "mechanismCategory") },
    { label: "Pressure test", value: fieldOf(fw, "pressureTest") },
  ]);
}

function renderGoldenCircle(ctx: Ctx, fw: FrameworkData) {
  const why = fieldOf<{ statement?: string; details?: string }>(fw, "why");
  const how = fieldOf<{ statement?: string; details?: string }>(fw, "how");
  const what = fieldOf<{ statement?: string; details?: string }>(fw, "what");
  if (why?.statement) ctx.addField("Why", `${why.statement}${why.details ? ` — ${why.details}` : ""}`);
  if (how?.statement) ctx.addField("How", `${how.statement}${how.details ? ` — ${how.details}` : ""}`);
  if (what?.statement) ctx.addField("What", `${what.statement}${what.details ? ` — ${what.details}` : ""}`);
}

function renderBrandEssence(ctx: Ctx, fw: FrameworkData) {
  ctx.addPairs([
    { label: "Essence statement", value: fieldOf(fw, "essenceStatement") },
    { label: "Essence narrative", value: fieldOf(fw, "essenceNarrative") },
    { label: "Functional benefit (identity)", value: fieldOf(fw, "functionalBenefit") },
    { label: "Emotional benefit (identity)", value: fieldOf(fw, "emotionalBenefit") },
    { label: "Self-expression benefit", value: fieldOf(fw, "selfExpressiveBenefit") },
    { label: "Discriminator", value: fieldOf(fw, "discriminator") },
    { label: "Audience insight", value: fieldOf(fw, "audienceInsight") },
  ]);
  ctx.addList("Attributes", fieldOf(fw, "attributes"));
  ctx.addList("Proof points", fieldOf(fw, "proofPoints"));
}

function renderBrandPromise(ctx: Ctx, fw: FrameworkData) {
  ctx.addPairs([
    { label: "Promise one-liner", value: fieldOf(fw, "promiseOneLiner") },
    { label: "Promise statement", value: fieldOf(fw, "promiseStatement") },
    { label: "Functional value (delivery)", value: fieldOf(fw, "functionalValue") },
    { label: "Emotional value (delivery)", value: fieldOf(fw, "emotionalValue") },
    { label: "Self-expressive value", value: fieldOf(fw, "selfExpressiveValue") },
    { label: "Target audience", value: fieldOf(fw, "targetAudience") },
    { label: "Core customer need", value: fieldOf(fw, "coreCustomerNeed") },
    { label: "Differentiator", value: fieldOf(fw, "differentiator") },
    { label: "Onlyness", value: fieldOf(fw, "onlynessStatement") },
  ]);
  ctx.addList("Proof points", fieldOf(fw, "proofPoints"));
  ctx.addList("Measurable outcomes", fieldOf(fw, "measurableOutcomes"));
}

function renderMissionVision(ctx: Ctx, fw: FrameworkData) {
  ctx.addPairs([
    { label: "Mission one-liner", value: fieldOf(fw, "missionOneLiner") },
    { label: "Mission statement", value: fieldOf(fw, "missionStatement") },
    { label: "For whom", value: fieldOf(fw, "forWhom") },
    { label: "What we do", value: fieldOf(fw, "whatWeDo") },
    { label: "How we do it", value: fieldOf(fw, "howWeDoIt") },
    { label: "Impact goal", value: fieldOf(fw, "impactGoal") },
    { label: "Vision statement", value: fieldOf(fw, "visionStatement") },
    { label: "Time horizon", value: fieldOf(fw, "timeHorizon") },
    { label: "Bold aspiration (BHAG)", value: fieldOf(fw, "boldAspiration") },
    { label: "Desired future state", value: fieldOf(fw, "desiredFutureState") },
  ]);
  ctx.addList("Success indicators", fieldOf(fw, "successIndicators"));
}

function renderBrandArchetype(ctx: Ctx, fw: FrameworkData) {
  ctx.addPairs([
    { label: "Primary archetype", value: fieldOf(fw, "primaryArchetype") },
    { label: "Sub-archetype", value: fieldOf(fw, "subArchetype") },
    { label: "Core desire", value: fieldOf(fw, "coreDesire") },
    { label: "Core fear", value: fieldOf(fw, "coreFear") },
    { label: "Brand goal", value: fieldOf(fw, "brandGoal") },
    { label: "Strategy", value: fieldOf(fw, "strategy") },
    { label: "Gift / talent", value: fieldOf(fw, "giftTalent") },
    { label: "Shadow / weakness", value: fieldOf(fw, "shadowWeakness") },
    { label: "Positioning approach", value: fieldOf(fw, "positioningApproach") },
    { label: "Competitive landscape", value: fieldOf(fw, "competitiveLandscape") },
  ]);
  ctx.addList("Brand examples", fieldOf(fw, "brandExamples"));
}

function renderBrandPersonality(ctx: Ctx, fw: FrameworkData) {
  ctx.addPairs([
    { label: "Primary dimension", value: fieldOf(fw, "primaryDimension") },
    { label: "Secondary dimension", value: fieldOf(fw, "secondaryDimension") },
    { label: "Voice description", value: fieldOf(fw, "brandVoiceDescription") },
    { label: "Writing sample", value: fieldOf(fw, "writingSample") },
    { label: "Color direction", value: fieldOf(fw, "colorDirection") },
    { label: "Typography direction", value: fieldOf(fw, "typographyDirection") },
    { label: "Imagery direction", value: fieldOf(fw, "imageryDirection") },
  ]);
  ctx.addList("Words we use", fieldOf(fw, "wordsWeUse"));
  ctx.addList("Words we avoid", fieldOf(fw, "wordsWeAvoid"));

  const traits = fieldOf<
    { name?: string; description?: string; weAreThis?: string; butNeverThat?: string }[]
  >(fw, "personalityTraits");
  if (Array.isArray(traits) && traits.length > 0) {
    ctx.addSubHeader("Core Traits");
    for (const t of traits.filter((x) => x?.name)) {
      ctx.addField(t.name ?? "Trait", t.description);
      if (t.weAreThis) ctx.addField("  We are this", t.weAreThis);
      if (t.butNeverThat) ctx.addField("  But never that", t.butNeverThat);
    }
  }

  const channelTones = fieldOf<Record<string, string>>(fw, "channelTones");
  if (channelTones && Object.keys(channelTones).length > 0) {
    ctx.addSubHeader("Channel Adaptations");
    for (const [k, v] of Object.entries(channelTones)) {
      if (v && v.trim()) ctx.addField(k, v);
    }
  }
}

function renderBrandStory(ctx: Ctx, fw: FrameworkData) {
  ctx.addPairs([
    { label: "Origin story", value: fieldOf(fw, "originStory") },
    { label: "Founder motivation", value: fieldOf(fw, "founderMotivation") },
    { label: "Core belief", value: fieldOf(fw, "coreBeliefStatement") },
    { label: "World context", value: fieldOf(fw, "worldContext") },
    { label: "Philosophical problem", value: fieldOf(fw, "philosophicalProblem") },
    { label: "Stakes & costs", value: fieldOf(fw, "stakesCosts") },
    { label: "Brand role", value: fieldOf(fw, "brandRole") },
    { label: "Empathy statement", value: fieldOf(fw, "empathyStatement") },
    { label: "Transformation promise", value: fieldOf(fw, "transformationPromise") },
    { label: "Customer success vision", value: fieldOf(fw, "customerSuccessVision") },
    { label: "Elevator pitch", value: fieldOf(fw, "elevatorPitch") },
    { label: "Manifesto", value: fieldOf(fw, "manifestoText") },
  ]);
  ctx.addList("Customer problems", fieldOf(fw, "customerProblems"));
  ctx.addList("Key narrative messages", fieldOf(fw, "keyNarrativeMessages"));
}

function renderBrandhouseValues(ctx: Ctx, fw: FrameworkData) {
  const render = (prefix: string, key: string) => {
    const v = fieldOf<{ name?: string; description?: string }>(fw, key);
    if (v?.name) {
      ctx.addField(prefix, `${v.name}${v.description ? ` — ${v.description}` : ""}`);
    }
  };
  render("Anchor 1 (Roots)", "anchorValue1");
  render("Anchor 2 (Roots)", "anchorValue2");
  render("Aspiration 1 (Wings)", "aspirationValue1");
  render("Aspiration 2 (Wings)", "aspirationValue2");
  render("Own value (Fire)", "ownValue");
  ctx.addField("Value tension", fieldOf(fw, "valueTension"));
}

function renderSocialRelevancy(ctx: Ctx, fw: FrameworkData) {
  ctx.addPairs([
    { label: "Impact statement", value: fieldOf(fw, "impactStatement") },
    { label: "Impact narrative", value: fieldOf(fw, "impactNarrative") },
    { label: "Activism level", value: fieldOf(fw, "activismLevel") },
    { label: "Anti-greenwashing statement", value: fieldOf(fw, "antiGreenwashingStatement") },
    { label: "Annual commitment", value: fieldOf(fw, "annualCommitment") },
  ]);
  ctx.addList("Proof points", fieldOf(fw, "proofPoints"));
  ctx.addList("Certifications", fieldOf(fw, "certifications"));
  ctx.addList("Communication principles", fieldOf(fw, "communicationPrinciples"));
  ctx.addList("Key stakeholders", fieldOf(fw, "keyStakeholders"));
  ctx.addList("Activation channels", fieldOf(fw, "activationChannels"));
}

function renderTransformativeGoals(ctx: Ctx, fw: FrameworkData) {
  ctx.addPairs([
    { label: "Massive Transformative Purpose", value: fieldOf(fw, "massiveTransformativePurpose") },
    { label: "MTP narrative", value: fieldOf(fw, "mtpNarrative") },
  ]);
  const goals = fieldOf<
    { title?: string; description?: string; impactDomain?: string; timeframe?: string; measurableCommitment?: string }[]
  >(fw, "goals");
  if (Array.isArray(goals) && goals.length > 0) {
    ctx.addSubHeader("Transformative Goals");
    for (const g of goals.filter((x) => x?.title)) {
      ctx.addField(g.title ?? "Goal", g.description);
      if (g.impactDomain) ctx.addField("  Impact domain", g.impactDomain);
      if (g.timeframe) ctx.addField("  Timeframe", g.timeframe);
      if (g.measurableCommitment) ctx.addField("  Measurable commitment", g.measurableCommitment);
    }
  }
}

// Dispatcher
function renderFramework(ctx: Ctx, frameworkType: string | null, fw: FrameworkData | null) {
  if (!fw) return;
  switch (frameworkType) {
    case "PURPOSE_WHEEL":
      return renderPurposeWheel(ctx, fw);
    case "GOLDEN_CIRCLE":
      return renderGoldenCircle(ctx, fw);
    case "BRAND_ESSENCE":
      return renderBrandEssence(ctx, fw);
    case "BRAND_PROMISE":
      return renderBrandPromise(ctx, fw);
    case "MISSION_STATEMENT":
    case "VISION_STATEMENT":
      return renderMissionVision(ctx, fw);
    case "BRAND_ARCHETYPE":
      return renderBrandArchetype(ctx, fw);
    case "BRAND_PERSONALITY":
      return renderBrandPersonality(ctx, fw);
    case "BRAND_STORY":
      return renderBrandStory(ctx, fw);
    case "BRANDHOUSE_VALUES":
      return renderBrandhouseValues(ctx, fw);
    case "ESG":
      return renderSocialRelevancy(ctx, fw);
    case "TRANSFORMATIVE_GOALS":
      return renderTransformativeGoals(ctx, fw);
    default:
      return; // Unknown framework: skip rather than dumping raw JSON
  }
}

// ─── Asset section ──────────────────────────────────────────

function renderAsset(ctx: Ctx, asset: BrandKitBrandAsset, index: number) {
  ctx.addPage();
  ctx.addSectionHeader(`2.${index + 1} ${asset.name}`);

  ctx.doc.setTextColor(...TEXT_MUTED);
  ctx.doc.setFontSize(9);
  ctx.doc.text(
    `${asset.category} · ${asset.frameworkType ?? "—"} · Status: ${asset.status}`,
    ctx.margin,
    ctx.y,
  );
  ctx.setY(ctx.y + 6);

  if (asset.description) {
    ctx.addParagraph(asset.description);
  }

  if (asset.content) {
    ctx.addLabel("Content");
    ctx.addParagraph(asset.content);
  }

  renderFramework(ctx, asset.frameworkType, asset.frameworkData as FrameworkData | null);
}

// ─── Personas ───────────────────────────────────────────────

function implicationToDisplayString(item: unknown): string {
  if (typeof item === "string") return item;
  if (item === null || typeof item !== "object") return String(item);
  const rec = item as Record<string, unknown>;
  const text = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
  const category = text(rec.category);
  const body = [text(rec.title), text(rec.description) ?? text(rec.implication)]
    .filter((s): s is string => s !== undefined)
    .join(": ");
  if (category && body) return `${category} — ${body}`;
  return body || category || JSON.stringify(item);
}

/**
 * Formats the persona `strategicImplications` field for PDF display.
 *
 * After AI generation (POST /api/personas/[id]/strategic-implications) the
 * field holds a JSON-array string of `{ category, title, description,
 * priority }` objects; legacy personas store plain text. Returns one display
 * line per implication, or the raw string as-is when it is not a JSON array.
 */
function formatStrategicImplications(raw: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [raw];
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return [raw];
  return parsed.map((item) => implicationToDisplayString(item));
}

function renderPersonas(ctx: Ctx, personas: BrandKitPersona[]) {
  if (personas.length === 0) return;
  ctx.addPage();
  ctx.addSectionHeader("3. Target Audiences");

  for (const p of personas) {
    ctx.addSubHeader(p.name);
    if (p.tagline) ctx.addParagraph(`"${p.tagline}"`);

    const demoBits = [
      p.age && `${p.age}`,
      p.gender,
      p.occupation,
      p.location,
    ].filter((s): s is string => typeof s === "string" && s.length > 0);
    if (demoBits.length > 0) ctx.addField("Demographics", demoBits.join(" · "));

    if (p.personalityType) ctx.addField("Personality type", p.personalityType);
    ctx.addList("Core values", p.coreValues);
    ctx.addList("Interests", p.interests);
    ctx.addList("Goals", p.goals);
    ctx.addList("Motivations", p.motivations);
    ctx.addList("Frustrations", p.frustrations);
    if (p.quote) ctx.addField("Quote", p.quote);
    if (p.strategicImplications) {
      ctx.addList("Strategic implications", formatStrategicImplications(p.strategicImplications));
    }
    ctx.setY(ctx.y + 3);
  }
}

// ─── Products ───────────────────────────────────────────────

function renderProducts(ctx: Ctx, products: BrandKitProduct[]) {
  if (products.length === 0) return;
  ctx.addPage();
  ctx.addSectionHeader("4. Products");

  for (const p of products) {
    ctx.addSubHeader(p.name);
    ctx.addField("Category", p.category);
    if (p.description) ctx.addParagraph(p.description);
    if (p.pricingModel) ctx.addField("Pricing model", p.pricingModel);
    if (p.pricingDetails) ctx.addField("Pricing details", p.pricingDetails);
    ctx.addList("Features", p.features);
    ctx.addList("Benefits", p.benefits);
    ctx.addList("Use cases", p.useCases);
    ctx.setY(ctx.y + 3);
  }
}

// ─── Competitors ────────────────────────────────────────────

function renderCompetitors(ctx: Ctx, competitors: BrandKitCompetitor[]) {
  if (competitors.length === 0) return;
  ctx.addPage();
  ctx.addSectionHeader("5. Competitive Landscape");

  for (const c of competitors) {
    ctx.addSubHeader(`${c.name} — ${c.tier}`);
    const metaBits = [
      c.websiteUrl,
      c.headquarters,
      c.foundingYear && `Founded ${c.foundingYear}`,
    ].filter((s): s is string => typeof s === "string" && s.length > 0);
    if (metaBits.length > 0) {
      ctx.doc.setTextColor(...TEXT_MUTED);
      ctx.doc.setFontSize(8);
      ctx.doc.text(metaBits.join(" · "), ctx.margin, ctx.y);
      ctx.setY(ctx.y + 5);
    }
    if (c.description) ctx.addParagraph(c.description);
    if (c.valueProposition) ctx.addField("Value proposition", c.valueProposition);
    if (c.targetAudience) ctx.addField("Target audience", c.targetAudience);
    ctx.addList("Differentiators", c.differentiators);
    ctx.addList("Main offerings", c.mainOfferings);
    if (c.toneOfVoice) ctx.addField("Tone of voice", c.toneOfVoice);
    if (c.visualStyleNotes) ctx.addField("Visual style", c.visualStyleNotes);
    ctx.addList("Strengths", c.strengths);
    ctx.addList("Weaknesses", c.weaknesses);
    ctx.setY(ctx.y + 3);
  }
}

// ─── Entry point ────────────────────────────────────────────

/**
 * Build a composite brand book PDF and return its bytes.
 * Caller is responsible for downloading / bundling.
 *
 * @param logos Optional pre-fetched logo images to embed in the
 *              Visual Identity section. When provided, they render
 *              as actual images; otherwise a text list is used.
 */
export function buildCompositeBrandPdf(
  data: BrandKitData,
  logos: EmbeddedLogo[] = [],
): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const ctx = buildCtx(doc);

  renderCover(ctx, data);
  renderTOC(ctx, data);
  if (data.styleguide) renderStyleguide(ctx, data.styleguide, data.voiceguide, logos);

  if (data.brandAssets.length > 0) {
    ctx.addPage();
    ctx.addSectionHeader("2. Brand Foundation");
    ctx.doc.setTextColor(...TEXT_DARK);
    ctx.doc.setFontSize(10);
    ctx.doc.text(
      `${data.brandAssets.length} canonical brand assets form the foundation of ${data.workspace.name}.`,
      ctx.margin,
      ctx.y,
    );
    ctx.setY(ctx.y + 8);
    data.brandAssets.forEach((a, i) => renderAsset(ctx, a, i));
  }

  renderPersonas(ctx, data.personas);
  renderProducts(ctx, data.products);
  renderCompetitors(ctx, data.competitors);

  // Decorate every page with header/footer
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPageDecor(doc, data.workspace.name, `Page ${i} / ${totalPages}`);
  }

  const output = doc.output("arraybuffer");
  return new Uint8Array(output);
}
