# BRANDDOCK — Implementatieplan Fase 3
## Brandstyle — AI-Powered Style Extraction, 5-Tab Styleguide, Color Detail Modal, Save for AI
**Datum:** 13 februari 2026
**Doel:** AI-powered brand style extraction (URL/PDF) + bewerkbaar 5-tab styleguide (Logo, Colors, Typography, Tone of Voice, Imagery) met Save for AI integratie
**Vereist:** Fase 11 ✅ + Fase 1A-1E ✅ + Fase 2 ✅
**Geschatte duur:** 2 sessies

---

## HOE DIT PLAN TE GEBRUIKEN

```bash
# In Claude Code:
> Lees IMPLEMENTATIEPLAN-FASE-3.md en voer Stap 1 uit.
```

---

## OVERZICHT

Brandstyle is een AI-powered tool voor het extraheren en beheren van visuele merkidentiteit. Gebruikers uploaden een website URL of PDF, waarna AI automatisch kleuren, typografie, spacing en component styles extraheert. Het resultaat is een bewerkbaar Brand Styleguide met 5 secties, elk met "Save for AI" functionaliteit die direct doorwerkt naar Content Studio.

**Uniek:** Max 1 styleguide per workspace. Async processing met polling. Color Detail Modal met WCAG contrast ratio's.

```
Sidebar "Brand Style"
  → SCR-06: ANALYZER
  │   ├── Input Tabs: Website URL (default) | PDF Upload
  │   ├── "What we extract" 2×2 grid (4 capabilities)
  │   ├── "How it works" 3 stappen
  │   └── Processing: 5-stap checklist met live voortgang (polling 2s)
  │
  → SCR-06a: STYLEGUIDE (auto-navigatie na processing)
      ├── Header: creator info + datum + "Analyze Next" + "Export PDF"
      ├── Tab 1: Logo — variaties grid + usage guidelines + don'ts
      ├── Tab 2: Colors — swatch grid + Color Detail Modal (split-view)
      ├── Tab 3: Typography — font preview + type scale tabel
      ├── Tab 4: Tone of Voice — content guidelines + writing rules + do/don't
      ├── Tab 5: Imagery — photo/illustration style + guidelines + don'ts
      └── AI Content Banner per sectie: Discard + Save Changes
```

**Routes:**
- Analyzer: `/knowledge/brand-style`
- Styleguide: `/knowledge/brand-style/guide`

---

## STAP 1: DATABASE

### Stap 1A — Prisma Schema

**Nieuwe modellen toevoegen aan `prisma/schema.prisma`:**

```prisma
// ============================================
// BRANDSTYLE MODELLEN (Fase 3)
// ============================================

model BrandStyleguide {
  id                    String            @id @default(cuid())
  status                StyleguideStatus  @default(DRAFT)
  sourceType            StyleguideSource
  sourceUrl             String?
  sourceFileName        String?
  analysisJobId         String?
  analysisStatus        AnalysisStatus    @default(PENDING)

  // Logo
  logoVariations        Json?             // [{ name, url, type: "primary"|"white"|"icon" }]
  logoGuidelines        String[]
  logoDonts             String[]
  logoSavedForAi        Boolean           @default(false)

  // Colors
  colors                StyleguideColor[]
  colorDonts            String[]
  colorsSavedForAi      Boolean           @default(false)

  // Typography
  primaryFontName       String?
  primaryFontUrl        String?
  typeScale             Json?             // [{ level, name, size, lineHeight, weight, letterSpacing }]
  typographySavedForAi  Boolean           @default(false)

  // Tone of Voice
  contentGuidelines     String[]
  writingGuidelines     String[]
  examplePhrases        Json?             // [{ text, type: "do"|"dont" }]
  toneSavedForAi        Boolean           @default(false)

  // Imagery
  photographyStyle      Json?             // { style, mood, composition }
  photographyGuidelines String[]
  illustrationGuidelines String[]
  imageryDonts          String[]
  imagerySavedForAi     Boolean           @default(false)

  createdById           String
  createdBy             User              @relation(fields: [createdById], references: [id])
  workspaceId           String
  workspace             Workspace         @relation(fields: [workspaceId], references: [id])
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  @@unique([workspaceId])  // Max 1 per workspace
  @@index([workspaceId])
}

model StyleguideColor {
  id                String            @id @default(cuid())
  name              String
  hex               String            // #RRGGBB
  rgb               String?           // rgb(R, G, B)
  hsl               String?           // hsl(H, S%, L%)
  cmyk              String?           // cmyk(C%, M%, Y%, K%)
  category          ColorCategory     @default(PRIMARY)
  tags              String[]
  notes             String?
  contrastWhite     String?           // "AA" | "AAA" | "Fail"
  contrastBlack     String?           // "AA" | "AAA" | "Fail"
  sortOrder         Int               @default(0)

  styleguideId      String
  styleguide        BrandStyleguide   @relation(fields: [styleguideId], references: [id], onDelete: Cascade)

  @@index([styleguideId])
}

// Enums
enum StyleguideStatus {
  DRAFT
  ANALYZING
  COMPLETE
  ERROR
}

enum StyleguideSource {
  URL
  PDF
}

enum AnalysisStatus {
  PENDING
  SCANNING_STRUCTURE
  EXTRACTING_COLORS
  ANALYZING_TYPOGRAPHY
  DETECTING_COMPONENTS
  GENERATING_STYLEGUIDE
  COMPLETE
  ERROR
}

enum ColorCategory {
  PRIMARY
  SECONDARY
  ACCENT
  NEUTRAL
  SEMANTIC
}
```

