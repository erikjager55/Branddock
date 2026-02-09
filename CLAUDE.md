# Branddock

## Project Overview
Branddock is a SaaS platform that combines brand strategy, validation through research, and content creation in a single workflow. The core loop is: Knowledge → Strategy → Content, where all content is campaign-driven and research-backed.

## Tech Stack
- **Framework:** Next.js 15 (App Router, TypeScript strict)
- **Styling:** Tailwind CSS 4, dark mode via `class` strategy
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** NextAuth v5 (Google + Microsoft OAuth)
- **State:** Zustand (client), TanStack Query (server)
- **AI Providers:** OpenAI (GPT-4), Anthropic (Claude), Google AI (Gemini/Veo)
- **Payments:** Stripe
- **Package Manager:** pnpm

## Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Login, register, forgot-password
│   ├── (dashboard)/        # Authenticated routes
│   │   ├── dashboard/
│   │   ├── knowledge/      # Brand Foundation, Strategy, Brandstyle, Personas, Products, Insights, Library, Alignment
│   │   ├── strategy/       # Campaigns, Content Studio, Content Library
│   │   ├── validation/     # Research Hub, Bundles, Custom Validation
│   │   └── settings/       # Account, Team, Billing, Notifications, Appearance
│   └── api/                # API routes
├── components/
│   ├── ui/                 # Tier 1: Button, Modal, Badge, Input, etc.
│   ├── layout/             # Tier 2: Sidebar, TopBar, StepperWizard
│   ├── cards/              # Tier 3: PersonaCard, CampaignCard, etc.
│   └── platform/           # Tier 4: Feature-specific components
├── features/               # Feature modules with co-located components
│   ├── knowledge/
│   ├── strategy/
│   └── validation/
├── hooks/                  # Shared React hooks
├── lib/                    # Utils, API client, AI config
│   ├── api/                # API client with error handling
│   ├── ai/                 # AI provider config and routing
│   └── utils/              # Helper functions
├── stores/                 # Zustand stores
├── types/                  # TypeScript interfaces
└── styles/                 # Global CSS + design tokens
```

## Design System
- **Primary color:** #10B981 (emerald green)
- **Spacing:** 4px grid system
- **Border radius:** 6px default
- **Font:** Inter (sans), JetBrains Mono (code)
- **Icons:** Lucide React (consistent set, never mix icon libraries)
- **Dark mode:** Full support via Tailwind `dark:` classes
- **Sidebar:** 256px expanded, 64px collapsed
- **TopBar:** 64px height
- **Max content width:** 1200px

## Component Conventions
- All components use TypeScript with explicit prop interfaces
- Use `cn()` utility (clsx + tailwind-merge) for conditional classes
- Components follow: `ComponentName.tsx` naming
- Stories: `ComponentName.stories.tsx`
- Tests: `ComponentName.test.tsx`
- Export from barrel files (`index.ts`)

## API Conventions
- API routes in `app/api/[module]/[entity]/route.ts`
- Use Zod for request validation
- Standard response format: `{ data, error, meta }`
- Error codes: 4-digit codes per module (1xxx auth, 2xxx knowledge, etc.)
- Always check permissions with `requireRole()` middleware

## State Management
- **Zustand** for UI state (sidebar, modals, theme)
- **TanStack Query** for all server data (queries + mutations)
- Query key convention: `['module', 'entity', id?]`
- Invalidate related queries after mutations

## Database
- Prisma schema in `prisma/schema.prisma`
- Migrations via `pnpx prisma migrate dev`
- Seed data via `prisma/seed.ts`
- All entities have: `id`, `createdAt`, `updatedAt`, `createdById`
- Soft delete via `deletedAt` where applicable

## Permissions (RBAC)
- 4 roles: Owner > Admin > Editor > Viewer
- Viewer: read-only
- Editor: CRUD own items, cannot lock/unlock
- Admin: full CRUD + team management
- Owner: everything + billing + workspace deletion
- Locked entities: only Admin/Owner can edit

## AI Integration
- OpenAI: brand analysis, content generation, quality scoring
- Anthropic: persona analysis, campaign strategy, alignment scan
- Google AI: image generation (Gemini), video generation (Veo)
- All AI calls go through `lib/ai/` with rate limiting and error handling
- Never expose API keys client-side

## Key Principles
1. **Campaign-driven:** All content belongs to a campaign
2. **Validation-first:** Strategy is validated before content creation
3. **Type-safe:** No `any` types, strict TypeScript
4. **Permission-aware:** Every action checks RBAC
5. **Error-first:** Handle errors before happy path
6. **Dark mode:** Every component must support dark mode
7. **Responsive:** Mobile-friendly, but desktop-first

## Git Conventions
- Branch: `feature/[module]-[feature]` (e.g., `feature/knowledge-personas`)
- Commits: conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`)
- PR per feature, squash merge to main

