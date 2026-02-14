# BRANDDOCK — Implementatieplan Fase 1B
## AI Brand Analysis — Chat Interface + Rapport Generatie
**Datum:** 13 februari 2026
**Doel:** Chat-gebaseerde AI analyse per brand asset + rapport met findings & recommendations
**Vereist:** Fase 11 ✅ + Fase 1A ✅
**Geschatte duur:** 2 sessies (meest complexe module tot nu toe)

---

## HOE DIT PLAN TE GEBRUIKEN

```bash
# In Claude Code:
> Lees IMPLEMENTATIEPLAN-FASE-1B.md en voer Stap 1 uit.
```

---

## OVERZICHT

Fase 1B is **de enige module in het platform met een chat interface**. De flow:

```
Brand Asset card → "AI Exploration" klik
  → Chat interface (AI stelt vragen, user beantwoordt)
    → Progress bar (kan >100%)
      → "Generate Brand Report"
        → Rapport: Executive Summary + 5 Findings + 5 Recommendations
          → Terug naar Asset Detail (validation % updated)
```

**Belangrijk:** Deze module vereist OpenAI integratie. Voor de MVP bouwen we de volledige UI + API structuur met **mock AI responses**. Echte OpenAI integratie kan later worden aangesloten zonder UI-wijzigingen.

---

## STAP 1: DATABASE UITBREIDEN

### Stap 1A — Prisma Schema

**Toevoegen aan `prisma/schema.prisma`:**
```prisma
// === FASE 1B: AI BRAND ANALYSIS ===

model AIBrandAnalysisSession {
  id                String            @id @default(cuid())
  status            AIAnalysisStatus  @default(NOT_STARTED)
  progress          Float             @default(0)
  totalQuestions    Int               @default(0)
  answeredQuestions Int               @default(0)
  reportData        Json?
  locked            Boolean           @default(false)
  completedAt       DateTime?

  // Relations
  brandAssetId      String
  brandAsset        BrandAsset        @relation(fields: [brandAssetId], references: [id], onDelete: Cascade)
  workspaceId       String
  workspace         Workspace         @relation(fields: [workspaceId], references: [id])
  createdById       String
  createdBy         User              @relation(fields: [createdById], references: [id])

  messages          AIAnalysisMessage[]

  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  @@index([brandAssetId])
  @@index([workspaceId])
}

model AIAnalysisMessage {
  id          String          @id @default(cuid())
  type        AIMessageType
  content     String          @db.Text
  orderIndex  Int
  metadata    Json?

  sessionId   String
  session     AIBrandAnalysisSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  createdAt   DateTime        @default(now())

  @@index([sessionId, orderIndex])
}

enum AIAnalysisStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  REPORT_GENERATING
  REPORT_READY
  ERROR
}

enum AIMessageType {
  SYSTEM_INTRO
  AI_QUESTION
  USER_ANSWER
  AI_FEEDBACK
}
```

**Relaties toevoegen aan bestaande modellen:**
```prisma
// In model BrandAsset:
aiAnalysisSessions AIBrandAnalysisSession[]

// In model Workspace:
aiAnalysisSessions AIBrandAnalysisSession[]

// In model User:
aiAnalysisSessions AIBrandAnalysisSession[]
```

### Stap 1B — Migratie + Seed

```bash
npx prisma migrate dev --name add-ai-brand-analysis
```

**Seed data:** Voeg 1 voorbeeld-sessie toe aan de seed met 6 berichten (intro + 2 Q&A paren + feedback).