**Relaties toevoegen aan bestaande modellen:**
```prisma
// In model Workspace — voeg toe:
  brandStyleguide     BrandStyleguide?

// In model User — voeg toe:
  createdStyleguides  BrandStyleguide[]
```

### Stap 1B — Migratie

```bash
npx prisma migrate dev --name add-brandstyle-models
```

### Stap 1C — Seed Data

Voeg toe aan `prisma/seed.ts`:

```typescript
// ============================================
// BRANDSTYLE SEED DATA
// ============================================

const styleguide = await prisma.brandStyleguide.create({
  data: {
    status: "COMPLETE",
    sourceType: "URL",
    sourceUrl: "https://branddock.com",
    analysisStatus: "COMPLETE",

    // Logo
    logoVariations: [
      { name: "Primary Logo", url: "/assets/logo-primary.svg", type: "primary" },
      { name: "White Logo", url: "/assets/logo-white.svg", type: "white" },
      { name: "Icon Only", url: "/assets/logo-icon.svg", type: "icon" },
    ],
    logoGuidelines: [
      "Always maintain minimum clear space equal to the height of the 'B' in the logo",
      "Use the primary logo on light backgrounds and the white logo on dark backgrounds",
      "The icon-only version should be used at sizes below 32px",
    ],
    logoDonts: [
      "Don't stretch or distort the logo",
      "Don't change the logo colors",
      "Don't add effects like shadows or gradients",
      "Don't place on busy backgrounds without contrast",
      "Don't rotate or flip the logo",
    ],
    logoSavedForAi: true,

    // Color Donts
    colorDonts: [
      "Don't use primary colors for large background areas",
      "Don't combine accent colors without neutral separation",
      "Don't use low-contrast color combinations for text",
    ],
    colorsSavedForAi: true,

    // Typography
    primaryFontName: "Inter",
    primaryFontUrl: "https://fonts.google.com/specimen/Inter",
    typeScale: [
      { level: "H1", name: "Heading 1", size: "36px", lineHeight: "44px", weight: "700", letterSpacing: "-0.02em" },
      { level: "H2", name: "Heading 2", size: "30px", lineHeight: "38px", weight: "600", letterSpacing: "-0.01em" },
      { level: "H3", name: "Heading 3", size: "24px", lineHeight: "32px", weight: "600", letterSpacing: "0" },
      { level: "Body", name: "Body", size: "16px", lineHeight: "24px", weight: "400", letterSpacing: "0" },
      { level: "Body SM", name: "Body Small", size: "14px", lineHeight: "20px", weight: "400", letterSpacing: "0" },
      { level: "Caption", name: "Caption", size: "12px", lineHeight: "16px", weight: "500", letterSpacing: "0.02em" },
    ],
    typographySavedForAi: true,

    // Tone of Voice
    contentGuidelines: [
      "Write in active voice — direct and engaging",
      "Use simple, clear language — avoid jargon unless audience-specific",
      "Lead with benefits, not features",
      "Be confident but not arrogant",
      "Address the reader directly with 'you' and 'your'",
    ],
    writingGuidelines: [
      "Headlines: Max 8 words, action-oriented",
      "Body text: Short paragraphs (2-3 sentences max)",
      "CTAs: Start with a verb, create urgency",
      "Tone: Professional yet approachable",
      "Avoid: Exclamation marks, ALL CAPS, buzzwords",
    ],
    examplePhrases: [
      { text: "Build your brand strategy with AI-powered insights", type: "do" },
      { text: "Transform how your team creates on-brand content", type: "do" },
      { text: "Simple tools for complex brand challenges", type: "do" },
      { text: "THE BEST BRAND TOOL EVER!!!", type: "dont" },
      { text: "Leverage synergies to optimize brand paradigms", type: "dont" },
    ],
    toneSavedForAi: true,

    // Imagery
    photographyStyle: {
      style: "Clean, modern, minimal",
      mood: "Professional, optimistic, innovative",
      composition: "Centered subjects, generous white space, natural lighting",
    },
    photographyGuidelines: [
      "Use natural lighting wherever possible",
      "Focus on people in authentic work environments",
      "Include diversity in all people photography",
      "Maintain a clean, uncluttered composition",
    ],
    illustrationGuidelines: [
      "Use flat, geometric illustration style",
      "Stick to the brand color palette",
      "Keep illustrations simple and recognizable at small sizes",
    ],
    imageryDonts: [
      "Don't use stock photos with forced poses",
      "Don't apply heavy filters or color overlays",
      "Don't use clip art or low-resolution images",
      "Don't mix illustration styles within one project",
    ],
    imagerySavedForAi: true,

    workspaceId: workspace.id,
    createdById: user.id,
  },
});

// 9 Colors
const colors = [
  { name: "Teal 500", hex: "#14B8A6", rgb: "rgb(20, 184, 166)", hsl: "hsl(173, 80%, 40%)", cmyk: "cmyk(89%, 0%, 10%, 28%)", category: "PRIMARY" as const, tags: ["brand", "primary", "CTA"], contrastWhite: "AA", contrastBlack: "AAA", sortOrder: 0 },
  { name: "Teal 600", hex: "#0D9488", rgb: "rgb(13, 148, 136)", hsl: "hsl(173, 84%, 32%)", cmyk: "cmyk(91%, 0%, 8%, 42%)", category: "PRIMARY" as const, tags: ["brand", "hover"], contrastWhite: "AAA", contrastBlack: "AA", sortOrder: 1 },
  { name: "Teal 700", hex: "#0F766E", rgb: "rgb(15, 118, 110)", hsl: "hsl(174, 77%, 26%)", cmyk: "cmyk(87%, 0%, 7%, 54%)", category: "PRIMARY" as const, tags: ["brand", "dark"], contrastWhite: "AAA", contrastBlack: "AA", sortOrder: 2 },
  { name: "Gray 100", hex: "#F3F4F6", rgb: "rgb(243, 244, 246)", hsl: "hsl(220, 14%, 96%)", category: "NEUTRAL" as const, tags: ["background", "light"], contrastWhite: "Fail", contrastBlack: "AAA", sortOrder: 3 },
  { name: "Gray 500", hex: "#6B7280", rgb: "rgb(107, 114, 128)", hsl: "hsl(220, 9%, 46%)", category: "NEUTRAL" as const, tags: ["text", "secondary"], contrastWhite: "AA", contrastBlack: "AA", sortOrder: 4 },
  { name: "Gray 900", hex: "#111827", rgb: "rgb(17, 24, 39)", hsl: "hsl(221, 39%, 11%)", category: "NEUTRAL" as const, tags: ["text", "primary"], contrastWhite: "AAA", contrastBlack: "Fail", sortOrder: 5 },
  { name: "Red 500", hex: "#EF4444", rgb: "rgb(239, 68, 68)", hsl: "hsl(0, 84%, 60%)", category: "SEMANTIC" as const, tags: ["error", "danger"], contrastWhite: "AA", contrastBlack: "AA", sortOrder: 6 },
  { name: "Amber 500", hex: "#F59E0B", rgb: "rgb(245, 158, 11)", hsl: "hsl(38, 92%, 50%)", category: "SEMANTIC" as const, tags: ["warning"], contrastWhite: "Fail", contrastBlack: "AAA", sortOrder: 7 },
  { name: "Emerald 500", hex: "#10B981", rgb: "rgb(16, 185, 129)", hsl: "hsl(160, 84%, 39%)", category: "SEMANTIC" as const, tags: ["success"], contrastWhite: "AA", contrastBlack: "AAA", sortOrder: 8 },
];

for (const color of colors) {
  await prisma.styleguideColor.create({
    data: { ...color, styleguideId: styleguide.id },
  });
}
```

