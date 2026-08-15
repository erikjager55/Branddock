import type {
  CalibrationAskAction,
  RuleViolationInput,
} from "@/lib/brandstyle/calibration-report";
import type {
  BrandStyleguide,
  AnalysisStatusResponse,
  LogoSection,
  ColorsSection,
  TypographySection,
  ImagerySection,
  DesignLanguageSection,
  StyleguideColor,
  StyleguideFontData,
  StyleguideLogoData,
  StyleguideComponentData,
  StyleguideReviewData,
  AiContextResponse,
  SaveForAiSection,
  UpdateFontBody,
  UpdateLogoBody,
  UpdateComponentBody,
  UpdateReviewBody,
  FontRole,
  LogoVariant,
} from "../types/brandstyle.types";

const BASE = "/api/brandstyle";

// === Analyze ===

export async function analyzeUrl(url: string): Promise<{ jobId: string }> {
  const res = await fetch(`${BASE}/analyze/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error("Failed to start URL analysis");
  return res.json();
}

export async function analyzePdf(file: File): Promise<{ jobId: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE}/analyze/pdf`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to start PDF analysis");
  return res.json();
}

export async function fetchAnalysisStatus(jobId: string): Promise<AnalysisStatusResponse> {
  const res = await fetch(`${BASE}/analyze/status/${jobId}`);
  if (!res.ok) throw new Error("Failed to fetch analysis status");
  return res.json();
}

// === Styleguide CRUD ===

export async function fetchStyleguide(): Promise<{ styleguide: BrandStyleguide | null }> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error("Failed to fetch styleguide");
  return res.json();
}