```typescript
// In prisma/seed.ts — voeg toe na brand assets

// Pak het "Vision Statement" asset (status READY, 92% coverage)
const visionAsset = await prisma.brandAsset.findFirst({
  where: { slug: "vision-statement", workspaceId: workspace.id },
});

if (visionAsset) {
  const session = await prisma.aIBrandAnalysisSession.create({
    data: {
      status: "REPORT_READY",
      progress: 100,
      totalQuestions: 5,
      answeredQuestions: 5,
      brandAssetId: visionAsset.id,
      workspaceId: workspace.id,
      createdById: user.id,
      completedAt: new Date(),
      reportData: JSON.stringify({
        executiveSummary: "The Vision Statement analysis reveals a strong forward-looking direction with clear alignment to market trends. Key strengths include differentiation through brand-led innovation and a compelling long-term narrative.",
        findings: [
          { key: "brand_purpose", title: "Clear Purpose Alignment", description: "Your vision directly connects to societal impact through brand-led innovation." },
          { key: "target_audience", title: "Audience Resonance", description: "The vision speaks to tech-savvy professionals seeking meaningful brand connections." },
          { key: "unique_value", title: "Distinctive Positioning", description: "Strong differentiation through the combination of AI-driven insights and human creativity." },
          { key: "customer_challenge", title: "Pain Point Addressed", description: "Addresses the gap between brand strategy and consistent content execution." },
          { key: "market_position", title: "Market Opportunity", description: "Positioned at the intersection of brand strategy tools and AI content generation." },
        ],
        recommendations: [
          { number: 1, title: "Strengthen Emotional Connection", description: "Add more aspirational language to create deeper emotional resonance.", priority: "high" },
          { number: 2, title: "Quantify Impact Goals", description: "Include measurable milestones to track vision achievement.", priority: "high" },
          { number: 3, title: "Align Team Communication", description: "Create internal messaging that mirrors the external vision.", priority: "medium" },
          { number: 4, title: "Test with Stakeholders", description: "Validate the vision statement with key customer segments.", priority: "medium" },
          { number: 5, title: "Review Competitive Landscape", description: "Ensure differentiation is maintained as market evolves.", priority: "low" },
        ],
        dataPointsCount: 24,
        sourcesCount: 3,
        confidenceScore: 87,
        completedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      }),
    },
  });

  // 6 berichten voor de sessie
  const messages = [
    { type: "SYSTEM_INTRO", content: "Welcome to AI Brand Analysis for your Vision Statement. I'll ask you a series of questions to understand your brand's direction and generate a comprehensive report.", orderIndex: 0 },
    { type: "AI_QUESTION", content: "What is the core purpose behind your brand's existence? Think beyond profit — what change do you want to create in the world?", orderIndex: 1 },
    { type: "USER_ANSWER", content: "We exist to bridge the gap between brand strategy and execution. Too many companies have great brand visions but struggle to translate them into consistent, high-quality content across channels.", orderIndex: 2 },
    { type: "AI_FEEDBACK", content: "That's a powerful purpose — bridging strategy and execution is a real pain point for many organizations. Your focus on consistency across channels suggests a systems-thinking approach.", orderIndex: 3 },
    { type: "AI_QUESTION", content: "Who is your primary audience, and what transformation do you promise them?", orderIndex: 4 },
    { type: "USER_ANSWER", content: "Brand managers and marketing teams at mid-size companies who want to maintain brand consistency without hiring a full agency. We promise them confidence that every piece of content aligns with their brand.", orderIndex: 5 },
  ];

  for (const msg of messages) {
    await prisma.aIAnalysisMessage.create({
      data: { ...msg, type: msg.type as any, sessionId: session.id },
    });
  }
}
```

```bash
npx prisma db seed
```

### ✅ Stap 1 Checklist
- [ ] `AIBrandAnalysisSession` + `AIAnalysisMessage` modellen in schema
- [ ] Enums `AIAnalysisStatus` + `AIMessageType` aangemaakt
- [ ] Relaties toegevoegd aan BrandAsset, Workspace, User
- [ ] Migratie geslaagd
- [ ] Seed: 1 sessie (REPORT_READY) met 6 berichten + rapport data

---

## STAP 2: TYPES + API ENDPOINTS

### Stap 2A — Types

**Bestand:** `src/types/ai-analysis.ts`
```typescript
// === Enums ===
export type AIAnalysisStatus =
  | "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"
  | "REPORT_GENERATING" | "REPORT_READY" | "ERROR";

export type AIMessageType = "SYSTEM_INTRO" | "AI_QUESTION" | "USER_ANSWER" | "AI_FEEDBACK";

// === Entities ===
export interface AIAnalysisMessage {
  id: string;
  type: AIMessageType;
  content: string;
  orderIndex: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AIBrandAnalysisSession {
  id: string;
  status: AIAnalysisStatus;
  progress: number;
  totalQuestions: number;
  answeredQuestions: number;
  locked: boolean;
  completedAt: string | null;
  brandAssetId: string;
  createdAt: string;
}

// === Report ===
export interface AIAnalysisReportData {
  executiveSummary: string;
  findings: AIFinding[];
  recommendations: AIRecommendation[];
  dataPointsCount: number;
  sourcesCount: number;
  confidenceScore: number;
  completedAt: string;
  lastUpdatedAt: string;
}

export type FindingKey = "brand_purpose" | "target_audience" | "unique_value" | "customer_challenge" | "market_position";

export interface AIFinding {
  key: FindingKey;
  title: string;
  description: string;
}

export interface AIRecommendation {
  number: number;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

// === API Responses ===
export interface StartAnalysisResponse {
  sessionId: string;
  status: "IN_PROGRESS";
  messages: AIAnalysisMessage[];
}

export interface SubmitAnswerResponse {
  feedback: AIAnalysisMessage;
  nextQuestion: AIAnalysisMessage | null;
  progress: number;
  answeredQuestions: number;
  totalQuestions: number;
  isComplete: boolean;
}

export interface SessionWithMessages {
  session: AIBrandAnalysisSession;
  messages: AIAnalysisMessage[];
}

export interface ReportResponse {
  reportData: AIAnalysisReportData;
  status: "REPORT_READY";
}
```