```bash
npx prisma db seed
```

### ✅ Stap 1 Checklist
- [ ] `BrandStyleguide` model met Logo/Colors/Typography/ToneOfVoice/Imagery secties
- [ ] `StyleguideColor` model met HEX/RGB/HSL/CMYK + WCAG contrast + tags
- [ ] 4 enums: StyleguideStatus, StyleguideSource, AnalysisStatus, ColorCategory
- [ ] `@@unique([workspaceId])` — max 1 per workspace
- [ ] Per-sectie `savedForAi` boolean velden (5 totaal)
- [ ] Relaties op Workspace + User
- [ ] Migratie geslaagd
- [ ] Seed: 1 complete styleguide, 9 kleuren, alle secties gevuld, alles savedForAi

---

## STAP 2: TYPES + API

### Stap 2A — Types

**Bestand:** `src/types/brandstyle.ts`

```typescript
export type StyleguideStatus = "DRAFT" | "ANALYZING" | "COMPLETE" | "ERROR";
export type StyleguideSource = "URL" | "PDF";
export type AnalysisStatus = "PENDING" | "SCANNING_STRUCTURE" | "EXTRACTING_COLORS" | "ANALYZING_TYPOGRAPHY" | "DETECTING_COMPONENTS" | "GENERATING_STYLEGUIDE" | "COMPLETE" | "ERROR";
export type ColorCategory = "PRIMARY" | "SECONDARY" | "ACCENT" | "NEUTRAL" | "SEMANTIC";

export interface BrandStyleguide {
  id: string;
  status: StyleguideStatus;
  sourceType: StyleguideSource;
  sourceUrl: string | null;
  sourceFileName: string | null;
  createdBy: { name: string; avatarUrl: string | null };
  createdAt: string;
  logo: LogoSection;
  colors: ColorsSection;
  typography: TypographySection;
  toneOfVoice: ToneOfVoiceSection;
  imagery: ImagerySection;
}

export interface LogoSection {
  variations: LogoVariation[];
  guidelines: string[];
  donts: string[];
  savedForAi: boolean;
}

export interface LogoVariation {
  name: string;
  url: string;
  type: "primary" | "white" | "icon";
}

export interface ColorsSection {
  colors: StyleguideColorItem[];
  donts: string[];
  savedForAi: boolean;
}

export interface StyleguideColorItem {
  id: string;
  name: string;
  hex: string;
  rgb: string | null;
  hsl: string | null;
  cmyk: string | null;
  category: ColorCategory;
  tags: string[];
  notes: string | null;
  contrastWhite: string | null;
  contrastBlack: string | null;
  sortOrder: number;
}

export interface TypographySection {
  primaryFontName: string | null;
  primaryFontUrl: string | null;
  typeScale: TypeScaleItem[];
  savedForAi: boolean;
}

export interface TypeScaleItem {
  level: string;
  name: string;
  size: string;
  lineHeight: string;
  weight: string;
  letterSpacing: string;
}

export interface ToneOfVoiceSection {
  contentGuidelines: string[];
  writingGuidelines: string[];
  examplePhrases: ExamplePhrase[];
  savedForAi: boolean;
}

export interface ExamplePhrase {
  text: string;
  type: "do" | "dont";
}

export interface ImagerySection {
  photographyStyle: { style: string; mood: string; composition: string } | null;
  photographyGuidelines: string[];
  illustrationGuidelines: string[];
  donts: string[];
  savedForAi: boolean;
}

// Analysis
export interface AnalysisStatusResponse {
  jobId: string;
  status: AnalysisStatus;
  currentStep: number;
  totalSteps: number;
  steps: AnalysisStep[];
  error?: string;
}

export interface AnalysisStep {
  name: string;
  status: "pending" | "in_progress" | "complete";
}

export const ANALYSIS_STEPS = [
  "Scanning website structure",
  "Extracting color palette",
  "Analyzing typography",
  "Detecting component styles",
  "Generating styleguide",
] as const;

// API Bodies
export interface AnalyzeUrlBody {
  url: string;
}

export interface AddColorBody {
  name: string;
  hex: string;
  category?: ColorCategory;
  tags?: string[];
}

// AI Context
export interface AiContextResponse {
  logo: LogoSection | null;
  colors: ColorsSection | null;
  typography: TypographySection | null;
  toneOfVoice: ToneOfVoiceSection | null;
  imagery: ImagerySection | null;
}

// Tab config
export type StyleguideTab = "logo" | "colors" | "typography" | "tone_of_voice" | "imagery";

export const STYLEGUIDE_TAB_CONFIG: Record<StyleguideTab, { label: string; icon: string }> = {
  logo: { label: "Logo", icon: "Image" },
  colors: { label: "Colors", icon: "Palette" },
  typography: { label: "Typography", icon: "Type" },
  tone_of_voice: { label: "Tone of Voice", icon: "MessageCircle" },
  imagery: { label: "Imagery", icon: "Camera" },
};

export const COLOR_CATEGORY_CONFIG: Record<ColorCategory, { label: string; color: string }> = {
  PRIMARY: { label: "Primary", color: "bg-teal-100 text-teal-700" },
  SECONDARY: { label: "Secondary", color: "bg-blue-100 text-blue-700" },
  ACCENT: { label: "Accent", color: "bg-purple-100 text-purple-700" },
  NEUTRAL: { label: "Neutral", color: "bg-gray-100 text-gray-600" },
  SEMANTIC: { label: "Semantic", color: "bg-amber-100 text-amber-700" },
};
```