## Common Commands
```bash
pnpm dev              # Start dev server (localhost:3000)
pnpm build            # Production build
pnpm lint             # ESLint
pnpm test             # Run tests (Vitest)
pnpm test:e2e         # E2E tests (Playwright)
pnpm storybook        # Component playground (localhost:6006)
pnpx prisma studio    # Database GUI
pnpx prisma migrate dev --name [name]  # New migration
```

## Progress
- Sprints 1–12: Foundation, auth, layout, component library, dashboard, core routes (37 routes functional)
- Sprint 13: Strategy module — SCR-02a New Campaign Wizard, SCR-02b Quick Content Modal, SCR-02d Quick Content Detail
- Sprint 14: Content & Strategy — SCR-03 Content Library, SCR-16 Content Studio, SCR-05a Strategy Detail
- **Current: Sprint 15–18 backlog below (14 screens remaining)**

---

# Screen Build Backlog (Sprints 15–18)

## How to Use This Backlog
Work through tasks **sequentially** (Task 1 → Task 14). Each task = one screen = one git commit.

**Per task:**
1. Read the spec below
2. Check existing components in `src/components/` — reuse before creating new
3. Build the page with mock/placeholder data (no real API calls)
4. Commit: `feat(screens): add SCR-XXx [screen name]`
5. Verify the page renders at its route
6. Move to next task

---

## SPRINT 15 — Brand Foundation Research Methods

### Task 1: SCR-04b AI Brand Analysis
**Route:** `/knowledge/brand-foundation/[assetId]/ai-analysis`
**Reference:** Reuse chat UI patterns if SCR-07c exists
**Type:** Chat-based AI questionnaire → report generation

**Layout:**
- PageHeader: breadcrumb "Dashboard > Brand Foundation", "← Back to Asset"
- Icon: 🤖, Title: "AI Brand Analysis", Subtitle: "Answer questions to analyze your brand"
- Status dropdown: "📝 In Progress" / "✅ AI Analysis Complete"

**Chat Interface:**
- AI messages: left-aligned, white bg, purple AI icon avatar
- User messages: right-aligned, green/teal bubble
- Scrollable message container

**Progress Indicator (below chat):**
- "Progress" label + percentage right-aligned
- Progress bar (blue/purple gradient), can exceed 100% (show "125%" etc.)

**Input Area:**
- Large textarea, placeholder "Type your answer here..."
- "Previous" link (left) + "Next" button (green, disabled until typed, right)
- At 100%: button becomes "Complete Analysis"

**Completion State:**
- Green success banner: ✅ "AI Analysis Complete" + "generated based on 247 data points"
- Stats: "📊 247 Data points" + "⏱ Duration"
- **AI Report:**
  - 📝 Executive Summary (paragraph)
  - 💡 Key Findings (5 numbered items): Brand Purpose, Audience Alignment, Unique Value, Customer Challenge, Market Position
  - 🚀 Strategic Recommendations (4 items with ⭕ icons)
- "⬇️ Export PDF" button
- Footer: "← Back to Asset" + "✅ Done" (green)

---

### Task 2: SCR-04c Canvas Workshop Purchase
**Route:** `/knowledge/brand-foundation/[assetId]/workshop/purchase`
**Type:** E-commerce bundle selection + purchase flow

**Header:** 🎨 "Canvas Workshop" + "Purchase workshop sessions for your team"

**3 Bundle Cards (row):**
| Bundle | Price | Badge | Note |
|--------|-------|-------|------|
| Starter | €1,250 | Save €150 | Basic |
| Professional | €1,350 | Save €200 | "Most Popular" ribbon, highlighted |
| Complete | €1,400 | Save €250 | All assets |

Each card: title, price, discount badge, feature checklist ✅, Select button (outline/filled)

**Workshop Options:** Quantity stepper + "Add Facilitator" toggle (+€350)

**Dashboard Impact Preview:** "Preview Impact" link → modal with before/after asset states

**Purchase Summary Sidebar (right):** Bundle + add-ons + subtotal + discount + total + "Complete Purchase" (green)

---