### Stap 2B — Mock AI Service

**Bestand:** `src/lib/ai/mock-analysis.ts`

Dit bestand simuleert AI responses. Later vervangbaar door echte OpenAI calls.

```typescript
const ANALYSIS_QUESTIONS: string[] = [
  "What is the core purpose behind your brand's existence? Think beyond profit — what change do you want to create in the world?",
  "Who is your primary audience, and what transformation do you promise them?",
  "What makes your brand uniquely different from alternatives in your market?",
  "What is the biggest challenge your customers face that your brand addresses?",
  "Where do you see your brand's market position in 3-5 years?",
];

export function getNextQuestion(answeredCount: number): string | null {
  if (answeredCount >= ANALYSIS_QUESTIONS.length) return null;
  return ANALYSIS_QUESTIONS[answeredCount];
}

export function getTotalQuestions(): number {
  return ANALYSIS_QUESTIONS.length;
}

export function generateFeedback(_userAnswer: string): string {
  const feedbacks = [
    "That's a compelling perspective. Your focus on impact beyond profit suggests a strong purpose-driven foundation.",
    "Interesting target audience definition. The specificity helps create focused brand messaging.",
    "Your differentiation is clear. This unique positioning can be a strong competitive advantage.",
    "You've identified a genuine pain point. Addressing this directly strengthens your value proposition.",
    "Your market vision is ambitious yet grounded. This forward-looking perspective will guide strategic decisions.",
  ];
  return feedbacks[Math.floor(Math.random() * feedbacks.length)];
}

export function generateMockReport() {
  return {
    executiveSummary: "Based on the analysis of your responses, your brand demonstrates strong foundational elements with clear market differentiation. Key areas for improvement include deeper audience validation and competitive positioning refinement.",
    findings: [
      { key: "brand_purpose" as const, title: "Purpose-Driven Foundation", description: "Your brand has a clear societal purpose that goes beyond commercial goals." },
      { key: "target_audience" as const, title: "Defined Audience Segment", description: "Well-articulated target audience with specific needs and transformation goals." },
      { key: "unique_value" as const, title: "Clear Differentiation", description: "Strong unique value proposition that sets the brand apart from competitors." },
      { key: "customer_challenge" as const, title: "Pain Point Clarity", description: "Deep understanding of customer challenges that the brand addresses." },
      { key: "market_position" as const, title: "Strategic Market View", description: "Forward-looking market position with clear growth trajectory." },
    ],
    recommendations: [
      { number: 1, title: "Validate with Real Customers", description: "Conduct 5-10 customer interviews to validate assumptions.", priority: "high" as const },
      { number: 2, title: "Quantify Your Promise", description: "Add measurable outcomes to your brand promise.", priority: "high" as const },
      { number: 3, title: "Map Competitor Gaps", description: "Document specific areas where competitors fall short.", priority: "medium" as const },
      { number: 4, title: "Create Internal Alignment", description: "Ensure all team members can articulate the brand story consistently.", priority: "medium" as const },
      { number: 5, title: "Test Messaging Variations", description: "A/B test key brand messages with target audience segments.", priority: "low" as const },
    ],
    dataPointsCount: 18,
    sourcesCount: 2,
    confidenceScore: 72,
  };
}
```

### Stap 2C — API Endpoints

**Bestanden aanmaken:**

| # | Bestand | Route | Methode |
|---|---------|-------|---------|
| 1 | `src/app/api/brand-assets/[id]/ai-analysis/route.ts` | `/api/brand-assets/:id/ai-analysis` | POST (start sessie) |
| 2 | `src/app/api/brand-assets/[id]/ai-analysis/[sessionId]/route.ts` | `.../:sessionId` | GET (sessie + messages) |
| 3 | `src/app/api/brand-assets/[id]/ai-analysis/[sessionId]/answer/route.ts` | `.../:sessionId/answer` | POST (submit antwoord) |
| 4 | `src/app/api/brand-assets/[id]/ai-analysis/[sessionId]/complete/route.ts` | `.../:sessionId/complete` | POST (markeer compleet) |
| 5 | `src/app/api/brand-assets/[id]/ai-analysis/[sessionId]/generate-report/route.ts` | `.../:sessionId/generate-report` | POST (genereer rapport) |
| 6 | `src/app/api/brand-assets/[id]/ai-analysis/[sessionId]/report/route.ts` | `.../:sessionId/report` | GET (rapport ophalen) |
| 7 | `src/app/api/brand-assets/[id]/ai-analysis/[sessionId]/lock/route.ts` | `.../:sessionId/lock` | PATCH (lock toggle) |