### Stap 2B — Color Utilities

**Bestand:** `src/lib/utils/color-utils.ts`

```typescript
/**
 * HEX → RGB conversie
 * HEX → HSL conversie
 * HEX → CMYK conversie
 * WCAG contrast ratio berekening (tegen wit en zwart)
 * Rating: "AAA" (≥7:1), "AA" (≥4.5:1), "Fail" (<4.5:1)
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number };
export function hexToHsl(hex: string): { h: number; s: number; l: number };
export function hexToCmyk(hex: string): { c: number; m: number; y: number; k: number };
export function getContrastRatio(hex1: string, hex2: string): number;
export function getWcagRating(ratio: number): "AAA" | "AA" | "Fail";
export function formatRgb(hex: string): string;   // "rgb(R, G, B)"
export function formatHsl(hex: string): string;   // "hsl(H, S%, L%)"
export function formatCmyk(hex: string): string;  // "cmyk(C%, M%, Y%, K%)"
```

### Stap 2C — API Endpoints

**20 endpoints:**

```
src/app/api/brandstyle/
  route.ts                              → GET styleguide, PATCH update
  analyze/
    url/route.ts                        → POST start URL analyse
    pdf/route.ts                        → POST start PDF analyse (multipart)
    status/[jobId]/route.ts             → GET polling status
  logo/route.ts                         → GET + PATCH logo
  colors/
    route.ts                            → GET + POST (add color) + PATCH (update all)
    [colorId]/route.ts                  → PATCH + DELETE single color
  typography/route.ts                   → GET + PATCH
  tone-of-voice/route.ts               → GET + PATCH
  imagery/route.ts                      → GET + PATCH
  [section]/save-for-ai/route.ts        → POST save for AI
  ai-context/route.ts                   → GET all saved sections
  export-pdf/route.ts                   → POST export PDF
```

**Key endpoint logica:**

**POST /api/brandstyle/analyze/url:**
```
1. Valideer URL (z.string().url())
2. Check: bestaat er al een styleguide? → status ANALYZING (update)
3. Maak jobId aan (cuid)
4. Start async processing (simulatie: stap voor stap status updates)
5. Return: { jobId }
```

**GET /api/brandstyle/analyze/status/[jobId]:**
```
1. Lookup analysisJobId op BrandStyleguide
2. Return: { jobId, status, currentStep, totalSteps: 5, steps[] }
NOTE: In demo mode, status transition simuleren op basis van tijd
```

**POST /api/brandstyle/[section]/save-for-ai:**
```
1. Valideer section: logo | colors | typography | tone_of_voice | imagery
2. Update corresponderende savedForAi boolean → true
3. Return: { saved: true, section }
```

**GET /api/brandstyle/ai-context:**
```
1. Haal styleguide op
2. Return alleen secties waar savedForAi === true
3. Format als AI-bruikbare context
```

**Zod validatie:**
```typescript
const analyzeUrlSchema = z.object({
  url: z.string().url().max(500),
});

const addColorSchema = z.object({
  name: z.string().min(1).max(50),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  category: z.enum(["PRIMARY", "SECONDARY", "ACCENT", "NEUTRAL", "SEMANTIC"]).optional(),
  tags: z.array(z.string().max(30)).max(5).optional(),
});
```