### Task 3: SCR-04d Canvas Workshop Session
**Route:** `/knowledge/brand-foundation/[assetId]/workshop/session`
**Type:** Live workshop with 6-step flow

**Header:** Workshop title + timer (counts UP from 00:00) + bookmark icon

**6 Steps:** Introduction → Define Core Purpose → Identify Unique Value → Map Customer Journey → Synthesize Insights → Synthesis & Action Planning

**Per step:**
- Title + description
- Video/presentation placeholder (grey box, play icon)
- Timer: "⏱ 00:12:34"
- Large textarea for response capture
- "💡 Facilitator Tips" collapsible (amber bg)
- "Step X of 6" + progress bar
- "← Previous Step" + "Next Step →" (green) / final: "Complete Workshop"

---

### Task 4: SCR-04e Workshop Complete
**Route:** `/knowledge/brand-foundation/[assetId]/workshop/complete`
**Type:** Results page with 5 tabs

**Header:** 💬 "Canvas Workshop" + "✅ Completed" + workshop navigation (← Prev | X of Y | Next →)

**Complete Banner (green card):**
- ✅ "Workshop Complete" + participant/duration summary
- Stats: 📅 date | 👥 8 participants | ⏱ 1.5 hours | 👤 facilitator
- Export: PDF download + raw data download

**5 Tabs:**

| Tab | Content |
|-----|---------|
| **Overview** | AI Report: Executive Summary + 5 Key Findings + 4 Strategic Recommendations |
| **Canvas** | Golden Circle: WHY (Purpose) + HOW (Process) + WHAT (Product) cards with quotes + tips. Flow: 🔵→🟢→🟠 |
| **Workshop** | 4 Objectives (✅), 8 Participants (name+role grid), 10-item Agenda timeline |
| **Notes** | Participant notes list: avatar, name, timestamp, note text |
| **Gallery** | 4 placeholder photos with captions |

**Footer:** "← Back to Asset" + "✅ Done" (green)

---

## SPRINT 16 — Interviews & Questionnaire

### Task 5: SCR-04f Interviews
**Route:** `/knowledge/brand-foundation/[assetId]/interviews`
**Type:** Overview + 5-step wizard

**Overview:**
- Stats: "X Interviews" + "+ Add Interview" (green)
- Counters: To Schedule (grey) | Scheduled (blue) | Completed (green) | In Review (purple)
- Interview cards: title, status, lock icon, person info, View + ⋮ menu
- Overflow: 🔓 Unlock | ✏️ Edit | 📋 Duplicate | 📊 Export | 🗑️ Delete

**Wizard:** `① Contact → ② Schedule → ③ Questions → ④ Conduct → ⑤ Review`

**Step 1 Contact:** Name, Position, Email, Phone (opt), Company → "Save Contact"

**Step 2 Schedule:** Date picker, Time picker, Duration dropdown (60 min) → "Save Schedule"

**Step 3 Questions:**
- Asset checklist (Golden Circle, Core Values, Brand Positioning, Brand Personality)
- Per asset: question count + View/+ actions
- "+ Add Question" + "📚 Import from Templates"
- **Add Question Modal:** Asset link dropdown, Type (card select: Open/MC/Multi-Select/Rating/Ranking), Question textarea, Answer Options repeater
- **Templates Panel (slide-out):** search, asset filter, accordion categories, template items

**Step 4 Conduct:**
- "X of Y answered" + "X% complete"
- Question nav: Previous | X/Y | Next
- Question display: type badge + text + answer area (varies by type)
- General Notes textarea
- "Save Progress" + "Complete Interview" (green)

**Step 5 Review:**
- Stats: Questions Answered, Duration, Assets Covered, Completion %
- Questions review with answers
- Notes textarea
- "✏️ Edit Responses" | "⬇️ Export PDF" | "✅ Approve & Lock" (green)

---

### Task 6: SCR-04g Questionnaire
**Route:** `/knowledge/brand-foundation/[assetId]/questionnaire`
**Type:** Overview + 5-step wizard (quantitative surveys)

**Overview:**
- Stats: ❓ Questions | 👥 Recipients | 📬 Responses | 📈 Response Rate
- "+ Create Questionnaire" (green)
- Cards: title, status (Draft/Collecting/Analyzed), counts, response rate circle, ⋮ menu

**Wizard:** `① Design → ② Distribution → ③ Recipients → ④ Collect → ⑤ Analyze`

**Step 1 Design:** Name + Description, draggable question list (type badge, Required badge, delete), inline add form (text, type, asset link, required checkbox), footer: Save Draft + Continue →