**Key endpoint logica:**

**POST start — Sessie starten:**
```typescript
// 1. Maak AIBrandAnalysisSession aan (status: IN_PROGRESS)
// 2. Maak SYSTEM_INTRO bericht
// 3. Maak eerste AI_QUESTION bericht
// 4. Set totalQuestions = getTotalQuestions() (5)
// 5. Return: { sessionId, status, messages }
```

**POST /answer — Antwoord verwerken:**
```typescript
// 1. Sla user antwoord op als AIAnalysisMessage (type: USER_ANSWER)
// 2. Genereer AI feedback via mock service (type: AI_FEEDBACK)
// 3. Genereer volgende vraag als er nog vragen zijn (type: AI_QUESTION)
// 4. Update session: answeredQuestions++, progress = (answered / total) * 100
// 5. Return: { feedback, nextQuestion, progress, isComplete }
```

**POST /generate-report — Rapport genereren:**
```typescript
// 1. Check status === COMPLETED
// 2. Set status → REPORT_GENERATING
// 3. Genereer mock rapport via generateMockReport()
// 4. Sla reportData op als JSON
// 5. Set status → REPORT_READY
// 6. Update BrandAsset: aiValidated = true
// 7. Herbereken coveragePercentage met gewichten
// 8. Return: { status: "REPORT_GENERATING", estimatedTime: 3 }
```

**Zod Validatie:**
```typescript
const startAnalysisSchema = z.object({
  personaId: z.string().cuid().optional(),
});

const submitAnswerSchema = z.object({
  content: z.string().min(1).max(5000),
});

const lockSessionSchema = z.object({
  locked: z.boolean(),
});
```

### Stap 2D — API Client

**Bestand:** `src/lib/api/ai-analysis.ts`
```typescript
import type {
  StartAnalysisResponse, SessionWithMessages, SubmitAnswerResponse, ReportResponse,
} from "@/types/ai-analysis";

const BASE = "/api/brand-assets";

export async function startAnalysis(assetId: string, personaId?: string): Promise<StartAnalysisResponse> {
  const res = await fetch(`${BASE}/${assetId}/ai-analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personaId }),
  });
  if (!res.ok) throw new Error("Failed to start analysis");
  return res.json();
}

export async function getSession(assetId: string, sessionId: string): Promise<SessionWithMessages> {
  const res = await fetch(`${BASE}/${assetId}/ai-analysis/${sessionId}`);
  if (!res.ok) throw new Error("Failed to get session");
  return res.json();
}