### Stap 2D — API Client + Hooks

**Bestand:** `src/lib/api/brandstyle.ts` + `src/lib/api/brandstyle-hooks.ts`

```typescript
const brandstyleKeys = {
  all:            ["brandstyle"],
  styleguide:     () => ["brandstyle", "guide"],
  section:        (s: string) => ["brandstyle", "section", s],
  analysisStatus: (jobId: string) => ["brandstyle", "analysis", jobId],
  aiContext:      () => ["brandstyle", "ai-context"],
};

// Hooks
useStyleguide()                          // staleTime: 30s
useAnalysisStatus(jobId)                 // refetchInterval: 2000ms (stopt bij COMPLETE/ERROR)
useAnalyzeUrl()                          // returns jobId
useAnalyzePdf()                          // returns jobId
useUpdateLogo()                          // invalidate styleguide
useUpdateColors()                        // invalidate styleguide
useAddColor()                            // invalidate styleguide
useDeleteColor()                         // invalidate styleguide
useUpdateTypography()                    // invalidate styleguide
useUpdateToneOfVoice()                   // invalidate styleguide
useUpdateImagery()                       // invalidate styleguide
useSaveForAi(section)                    // invalidate styleguide + aiContext
useAiContext()                           // staleTime: 60s
useExportPdf()                           // trigger download
```

**Belangrijk:** `useAnalysisStatus` polling:
```typescript
useQuery({
  queryKey: brandstyleKeys.analysisStatus(jobId),
  queryFn: () => getAnalysisStatus(jobId),
  refetchInterval: (data) =>
    data?.status === "COMPLETE" || data?.status === "ERROR" ? false : 2000,
  enabled: !!jobId,
});
```

### ✅ Stap 2 Checklist
- [ ] Types: Styleguide, 5 secties, Color, Analysis, AI Context
- [ ] Tab config + Color category config
- [ ] Color utilities: HEX→RGB/HSL/CMYK, WCAG contrast
- [ ] 20 API endpoints
- [ ] Analyse polling (2s interval, stopt bij complete/error)
- [ ] Save for AI endpoint per sectie
- [ ] AI Context endpoint (alleen saved secties)
- [ ] Zod validatie
- [ ] 15 TanStack hooks met juiste invalidatie

---

## STAP 3: STORE + UI — ANALYZER (SCR-06)

### Stap 3A — Zustand Store

**Bestand:** `src/stores/useBrandstyleStore.ts`

```typescript
interface BrandstyleStore {
  styleguide: BrandStyleguide | null;
  analysisJobId: string | null;
  analysisStatus: AnalysisStatusResponse | null;
  isAnalyzing: boolean;

  // Styleguide tabs
  activeTab: StyleguideTab;
  selectedColorId: string | null;
  isColorModalOpen: boolean;

  // Actions
  setStyleguide: (sg: BrandStyleguide | null) => void;
  startAnalysis: (jobId: string) => void;
  setAnalysisStatus: (status: AnalysisStatusResponse) => void;
  completeAnalysis: () => void;
  setActiveTab: (tab: StyleguideTab) => void;
  openColorModal: (colorId: string) => void;
  closeColorModal: () => void;
  reset: () => void;
}
```

### Stap 3B — Analyzer Componenten

```
src/components/brandstyle/
  BrandstyleAnalyzerPage.tsx      ← Hoofdpagina
  InputMethodTabs.tsx             ← Website URL | PDF Upload toggle
  WebsiteUrlInput.tsx             ← URL input card + "✨ Analyze"
  PdfUploadInput.tsx              ← Drag-and-drop upload zone
  ExtractionCapabilities.tsx      ← 2×2 grid "What we extract"
  HowItWorks.tsx                  ← 3-stap uitleg
  ProcessingProgress.tsx          ← 5-stap checklist met live voortgang
```

### Design Tokens

#### BrandstyleAnalyzerPage Header
```
Icon:           Palette (Lucide) in bg-teal-50 circle
Title:          text-2xl font-bold text-gray-900 → "Brand Style"
Subtitle:       text-sm text-gray-500 → "AI-powered brand style extraction and management"
```

#### InputMethodTabs
```
Container:      flex gap-0 border-b border-gray-200 mb-6
Tab:
  Active:       text-teal-600 border-b-2 border-teal-500 pb-2 px-4 text-sm font-medium
  Inactive:     text-gray-500 hover:text-gray-700 pb-2 px-4 text-sm
2 tabs:         "Website URL" | "PDF Upload"
```

#### WebsiteUrlInput
```
Container:      bg-white border border-gray-200 rounded-lg p-6
Title:          text-base font-semibold text-gray-900 → "Enter Website URL"
Subtitle:       text-sm text-gray-500
Input:          w-full border border-gray-200 rounded-lg px-4 py-3 text-sm
                placeholder="https://yourcompany.com"
                focus:ring-2 focus:ring-teal-500
Analyze btn:    bg-teal-500 text-white px-6 py-3 rounded-lg text-sm font-medium
                → "✨ Analyze Website" (Sparkles icon)
                disabled: bg-gray-300 cursor-not-allowed
```