**Step 2 Distribution:** Radio: 📧 Email | 🔗 Shareable Link
- Email: subject, body (placeholders: `{recipient_name}`, `{questionnaire_name}`, `{questionnaire_link}`), preview, anonymous/multiple response checkboxes, reminder settings
- Link: URL + Copy, yellow public link warning, anonymous/multiple checkboxes
- Green summary box, footer: ← Back + Save Draft + Continue →

**Step 3 Recipients:** Header + "⬆️ Import CSV" + "+ Add Recipient", empty state, Add Recipient Modal (Name, Email, Group, Role)

**Step 4 Collect:** "Ready to Send" card: ✈️ icon, checklist, "📋 Copy Shareable Link" (green)

**Step 5 Analyze:**
- Stats: Responses, Rate, Completion, Avg Time, Assets
- "✨ AI Generated Key Insights" + "🔄 Regenerate" (4 insight bullets)
- Tabs: All Questions | per asset type
- Per question: expand, Q#, text, badges, response count
- Export: PDF, CSV, Charts PNG, Share
- "🔓 Unlock" + "✅ Mark as Validated" (green)
- **Validate Modal:** stats + green info + "✅ Validate & Lock"

---

## SPRINT 17 — Brand Style & Personas

### Task 7: SCR-06a Brand Styleguide
**Route:** `/knowledge/brandstyle/guide`
**Reference:** Result page of SCR-06 Brandstyle Analyzer
**Type:** Multi-section scrollable document

**Header:** 🎨 "Brand Styleguide" + creator avatar/name/date + "Analyze Next" + "⬇ Export PDF"

**5 Tab Jump-Links:** Logo 🖼️ | Colors 🎨 | Typography Aa | Tone of Voice 💬 | Imagery 🖼️

**Logo:** 3 variation cards (Primary, Icon Mark, Scale Only) + Usage Guidelines + Don'ts (5× ❌)

**Colors:** Swatch grid (clickable) + Don'ts. **Color Detail Modal:** large swatch + HEX/RGB/HSL/CMYK with 📋 Copy each + tags + WCAG AA/AAA + bottom tabs (Info/Notes/Comments)

**Typography:** Font alphabet display + Type Scale (H1–Small: preview, size, weight)

**Tone of Voice:** Content Guidelines + Writing Guidelines bullets + Do ✅ / Don't ❌ examples

**Imagery:** Photo thumbnails + Photography/Illustration Guidelines + Don'ts (5× ❌)

**AI Banner (after each section):** Green strip "This styleguide is used for AI content generation" + "Discard" + "Save Changes"

---

### Task 8: SCR-07a Create Persona
**Route:** `/knowledge/personas/new`
**Type:** 3-tab creation form

**Header:** "← Back to Personas", purple avatar placeholder, name + tagline inputs, "✕ Cancel" + "+ Create Persona" (green)

**Tab: Overview** — 2-col demographics (Age, Gender, Location, Occupation, Education, Income) + Persona Image Generator (placeholder, yellow tip, "✨ Generate Image", Manual URL fallback)

**Tab: Psychographics** — 4 repeatable-item cards:
Goals 🎯 | Frustrations ⚠️ | Motivations ❤️ | Values ✨
(each: icon, prompt question, text input + "+ Add X" button)

**Tab: Background** — 2 repeatable-item cards:
Behaviors ⚡ | Interests 💡

---

### Task 9: SCR-07b Persona Detail
**Route:** `/knowledge/personas/[personaId]`
**Type:** Rich profile page

**Header:** Large photo, name "Sarah the Startup Founder", tagline, Research Confidence 25% "Low", Methods 1/4

**Action Bar:** ✏️ Edit | 🤖 Regenerate with AI | 🔒 Lock

**Sections with impact badges (high=green, medium=orange, low=grey):**
- **Demographics** (green banner, "🎯 Profile" badge): photo + 🔄 Regenerate + 2-col grid (Age, Location, Occupation, Income, Family, Education)
- **Psychographics** (medium): Personality Type, Core Values (color tags), Interests (outline tags)
- **Goals** (high) / **Motivations** (high) / **Frustrations** (medium) — 3 cards in row, bullet items
- **Behaviors** (medium): bullet list
- **Strategic Implications** (high): empty state + "✨ Generate with AI"
- **Research & Validation** (bottom): 1/4 methods, 4 method cards

---

