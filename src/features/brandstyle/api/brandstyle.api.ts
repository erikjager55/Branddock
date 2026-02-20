import type {
  BrandStyleguide,
  AnalysisStatusResponse,
  LogoSection,
  ColorsSection,
  TypographySection,
  ToneOfVoiceSection,
  ImagerySection,
  StyleguideColor,
  AiContextResponse,
  SaveForAiSection,
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

export async function exportPdf(): Promise<void> {
  const res = await fetch(`${BASE}/export-pdf`, { method: "POST" });
  if (!res.ok) throw new Error("PDF export not yet available");
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

export async function fetchToneOfVoiceSection(): Promise<{ toneOfVoice: ToneOfVoiceSection }> {
  const res = await fetch(`${BASE}/tone-of-voice`);
  if (!res.ok) throw new Error("Failed to fetch tone of voice section");
  return res.json();
}

export async function updateToneOfVoiceSection(data: Partial<ToneOfVoiceSection>): Promise<{ toneOfVoice: ToneOfVoiceSection }> {
  const res = await fetch(`${BASE}/tone-of-voice`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update tone of voice section");
  return res.json();
}

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

// === Save for AI ===

export async function saveForAi(section: SaveForAiSection): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/${section}/save-for-ai`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to save for AI");
  return res.json();
}