#### PdfUploadInput
```
Container:      bg-white border border-gray-200 rounded-lg p-6
Drop zone:      border-2 border-dashed border-gray-300 rounded-lg p-8 text-center
                hover: border-teal-400 bg-teal-50/50
  Icon:         Upload w-8 h-8 text-gray-400
  Text:         text-sm text-gray-500 → "Drag and drop your brand PDF here"
  Subtext:      text-xs text-gray-400 → "or click to browse • Max 50MB • PDF only"
  Active drop:  border-teal-500 bg-teal-50
Analyze btn:    bg-teal-500 text-white → "✨ Analyze PDF"
```

#### ExtractionCapabilities ("What we extract")
```
Title:          text-sm font-semibold text-gray-900 → "What we extract"
Grid:           grid grid-cols-2 gap-3
Card:           bg-gray-50 rounded-lg p-4
  Icon:         w-5 h-5 text-teal-500
  Title:        text-sm font-medium text-gray-900
  Description:  text-xs text-gray-500
4 items:
  Palette   → "Color Palette" → "Primary, secondary, accent, and neutral colors"
  Type      → "Typography" → "Font families, sizes, weights, and line heights"
  Image     → "Visual Style" → "Photography and illustration guidelines"
  MessageCircle → "Tone of Voice" → "Content and writing guidelines"
```

#### HowItWorks
```
Title:          text-sm font-semibold text-gray-900 → "How it works"
Container:      flex items-center gap-4 mt-3
Step:           flex items-center gap-3
  Number:       w-8 h-8 rounded-full bg-teal-50 text-teal-600 text-sm font-bold
  Text:         text-sm text-gray-700
  Arrow:        ChevronRight w-4 h-4 text-gray-300
3 stappen:
  ① "Enter URL or upload PDF"
  ② "AI extracts brand elements"
  ③ "Review and edit your styleguide"
```

#### ProcessingProgress (verschijnt tijdens analyse)
```
Container:      bg-white border border-gray-200 rounded-lg p-6 mt-6
Title:          text-base font-semibold text-gray-900 → "Analyzing your brand..."
Subtitle:       text-sm text-gray-500 → sourceUrl

Steps:          space-y-3 mt-4
Step item:      flex items-center gap-3
  Icon:
    Pending:    w-6 h-6 rounded-full bg-gray-100 text-gray-400 text-xs font-bold (nummer)
    Active:     w-6 h-6 Loader2 animate-spin text-teal-500
    Complete:   w-6 h-6 CheckCircle text-green-500
  Label:
    Pending:    text-sm text-gray-400
    Active:     text-sm text-gray-900 font-medium
    Complete:   text-sm text-gray-500

5 stappen:
  ① Scanning website structure
  ② Extracting color palette
  ③ Analyzing typography
  ④ Detecting component styles
  ⑤ Generating styleguide

Progress bar:   h-1 bg-gray-200 rounded-full mt-4 → fill: bg-teal-500 (currentStep/5 * 100%)
```

### ✅ Stap 3 Checklist
- [ ] Zustand store met analyse + tab state
- [ ] 2 input tabs: Website URL (default) + PDF Upload
- [ ] URL input met validatie + "✨ Analyze" button
- [ ] PDF drag-and-drop zone (50MB max)
- [ ] "What we extract" 2×2 grid
- [ ] "How it works" 3 stappen
- [ ] Processing: 5 stappen met pending/active(spinner)/complete(✅) states
- [ ] Progress bar onderaan processing
- [ ] Auto-navigatie naar /guide na COMPLETE

---

## STAP 4: UI — STYLEGUIDE (SCR-06a)

### Componenten

```
src/components/brandstyle/
  BrandStyleguidePage.tsx         ← Hoofdpagina
  StyleguideHeader.tsx            ← Creator, datum, Analyze Next + Export PDF
  StyleguideTabNav.tsx            ← 5 tabs (jump-links)
  sections/
    LogoSection.tsx               ← Logo variaties + guidelines + don'ts
    ColorsSection.tsx             ← Swatch grid + Color Detail Modal trigger
    ColorDetailModal.tsx          ← Split-view: swatch + info panel
    TypographySection.tsx         ← Font preview + type scale tabel
    ToneOfVoiceSection.tsx        ← Guidelines + writing rules + do/don't
    ImagerySection.tsx            ← Photo/illustration + guidelines + don'ts
  AiContentBanner.tsx             ← Teal banner per sectie: Discard + Save Changes
```

### Design Tokens

#### StyleguideHeader
```
Container:      flex items-center justify-between mb-6
Left:           flex items-center gap-3
  Avatar:       w-8 h-8 rounded-full bg-gray-200
  Creator:      text-sm text-gray-700 → "Created by {name}"
  Date:         text-xs text-gray-400 → "{date}"
  Source:       text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded → "🌐 {url}"
Right:          flex gap-2
  Analyze Next: border border-gray-300 px-3 py-2 rounded-lg text-sm → "Analyze Next"
  Export PDF:   bg-teal-500 text-white px-3 py-2 rounded-lg text-sm → "Export PDF"
```

#### StyleguideTabNav
```
Container:      flex gap-0 border-b border-gray-200 mb-6 sticky top-0 bg-white z-10
Tab:
  Active:       text-teal-600 border-b-2 border-teal-500 pb-3 px-4 flex items-center gap-2
  Inactive:     text-gray-500 hover:text-gray-700 pb-3 px-4 flex items-center gap-2
  Icon:         w-4 h-4
  Label:        text-sm font-medium
5 tabs:         Logo | Colors | Typography | Tone of Voice | Imagery
Scrollspy/jump-link: klik scrollt naar sectie
```