export async function updateStyleguide(data: Partial<BrandStyleguide>): Promise<{ styleguide: BrandStyleguide }> {
  const res = await fetch(BASE, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update styleguide");
  return res.json();
}

export async function fetchAiContext(): Promise<AiContextResponse> {
  const res = await fetch(`${BASE}/ai-context`);
  if (!res.ok) throw new Error("Failed to fetch AI context");
  return res.json();
}

// === Per-section ===

export async function fetchLogoSection(): Promise<{ logo: LogoSection }> {
  const res = await fetch(`${BASE}/logo`);
  if (!res.ok) throw new Error("Failed to fetch logo section");
  return res.json();
}

export async function updateLogoSection(data: Partial<LogoSection>): Promise<{ logo: LogoSection }> {
  const res = await fetch(`${BASE}/logo`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update logo section");
  return res.json();
}

export async function fetchColorsSection(): Promise<{ colors: ColorsSection }> {
  const res = await fetch(`${BASE}/colors`);
  if (!res.ok) throw new Error("Failed to fetch colors section");
  return res.json();
}

export async function updateColorsSection(data: { colorDonts?: string[] }): Promise<{ colors: ColorsSection }> {
  const res = await fetch(`${BASE}/colors`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update colors section");
  return res.json();
}

export async function addColor(data: Partial<StyleguideColor>): Promise<{ color: StyleguideColor }> {
  const res = await fetch(`${BASE}/colors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add color");
  return res.json();
}

export async function deleteColor(colorId: string): Promise<void> {
  const res = await fetch(`${BASE}/colors/${colorId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete color");
}

export async function fetchTypographySection(): Promise<{ typography: TypographySection }> {
  const res = await fetch(`${BASE}/typography`);
  if (!res.ok) throw new Error("Failed to fetch typography section");
  return res.json();
}

export async function updateTypographySection(data: Partial<TypographySection>): Promise<{ typography: TypographySection }> {
  const res = await fetch(`${BASE}/typography`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update typography section");
  return res.json();
}

// fetchToneOfVoiceSection / updateToneOfVoiceSection verwijderd —
// tone-of-voice consolideert in /api/brandvoiceguide (ADR 2026-05-15).

export async function fetchImagerySection(): Promise<{ imagery: ImagerySection }> {
  const res = await fetch(`${BASE}/imagery`);
  if (!res.ok) throw new Error("Failed to fetch imagery section");
  return res.json();
}

export async function updateImagerySection(data: Partial<ImagerySection>): Promise<{ imagery: ImagerySection }> {
  const res = await fetch(`${BASE}/imagery`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update imagery section");
  return res.json();
}

export async function fetchDesignLanguageSection(): Promise<{ designLanguage: DesignLanguageSection }> {
  const res = await fetch(`${BASE}/design-language`);
  if (!res.ok) throw new Error("Failed to fetch design language section");
  return res.json();
}

export async function updateDesignLanguageSection(data: Partial<DesignLanguageSection>): Promise<{ designLanguage: DesignLanguageSection }> {
  const res = await fetch(`${BASE}/design-language`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update design language section");
  return res.json();
}

// === Save for AI ===

export async function saveForAi(section: SaveForAiSection): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/${section}/save-for-ai`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to save for AI");
  return res.json();
}

// === Brand Assets — Fonts (Fase 1) ===

export async function fetchFonts(): Promise<{ fonts: StyleguideFontData[] }> {
  const res = await fetch(`${BASE}/fonts`);
  if (!res.ok) throw new Error("Failed to fetch fonts");
  return res.json();
}

export async function uploadFont(params: {
  file: File;
  name: string;
  role: FontRole;
  weight?: string;
  style?: string;
}): Promise<{ font: StyleguideFontData }> {
  const fd = new FormData();
  fd.append("file", params.file);
  fd.append("name", params.name);
  fd.append("role", params.role);
  if (params.weight) fd.append("weight", params.weight);
  if (params.style) fd.append("style", params.style);
  const res = await fetch(`${BASE}/fonts`, { method: "POST", body: fd });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Font upload failed: ${body || res.statusText}`);
  }
  return res.json();
}

export async function updateFont(id: string, body: UpdateFontBody): Promise<{ font: StyleguideFontData }> {
  const res = await fetch(`${BASE}/fonts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update font");
  return res.json();
}

export async function deleteFont(id: string): Promise<void> {
  const res = await fetch(`${BASE}/fonts/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete font");
}

// === Brand Assets — Logos (Fase 1) ===

export async function fetchLogos(): Promise<{ logos: StyleguideLogoData[] }> {
  const res = await fetch(`${BASE}/logos`);
  if (!res.ok) throw new Error("Failed to fetch logos");
  return res.json();
}

export async function uploadLogo(params: {
  file: File;
  variant: LogoVariant;
  description?: string;
}): Promise<{ logo: StyleguideLogoData }> {
  const fd = new FormData();
  fd.append("file", params.file);
  fd.append("variant", params.variant);
  if (params.description) fd.append("description", params.description);
  const res = await fetch(`${BASE}/logos`, { method: "POST", body: fd });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Logo upload failed: ${body || res.statusText}`);
  }
  return res.json();
}

export async function updateLogo(id: string, body: UpdateLogoBody): Promise<{ logo: StyleguideLogoData }> {
  const res = await fetch(`${BASE}/logos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update logo");
  return res.json();
}

export async function deleteLogo(id: string): Promise<void> {
  const res = await fetch(`${BASE}/logos/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete logo");
}

// === Components (Fase 5) ===

export async function updateComponent(
  id: string,
  body: UpdateComponentBody,
): Promise<{ component: StyleguideComponentData }> {
  const res = await fetch(`${BASE}/components/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update component");
  return res.json();
}

export async function deleteComponent(id: string): Promise<void> {
  const res = await fetch(`${BASE}/components/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete component");
}

// === Review workflow (Fase 2) ===

export async function updateReview(
  section: string,
  body: UpdateReviewBody,
): Promise<{ review: StyleguideReviewData }> {
  const res = await fetch(`${BASE}/review/${encodeURIComponent(section)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Review update failed: ${text || res.statusText}`);
  }
  return res.json();
}

export async function uploadReviewReference(
  section: string,
  file: File,
): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(
    `${BASE}/review/${encodeURIComponent(section)}/upload-reference`,
    { method: "POST", body: fd },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Reference upload failed: ${text || res.statusText}`);
  }
  return res.json();
}

export async function setPublished(
  published: boolean,
): Promise<{ published: boolean; publishedAt: string | null; missingSections?: string[] }> {
  const res = await fetch(`${BASE}/published`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ published }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body?.error ?? "Failed to update published state") as Error & {
      missingSections?: string[];
    };
    if (Array.isArray(body?.missingSections)) err.missingSections = body.missingSections;
    throw err;
  }
  return res.json();
}

/** Close the review: flips the styleguide to published AND deletes all
 *  StyleguideReview records. After this call the review UI disappears. */
export async function finalizeReview(): Promise<{ success: true }> {
  const res = await fetch(`${BASE}/finalize`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? "Failed to close review");
  }
  return res.json();
}

// === Curatie-signalen (R4-feedback-loop) ===

/** Eén regel die vaak genoeg botst om te bevragen, met de correcties erbij. */
export interface CurationSignalsResponse {
  signals: RuleViolationInput[];
  window: { generations: number; cap: number };
  /** True als er wél gemeten is maar niets de drempel haalde. */
  evaluated: boolean;
  truncated: boolean;
}

export async function fetchCurationSignals(): Promise<CurationSignalsResponse> {
  const res = await fetch(`${BASE}/curation-signals`);
  if (!res.ok) throw new Error("Failed to load curation signals");
  return res.json();
}

/**
 * Voert één inline correctie uit. Wélke route je raakt hangt af van waar de
 * regel vandaan komt: een uit de voiceguide gesyncte BrandRule is niet direct
 * bewerkbaar (`/api/brand-rules/[id]` weigert `auto:*`), dus daar cureren we op
 * het bronveld en ruimt de re-sync de regel op.
 */
export async function runCurationAction(action: CalibrationAskAction): Promise<void> {
  switch (action.kind) {
    case "remove-voiceguide-term": {
      if (!action.sourceFields?.length || !action.term) {
        throw new Error("Missing source field for voice-guide correction");
      }
      const current = await fetch("/api/brandvoiceguide");
      if (!current.ok) throw new Error("Failed to load voice guide");
      const { voiceguide } = await current.json();
      const term = action.term.trim().toLowerCase();

      // Álle bronvelden in één PATCH. Dezelfde term kan uit `wordsWeAvoid` én
      // `vocabularyDont` gesynct zijn; één veld opschonen laat de regel dan
      // vanuit het andere veld gewoon bestaan en de suggestie komt terug.
      const body: Record<string, string[]> = {};
      for (const field of action.sourceFields) {
        const existing: string[] = voiceguide?.[field] ?? [];
        const next = existing.filter((w) => w.trim().toLowerCase() !== term);
        if (next.length !== existing.length) body[field] = next;
      }
      if (Object.keys(body).length === 0) {
        throw new Error(`"${action.term}" is no longer in your voice guide`);
      }
      const res = await fetch("/api/brandvoiceguide", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update voice guide");
      return;
    }
    case "weaken-brand-rule": {
      const res = await fetch(`/api/brand-rules/${action.ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ severity: "info" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to weaken rule");
      }
      return;
    }
    case "delete-brand-rule": {
      const res = await fetch(`/api/brand-rules/${action.ruleId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to delete rule");
      }
      return;
    }
    case "weaken-styleguide-rule": {
      const res = await fetch(`${BASE}/rules/${action.ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ severity: "ADVISORY" }),
      });
      if (!res.ok) throw new Error("Failed to weaken rule");
      return;
    }
    case "delete-styleguide-rule": {
      const res = await fetch(`${BASE}/rules/${action.ruleId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete rule");
      return;
    }
  }
}