### Task 10: SCR-07c AI Persona Analysis
**Route:** `/knowledge/personas/[personaId]/analysis`
**Reference:** Reuse chat components from Task 1 (SCR-04b)
**Type:** Chat-based AI analysis, 4 dimensions

**Header:** 🤖 "AI Persona Analysis" + "← Back to Persona"

**Chat:** Same pattern as SCR-04b. 4 questions (25% each):
1. Demographics & characteristics
2. Goals & motivations
3. Challenges & frustrations
4. Value proposition

**Progress:** 25% increments. Input: textarea + Previous + Next/Complete

---

### Task 11: SCR-07d AI Persona Analysis Complete
**Route:** `/knowledge/personas/[personaId]/analysis/complete`
**Type:** Results page

**Header:** 👥 "AI Persona Analysis" + "✅ Result" dropdown

**Green completion card:** ✅ "AI Persona Analysis Complete" + "based on 4 strategic dimensions"
- Stats: **4** dimensions | **+35%** research confidence

**Insights card** ("✨ Generated Insights"):
🟢 Demographic Characteristics | 📈 Goals & Motivations | ❤️ Challenges & Frustrations | ⚡ Value Proposition

**Footer:** "← Back to Persona" + "Edit Answers" (green)

---

## SPRINT 18 — Products & Services

### Task 12: SCR-08a Product & Service Analyzer
**Route:** `/knowledge/products/analyzer`
**Reference:** Similar to SCR-06 Brandstyle Analyzer
**Type:** 3-tab analyzer

**Header:** ⚙️ "Product & Service Analyzer" + "Analyze via URL, upload PDF, or enter manually"

**Tab: Website URL 🌐** — Input + "✨ Analyze" (green). "What we extract" 2×2: Features, Benefits, Target Audience, Pricing

**Tab: PDF Upload 📄** — Drag & drop zone (PDF, max 10MB). "What we extract": Extraction, Pricing, Use Cases, Images. "What can I upload?" + "How does it work?" sections

**Tab: Manual Entry ✏️** — Form: Name*, Description*, Category, Pricing Model, Features (monospace, one per line), Benefits (monospace), Use Cases (monospace). Target Audience: "+ Select Personas" (cross-module). "✅ Save Product/Service" (green). Tips panel.

---

### Task 13: SCR-08b Analyzing Product Modal
**Route:** Modal overlay (from Task 12 URL analysis)
**Reference:** Similar to Brandstyle Analyzer processing modal
**Type:** Processing progress modal

**Modal:** Spinner + "Analyzing Product" + product name

**7 steps (sequential animation):**
1. Connecting to website ✅
2. Scanning product information ✅
3. Extracting features & specifications ✅
4. Analyzing pricing model 🔄 (animated)
5. Identifying use cases ⚪
6. Detecting target audience ⚪
7. Generating product profile ⚪

"This may take up to 30 seconds" + "Cancel" (outline). On complete → redirect to SCR-08c.

---

### Task 14: SCR-08c Product Detail
**Route:** `/knowledge/products/[productId]`
**Type:** Detail page

**Header:** "← Back" + category icon + product name + category subtitle + "✏️ Edit". Metadata: "Source: **Manual Entry**" + "Analyzed" badge

**Content cards:**
- **Description** 📄 + **Pricing Model** 💲 (2-col)
- **Features & Specifications** ✅ (2-col list with ✅ icons)
- **Benefits & Advantages** 💡 (numbered 1-4, green circles, 2×2) + **Target Audience** 👥 (empty state + "+ Add Persona")
- **Use Cases & Applications** 💡 (numbered 1-4)

Source indicator: Manual Entry / Website URL / PDF Upload

---

## Completion Checklist
- [ ] Task 1: SCR-04b AI Brand Analysis
- [ ] Task 2: SCR-04c Canvas Workshop Purchase
- [ ] Task 3: SCR-04d Canvas Workshop Session
- [ ] Task 4: SCR-04e Workshop Complete
- [ ] Task 5: SCR-04f Interviews
- [ ] Task 6: SCR-04g Questionnaire
- [ ] Task 7: SCR-06a Brand Styleguide
- [ ] Task 8: SCR-07a Create Persona
- [ ] Task 9: SCR-07b Persona Detail
- [ ] Task 10: SCR-07c AI Persona Analysis
- [ ] Task 11: SCR-07d AI Persona Analysis Complete
- [ ] Task 12: SCR-08a Product & Service Analyzer
- [ ] Task 13: SCR-08b Analyzing Product Modal
- [ ] Task 14: SCR-08c Product Detail