#### LogoSection
```
Section title:  text-lg font-semibold text-gray-900 → "Logo"
Subtitle:       text-sm text-gray-500

Variations grid: grid grid-cols-3 gap-4 mt-4
  Card:         border border-gray-200 rounded-lg p-6 text-center bg-white
    Image:      w-full h-24 object-contain (placeholder grijze box)
    Name:       text-sm text-gray-700 mt-2
    Type badge: text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded

Usage Guidelines:
  Title:        text-sm font-semibold text-gray-900 mt-6 → "Usage Guidelines"
  List:         space-y-2 mt-2
    Item:       flex items-start gap-2
      Check:    CheckCircle w-4 h-4 text-green-500 mt-0.5
      Text:     text-sm text-gray-700

Logo Don'ts:
  Title:        text-sm font-semibold text-gray-900 mt-6 → "Don'ts"
  Grid:         grid grid-cols-5 gap-3 mt-2
    Card:       bg-gray-50 rounded-lg p-3 text-center
      X icon:   X w-5 h-5 text-red-500 mx-auto
      Text:     text-xs text-gray-500 mt-1
```

#### ColorsSection
```
Section title:  "Colors"
Category groups: mb-6
  Category badge: text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2

Swatch grid:    grid grid-cols-3 md:grid-cols-6 gap-3
  Swatch card:  rounded-lg overflow-hidden border border-gray-200 cursor-pointer
                hover:ring-2 hover:ring-teal-500 transition-shadow
    Color block: h-20 w-full (achtergrondkleur = hex)
    Info:        p-2
      Name:     text-xs font-medium text-gray-900
      Hex:      text-xs text-gray-500 font-mono

Add color btn:  border-2 border-dashed border-gray-300 rounded-lg h-20+p-2 flex items-center
                justify-center text-gray-400 hover:border-teal-400 → "+ Add Color"
```

#### ColorDetailModal
```
Overlay:        fixed inset-0 bg-black/50 z-50
Container:      bg-white rounded-2xl max-w-2xl mx-auto mt-20 flex overflow-hidden

Left panel (50%):
  Color swatch: w-full h-full min-h-[300px] rounded-l-2xl (bg = hex color)

Right panel (50%):
  Container:    p-6
  Close btn:    X w-5 h-5 text-gray-400 absolute top-4 right-4
  Name:         text-lg font-semibold text-gray-900
  Category:     text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full

  Color Values: space-y-2 mt-4
    Row:        flex items-center justify-between
      Label:    text-xs text-gray-500 → "HEX" / "RGB" / "HSL" / "CMYK"
      Value:    text-sm font-mono text-gray-900
      Copy btn: Copy w-4 h-4 text-gray-400 hover:text-gray-700

  Accessibility: mt-4
    Title:      text-xs font-semibold text-gray-500 uppercase → "Accessibility"
    Row:        flex items-center gap-2
      Label:    text-xs text-gray-500 → "On White" / "On Black"
      Badge:
        AA:     bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded
        AAA:    bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded
        Fail:   bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded

  Tags:         flex flex-wrap gap-1 mt-4
    Tag:        bg-teal-50 text-teal-700 rounded-full px-2 py-0.5 text-xs

  Notes:        text-sm text-gray-500 mt-4 italic
```

#### TypographySection
```
Section title:  "Typography"

Font preview:
  Container:    bg-gray-50 rounded-lg p-6 mt-4
  Font name:    text-xl font-bold text-gray-900 → "Inter"
  Link:         text-xs text-teal-600 → "View on Google Fonts ↗"
  Alphabet:     text-2xl text-gray-700 mt-4 font-[Inter]
                → "Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz"
  Numbers:      text-2xl text-gray-700 mt-2 → "0 1 2 3 4 5 6 7 8 9"

Type Scale table:
  Container:    mt-6 border border-gray-200 rounded-lg overflow-hidden
  Header:       bg-gray-50 text-xs font-semibold text-gray-500
  Columns:      Level | Name | Size | Line Height | Weight | Letter Spacing
  Row:          border-t border-gray-100 text-sm
    Level:      font-mono text-gray-900
    Sample:     gerenderd in correcte size/weight → "The quick brown fox"
```

#### ToneOfVoiceSection
```
Section title:  "Tone of Voice"

Content Guidelines:
  Title:        text-sm font-semibold text-gray-900 → "Content Guidelines"
  List:         ordered, space-y-2
    Number:     text-sm font-bold text-teal-600 → "1." / "2." etc.
    Text:       text-sm text-gray-700

Writing Guidelines:
  Title:        text-sm font-semibold text-gray-900 mt-6 → "Writing Guidelines"
  List:         same style

Examples:
  Title:        text-sm font-semibold text-gray-900 mt-6 → "Examples"
  Do items:     flex items-start gap-2
    Badge:      bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded → "Do"
    Text:       text-sm text-gray-700
  Don't items:  flex items-start gap-2
    Badge:      bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded → "Don't"
    Text:       text-sm text-gray-500 line-through
```

#### ImagerySection
```
Section title:  "Imagery"

Photography Style:
  Title:        text-sm font-semibold text-gray-900 → "Photography Style"
  Grid:         grid grid-cols-3 gap-3 mt-2
    Item:       bg-gray-50 rounded-lg p-3
      Label:    text-xs text-gray-500 → "Style" / "Mood" / "Composition"
      Value:    text-sm text-gray-900

Photography Guidelines: (zelfde stijl als Logo guidelines met ✅)
Illustration Guidelines: (zelfde stijl)
Imagery Don'ts: (zelfde stijl als Logo don'ts met ❌)
```