export async function submitAnswer(assetId: string, sessionId: string, content: string): Promise<SubmitAnswerResponse> {
  const res = await fetch(`${BASE}/${assetId}/ai-analysis/${sessionId}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Failed to submit answer");
  return res.json();
}

export async function completeAnalysis(assetId: string, sessionId: string): Promise<void> {
  const res = await fetch(`${BASE}/${assetId}/ai-analysis/${sessionId}/complete`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to complete analysis");
}

export async function generateReport(assetId: string, sessionId: string): Promise<{ status: string; estimatedTime: number }> {
  const res = await fetch(`${BASE}/${assetId}/ai-analysis/${sessionId}/generate-report`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to generate report");
  return res.json();
}

export async function getReport(assetId: string, sessionId: string): Promise<ReportResponse> {
  const res = await fetch(`${BASE}/${assetId}/ai-analysis/${sessionId}/report`);
  if (!res.ok) throw new Error("Failed to get report");
  return res.json();
}

export async function toggleLock(assetId: string, sessionId: string, locked: boolean): Promise<{ locked: boolean }> {
  const res = await fetch(`${BASE}/${assetId}/ai-analysis/${sessionId}/lock`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locked }),
  });
  if (!res.ok) throw new Error("Failed to toggle lock");
  return res.json();
}
```

### ✅ Stap 2 Checklist
- [ ] Types in `src/types/ai-analysis.ts`
- [ ] Mock AI service in `src/lib/ai/mock-analysis.ts`
- [ ] 7 API route bestanden aangemaakt
- [ ] POST start sessie: intro + eerste vraag
- [ ] POST answer: feedback + volgende vraag + progress
- [ ] POST generate-report: mock rapport + BrandAsset update
- [ ] GET report: rapport data
- [ ] API client functies beschikbaar

---

## STAP 3: STORE + TANSTACK QUERY HOOKS

### Stap 3A — Zustand Store

**Bestand:** `src/stores/useAIAnalysisStore.ts`
```typescript
import { create } from "zustand";
import type { AIAnalysisStatus, AIAnalysisMessage, AIAnalysisReportData } from "@/types/ai-analysis";

interface AIAnalysisStore {
  sessionId: string | null;
  status: AIAnalysisStatus;
  progress: number;
  totalQuestions: number;
  answeredQuestions: number;
  messages: AIAnalysisMessage[];
  isLocked: boolean;
  isAITyping: boolean;
  currentInputValue: string;
  reportData: AIAnalysisReportData | null;
  isGeneratingReport: boolean;

  setSessionId: (id: string | null) => void;
  setStatus: (status: AIAnalysisStatus) => void;
  setProgress: (progress: number, answered: number, total: number) => void;
  setMessages: (messages: AIAnalysisMessage[]) => void;
  addMessage: (message: AIAnalysisMessage) => void;
  setAITyping: (typing: boolean) => void;
  setCurrentInput: (value: string) => void;
  setReportData: (data: AIAnalysisReportData | null) => void;
  setGeneratingReport: (generating: boolean) => void;
  setLocked: (locked: boolean) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  status: "NOT_STARTED" as AIAnalysisStatus,
  progress: 0,
  totalQuestions: 0,
  answeredQuestions: 0,
  messages: [],
  isLocked: false,
  isAITyping: false,
  currentInputValue: "",
  reportData: null,
  isGeneratingReport: false,
};

export const useAIAnalysisStore = create<AIAnalysisStore>((set) => ({
  ...initialState,
  setSessionId: (id) => set({ sessionId: id }),
  setStatus: (status) => set({ status }),
  setProgress: (progress, answered, total) => set({ progress, answeredQuestions: answered, totalQuestions: total }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  setAITyping: (typing) => set({ isAITyping: typing }),
  setCurrentInput: (value) => set({ currentInputValue: value }),
  setReportData: (data) => set({ reportData: data }),
  setGeneratingReport: (generating) => set({ isGeneratingReport: generating }),
  setLocked: (locked) => set({ isLocked: locked }),
  reset: () => set(initialState),
}));
```

### Stap 3B — TanStack Query Hooks

**Bestand:** `src/lib/api/ai-analysis-hooks.ts`
```typescript
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "./ai-analysis";
import { brandAssetKeys } from "./brand-asset-hooks";

export const aiAnalysisKeys = {
  all:     ["ai-analysis"] as const,
  session: (assetId: string, sessionId: string) => ["ai-analysis", "session", assetId, sessionId] as const,
  report:  (assetId: string, sessionId: string) => ["ai-analysis", "report", assetId, sessionId] as const,
};

export function useAIAnalysisSession(assetId: string, sessionId: string) {
  return useQuery({
    queryKey: aiAnalysisKeys.session(assetId, sessionId),
    queryFn: () => api.getSession(assetId, sessionId),
    staleTime: Infinity,
  });
}

export function useStartAnalysis(assetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (personaId?: string) => api.startAnalysis(assetId, personaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: aiAnalysisKeys.all }),
  });
}

export function useSendAnswer(assetId: string, sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => api.submitAnswer(assetId, sessionId, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: aiAnalysisKeys.session(assetId, sessionId) }),
  });
}

export function useGenerateReport(assetId: string, sessionId: string) {
  return useMutation({
    mutationFn: () => api.generateReport(assetId, sessionId),
  });
}

export function useAIAnalysisReport(assetId: string, sessionId: string, enabled: boolean) {
  return useQuery({
    queryKey: aiAnalysisKeys.report(assetId, sessionId),
    queryFn: () => api.getReport(assetId, sessionId),
    enabled,
    refetchInterval: (query) => {
      if (query.state.data?.status === "REPORT_READY") return false;
      return 2000;
    },
  });
}

export function useCompleteAnalysis(assetId: string, sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.completeAnalysis(assetId, sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: aiAnalysisKeys.session(assetId, sessionId) }),
  });
}

export function useToggleLock(assetId: string, sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (locked: boolean) => api.toggleLock(assetId, sessionId, locked),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiAnalysisKeys.session(assetId, sessionId) });
      queryClient.invalidateQueries({ queryKey: brandAssetKeys.all });
    },
  });
}
```

### ✅ Stap 3 Checklist
- [ ] Zustand store met sessie, UI en rapport state
- [ ] TanStack Query hooks: session, start, answer, report, complete, lock
- [ ] Report polling elke 2s tot REPORT_READY
- [ ] Cache invalidatie na mutaties (inclusief brand-assets)

---

## STAP 4: UI COMPONENTEN — CHAT INTERFACE

### Stap 4A — Mappenstructuur

```bash
mkdir -p src/components/ai-analysis
mkdir -p src/components/ai-analysis/report
```

### Stap 4B — Chat Componenten (bouw in volgorde)

| # | Component | Beschrijving |
|---|-----------|-------------|
| 1 | `ChatBubble.tsx` | Berichtbubble — 4 varianten |
| 2 | `TypingIndicator.tsx` | 3 pulserende dots |
| 3 | `MessageList.tsx` | Scrollbare lijst + auto-scroll |
| 4 | `InputArea.tsx` | Textarea + submit |
| 5 | `OverflowProgressBar.tsx` | Progress bar die >100% kan |
| 6 | `NavigationButtons.tsx` | 3 states: during/at100/completed |
| 7 | `AllAnsweredBanner.tsx` | Completion banner + Generate knop |
| 8 | `PageHeader.tsx` | Icoon + titel + breadcrumb + status |
| 9 | `ChatInterface.tsx` | Container die alles combineert |
| 10 | `AIBrandAnalysisPage.tsx` | Hoofdpagina met routing |

### Design Tokens per Component

#### ChatBubble (4 varianten)
```
SYSTEM_INTRO (links):
  Container:  flex gap-3
  Icon:       w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center
  Icon inner: Building2 w-4 h-4 text-emerald-600
  Bubble:     bg-gray-50 border border-gray-200 rounded-lg rounded-tl-none p-4 max-w-[80%]
  Text:       text-sm text-gray-700

AI_QUESTION (links):
  (zelfde als SYSTEM_INTRO)

AI_FEEDBACK (links):
  Bubble:     bg-emerald-50 border border-emerald-200 rounded-lg rounded-tl-none p-4 max-w-[80%]
  Icon inner: Sparkles w-4 h-4 text-emerald-600

USER_ANSWER (rechts):
  Container:  flex justify-end
  Bubble:     bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg rounded-tr-none p-4 max-w-[80%]
  Text:       text-sm text-white
  Geen icoon
```

#### TypingIndicator
```
Container:  flex gap-3 (zelfde layout als AI bubble)
Dots:       flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg rounded-tl-none px-4 py-3
Dot:        w-2 h-2 rounded-full bg-gray-400
Animation:  animate-pulse met staggered delay (0s, 0.2s, 0.4s)
```

#### InputArea
```
Container:  border-t border-gray-200 p-4 bg-white
Textarea:   w-full border border-gray-200 rounded-lg px-4 py-3 text-sm resize-none
            min-h-[60px] max-h-[200px] overflow-y-auto
            focus:ring-2 focus:ring-teal-500 focus:border-transparent
            placeholder="Type your answer..."
Submit:     bg-teal-500 text-white rounded-lg px-4 py-2 text-sm hover:bg-teal-600
            disabled: opacity-50 cursor-not-allowed
Enter:      Submit bij Enter (Shift+Enter voor newline)
```

#### OverflowProgressBar
```
Container:    flex items-center gap-3
Track:        flex-1 h-2 rounded-full bg-gray-200 overflow-hidden
Fill:         h-2 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500
              transition-all duration-600 ease
              width: min(progress, 100)%
Label:        text-sm font-medium min-w-[48px] text-right
Label kleur:  <25%: text-red-500 | 25-49%: text-amber-500 | 50-99%: text-blue-500 | >=100%: text-emerald-500
Extra:        als >100%: toon bijv. "125%"
```

#### NavigationButtons (3 states)
```
State: during_questions (progress < 100%)
  Links:   "← Previous" — border border-gray-200 text-gray-700 rounded-lg px-4 py-2
  Rechts:  "Next →" — border border-gray-200 text-gray-700 rounded-lg px-4 py-2

State: at_100_percent (progress >= 100%, status !== COMPLETED)
  Links:   "← Previous" — outline
  Rechts:  "Complete →" — bg-teal-500 text-white rounded-lg px-4 py-2

State: after_completion (status === COMPLETED)
  Banner:  bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3
           CheckCircle w-5 h-5 text-emerald-600 + "All questions answered!" text-sm font-medium
  Button:  bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-6 py-3 rounded-lg font-medium
           Sparkles w-4 h-4 + "Generate Brand Report"
```

#### PageHeader
```
Container:      flex items-center justify-between mb-6
Left:
  Breadcrumb:   text-sm text-gray-400 hover:text-gray-600 cursor-pointer → "← Back to Asset"
  Title row:    flex items-center gap-3
  Icon:         w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center
  Icon inner:   Building2 w-6 h-6 text-emerald-600
  Title:        text-2xl font-bold text-gray-900 → "AI Brand Analysis"
  Subtitle:     text-sm text-gray-500 → "Answer questions to generate your brand framework"
Right:
  Status select: text-sm border border-gray-200 rounded-lg px-3 py-1.5
```

### ✅ Stap 4 Checklist
- [ ] 4 ChatBubble varianten (intro/vraag grijs, feedback groen, user paars gradient)
- [ ] Typing indicator: 3 pulserende dots
- [ ] Auto-scroll naar nieuwste bericht
- [ ] Textarea: min-h-60px, max-h-200px, Enter submit, Shift+Enter newline
- [ ] Progress bar: gradient, >100% support, label kleur per range
- [ ] 3 navigatie-states schakelen correct
- [ ] Completion banner + Generate Report knop
- [ ] Page header met breadcrumb + icoon + titel

---

## STAP 5: UI COMPONENTEN — RAPPORT

### Stap 5A — Rapport Componenten (bouw in volgorde)

| # | Component | Beschrijving |
|---|-----------|-------------|
| 1 | `report/SuccessBanner.tsx` | Rapport klaar banner met metadata |
| 2 | `report/ExportToolbar.tsx` | Lock + PDF + Raw data knoppen |
| 3 | `report/ExecutiveSummary.tsx` | Samenvatting sectie |
| 4 | `report/FindingCard.tsx` | Enkele finding met icoon |
| 5 | `report/FindingCardsGrid.tsx` | Grid van 5 findings |
| 6 | `report/RecommendationItem.tsx` | Enkele recommendation met badge |
| 7 | `report/RecommendationsList.tsx` | Lijst van 5 recommendations |
| 8 | `report/ReportView.tsx` | Container die alles combineert |

### Design Tokens

#### SuccessBanner
```
Container:  bg-emerald-50 border border-emerald-200 rounded-xl p-6
Icon:       CheckCircle w-8 h-8 text-emerald-500
Title:      text-lg font-semibold text-gray-900 → "Analysis Complete"
Meta:       flex gap-6 mt-2 text-sm text-gray-500
            "{dataPointsCount} data points analyzed"
            "{sourcesCount} sources referenced"
            "Completed {date}"
```

#### ExportToolbar
```
Container:  flex items-center gap-2
Lock btn:   p-2 rounded-lg hover:bg-gray-100, Lock/Unlock icoon w-4 h-4 text-gray-400
PDF btn:    border border-gray-200 rounded-lg px-3 py-1.5 text-sm, FileDown w-4 h-4 + "Export PDF"
Raw btn:    border border-gray-200 rounded-lg px-3 py-1.5 text-sm, Code w-4 h-4 + "Raw Data"
```

#### FindingCard
```
Container:  bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow
Icon box:   w-10 h-10 rounded-lg flex items-center justify-center
Title:      text-base font-semibold text-gray-900 mt-3
Desc:       text-sm text-gray-600 mt-1
Grid:       grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4

5 findings:
  brand_purpose:      Target      bg-red-50     text-red-500
  target_audience:    Users       bg-blue-50    text-blue-500
  unique_value:       Sparkles    bg-purple-50  text-purple-500
  customer_challenge: Lightbulb   bg-amber-50   text-amber-500
  market_position:    TrendingUp  bg-emerald-50 text-emerald-500
```

#### RecommendationItem
```
Container:  flex gap-4 p-4 bg-white rounded-lg border border-gray-100
Badge:      w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center
Kleuren:    #1 bg-red-500, #2 bg-orange-500, #3 bg-amber-500, #4 bg-lime-500, #5 bg-teal-500
Title:      text-sm font-semibold text-gray-900
Desc:       text-sm text-gray-600
Priority:   text-xs uppercase font-medium (high: text-red-500, medium: text-amber-500, low: text-gray-400)
```

#### Confidence Score (in ReportView header)
```
Display:    text-3xl font-bold + "/100"
Kleuren:    0-39: text-red-500 bg-red-50 | 40-69: text-amber-500 bg-amber-50
            70-89: text-lime-500 bg-lime-50 | 90-100: text-emerald-500 bg-emerald-50
```

### Stap 5B — Route Aanmaken

**Bestand:** `src/app/knowledge/brand-foundation/[slug]/ai-analysis/page.tsx`
```tsx
import { AIBrandAnalysisPage } from "@/components/ai-analysis/AIBrandAnalysisPage";

export default function Page({ params }: { params: { slug: string } }) {
  return <AIBrandAnalysisPage assetSlug={params.slug} />;
}
```

### ✅ Stap 5 Checklist
- [ ] Success banner met metadata
- [ ] Export toolbar: Lock, PDF, Raw Data
- [ ] Executive Summary sectie
- [ ] 5 Finding cards met unieke iconen/kleuren
- [ ] 5 Recommendations met kleur-gradient badges (#1 rood → #5 teal)
- [ ] Confidence score met juiste kleur per range
- [ ] Route werkt

---

## STAP 6: INTEGRATIE + AFRONDEN

### Stap 6A — Navigatie Vanuit Fase 1A

Update BrandAssetCard zodat het Sparkles (AI) icoon klikbaar is:
- Navigeert naar `/knowledge/brand-foundation/[slug]/ai-analysis`

### Stap 6B — Research Method Update bij Rapport Generatie

**In generate-report endpoint:**
```typescript
// 1. BrandAsset.aiValidated = true
// 2. Herbereken validatedCount
// 3. Herbereken coveragePercentage:

const VALIDATION_WEIGHTS = {
  ai: 0.15,
  workshop: 0.30,
  interview: 0.25,
  questionnaire: 0.30,
};

function calculateCoverage(asset: { aiValidated: boolean; workshopValidated: boolean; interviewValidated: boolean; questionnaireValidated: boolean }): number {
  let coverage = 0;
  if (asset.aiValidated) coverage += VALIDATION_WEIGHTS.ai * 100;
  if (asset.workshopValidated) coverage += VALIDATION_WEIGHTS.workshop * 100;
  if (asset.interviewValidated) coverage += VALIDATION_WEIGHTS.interview * 100;
  if (asset.questionnaireValidated) coverage += VALIDATION_WEIGHTS.questionnaire * 100;
  return Math.round(coverage);
}
```

### Stap 6C — View Switching

AIBrandAnalysisPage toont:
- **Chat view** wanneer status = NOT_STARTED, IN_PROGRESS, of COMPLETED
- **Report view** wanneer status = REPORT_READY
- **Loading** wanneer status = REPORT_GENERATING

### ✅ Stap 6 Checklist
- [ ] AI icoon op BrandAssetCard navigeert naar analyse
- [ ] Na rapport: aiValidated → true, coverage herberekend
- [ ] Chat → Report transitie werkt
- [ ] Terug-navigatie naar Brand Foundation

---

## VOLLEDIGE ACCEPTATIECRITERIA

### Chat Interface
- [ ] 4 berichttypen correct (intro grijs, vraag grijs, antwoord paars gradient, feedback groen)
- [ ] Auto-scroll naar nieuwste bericht
- [ ] Typing indicator (3 pulserende dots)
- [ ] Textarea: min-h-60px, max-h-200px, Enter submit, Shift+Enter newline
- [ ] Submit disabled als input leeg of AI typt

### Progress & Navigatie
- [ ] Progress bar gradient (blauw→groen)
- [ ] Label kleur: <25% rood, 25-49% amber, 50-99% blauw, >=100% groen
- [ ] Progress >100% correct
- [ ] 3 navigatie-states correct
- [ ] Completion banner + Generate Report knop

### Rapport
- [ ] Success banner met data points, sources, datum
- [ ] Export toolbar: Lock + PDF + Raw Data
- [ ] 5 Finding cards met unieke iconen/kleuren
- [ ] 5 Recommendations met kleur-gradient badges
- [ ] Executive Summary
- [ ] Confidence score met juiste kleur

### Integratie
- [ ] aiValidated → true na rapport
- [ ] Coverage % herberekend (gewicht 0.15)
- [ ] Cache invalidatie
- [ ] Route werkt

### Technisch
- [ ] Mock AI service (later vervangbaar door OpenAI)
- [ ] Zustand store + TanStack Query
- [ ] Report polling 2s
- [ ] Zod validatie
- [ ] 0 TypeScript errors, 0 ESLint errors

---

*Einde implementatieplan — 13 februari 2026*
*~550 regels, 6 stappen, AI Brand Analysis chat + rapport*