#### AiContentBanner (per sectie)
```
Container:      bg-teal-50 border border-teal-200 rounded-lg p-3 flex items-center
                justify-between mt-4
Left:           flex items-center gap-2
  Sparkles:     w-4 h-4 text-teal-500
  Text:         text-sm text-teal-700 → "This section is used for AI content generation"
Right:          flex gap-2
  Discard:      text-sm text-teal-600 hover:text-teal-700 → "Discard"
  Save:         bg-teal-500 text-white rounded-lg px-3 py-1.5 text-sm → "Save Changes"

Not saved variant:
  Text:         "Save this section to use in AI content generation"
  Save:         → "Save for AI"
```

### ✅ Stap 4 Checklist
- [ ] Header: creator, datum, source badge, Analyze Next + Export PDF
- [ ] 5 tab navigatie (sticky, jump-links)
- [ ] Logo: 3 variaties grid + guidelines (✅) + don'ts (❌)
- [ ] Colors: swatch grid per categorie + Add Color + hover ring
- [ ] Color Detail Modal: split-view, 4 kleurformaten + copy, WCAG badges, tags
- [ ] Typography: font preview (alfabet + nummers) + type scale tabel
- [ ] Tone of Voice: genummerde guidelines + writing rules + Do/Don't examples
- [ ] Imagery: photo style grid + guidelines + don'ts
- [ ] AI Content Banner per sectie: Discard + Save Changes

---

## STAP 5: ROUTES + INTEGRATIE

### Routes

```bash
src/app/knowledge/brand-style/page.tsx              ← Analyzer
src/app/knowledge/brand-style/guide/page.tsx        ← Styleguide
```

### View Switching

```typescript
// BrandstyleAnalyzerPage:
// 1. Check: bestaat styleguide? → Redirect naar /guide
// 2. No styleguide → toon Analyzer (URL/PDF input)
// 3. Na COMPLETE → auto-redirect naar /guide

// BrandStyleguidePage:
// 1. Check: bestaat styleguide? → toon guide
// 2. No styleguide → redirect naar /brand-style (analyzer)
```

### Sidebar Navigatie

```
Knowledge
  ├── Brand Foundation     (Fase 1A)
  ├── Business Strategy    (Fase 2)
  ├── Brand Style          (Fase 3)  ← NIEUW
  └── ...
```

### Cross-Module Integratie

```
Save for AI flow:
  Brand Style sectie → "Save Changes" → POST /[section]/save-for-ai
    → savedForAi = true
  Content Studio → GET /ai-context → alleen saved secties als prompt context
```

### ✅ Stap 5 Checklist
- [ ] 2 routes (analyzer + guide)
- [ ] Auto-redirect: analyzer ↔ guide op basis van styleguide bestaan
- [ ] Sidebar link "Brand Style" onder Knowledge
- [ ] Save for AI flow werkt
- [ ] AI Context endpoint retourneert alleen saved secties

---

## VOLLEDIGE ACCEPTATIECRITERIA

### Analyzer (SCR-06)
- [ ] 2 input tabs: Website URL (default) | PDF Upload
- [ ] URL input + validatie + "✨ Analyze Website" button
- [ ] PDF drag-and-drop (50MB max)
- [ ] "What we extract" 2×2 grid (4 capabilities)
- [ ] "How it works" 3 stappen
- [ ] Processing: 5 stappen (pending → spinner → ✅)
- [ ] Progress bar
- [ ] Auto-navigatie naar /guide na COMPLETE

### Styleguide (SCR-06a)
- [ ] Header: creator, datum, source, Analyze Next + Export PDF
- [ ] 5 sticky tabs als jump-links
- [ ] Logo: variaties grid, guidelines (✅), don'ts (❌)
- [ ] Colors: swatch grid per categorie, hover ring, Add Color
- [ ] Color Modal: split-view, HEX/RGB/HSL/CMYK + copy, WCAG AA/AAA/Fail, tags
- [ ] Typography: font preview (alfabet + nummers), type scale tabel (6 levels)
- [ ] Tone of Voice: genummerde guidelines, writing rules, Do/Don't examples
- [ ] Imagery: photo style grid, guidelines, don'ts
- [ ] AI Content Banner per sectie: saved/not-saved variant

### Technisch
- [ ] 0 TypeScript errors, 0 ESLint errors
- [ ] Max 1 styleguide per workspace (@@unique)
- [ ] Async polling (2s, stopt bij COMPLETE/ERROR)
- [ ] Color utilities: WCAG contrast berekening correct
- [ ] Save for AI → AI Context endpoint correct
- [ ] Color CRUD met cascade delete

---

## VOLGENDE STAPPEN NA FASE 3

```
1.  ✅ AppShell + Dashboard (Fase 11)
2.  ✅ Brand Foundation Overview (Fase 1A)
3.  ✅ AI Brand Analysis (Fase 1B)
4.  ✅ Brand Asset Detail (Fase 1C)
5.  ✅ Canvas Workshop (Fase 1D)
6.  ✅ Interviews (Fase 1E)
7.  ✅ Business Strategy (Fase 2)
8.  ✅ Brand Style (Fase 3)                  ← DIT PLAN
9.     Fase 4-11 (Settings, Campaigns, Content Studio, etc.)
```

---

*Einde implementatieplan — 13 februari 2026*
*~700 regels, 5 stappen, Brandstyle met AI extraction, 5-tab styleguide, Color Detail Modal, Save for AI*
