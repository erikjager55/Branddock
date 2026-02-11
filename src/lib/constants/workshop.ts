// ── Workshop Constants ──
// Extracted from workshop purchase/session/complete pages

export const WORKSHOP_BASE_PRICE = 1200;
export const FACILITATOR_PRICE = 350;

export const WORKSHOP_BUNDLES = [
  {
    id: "starter",
    name: "Starter Bundle",
    badge: "Basic",
    description: "Essential brand foundation assets",
    originalPrice: 1500,
    price: 1250,
    savings: 250,
    assets: [
      "Golden Circle",
      "Core Values",
      "Brand Essence",
      "Brand Personality",
    ],
  },
  {
    id: "professional",
    name: "Professional Bundle",
    badge: "Most Popular",
    description: "Complete brand identity package",
    originalPrice: 1800,
    price: 1350,
    savings: 450,
    assets: [
      "Golden Circle",
      "Core Values",
      "Brand Essence",
      "Brand Personality",
      "Brand Promise",
      "Vision Statement",
      "Mission Statement",
      "Brand Story",
    ],
  },
  {
    id: "complete",
    name: "Complete Bundle",
    badge: "Best Value",
    description: "Full brand strategy and identity",
    originalPrice: 2200,
    price: 1400,
    savings: 800,
    assets: [
      "Golden Circle",
      "Core Values",
      "Brand Essence",
      "Brand Personality",
      "Brand Promise",
      "Vision Statement",
      "Mission Statement",
      "Brand Story",
      "Brand Archetype",
      "Brand Positioning",
      "Brand Tone & Voice",
      "Social Relevancy",
      "Transformative Goals",
    ],
  },
] as const;

export const WORKSHOP_INCLUDED_ITEMS = [
  "Guided workshop framework",
  "AI-powered analysis & insights",
  "Brand Canvas generation",
  "Participant collaboration tools",
  "Exportable PDF report",
  "Action plan with milestones",
] as const;

export const WORKSHOP_SPECS = [
  { label: "Duration", value: "2-3 hours", icon: "clock" as const },
  { label: "Participants", value: "5-10 people", icon: "users" as const },
  { label: "Format", value: "In-person / Virtual", icon: "monitor" as const },
] as const;

export const WORKSHOP_STEPS = [
  {
    title: "Introduction & Context",
    description:
      "Welcome to the Canvas Workshop. Set the stage by reviewing your brand's current position, goals, and the challenges you want to address during this session.",
    duration: "15 min",
    responsePrompt:
      "What are the top 3 brand challenges your team wants to address today?",
    responseTitle: "Workshop Challenges",
    responseSubtitle: "Capture your team's priorities",
  },
  {
    title: "Define Core Purpose",
    description:
      "Explore the fundamental 'Why' behind your brand. What drives your organization beyond profit? Discuss with your team what would be lost if your company disappeared tomorrow.",
    duration: "30 min",
    responsePrompt:
      "Summarize your brand's core purpose in 2-3 sentences. Why does your brand exist?",
    responseTitle: "Core Purpose",
    responseSubtitle: "Your brand's fundamental WHY",
  },
  {
    title: "Identify Unique Value",
    description:
      "Discover what makes your brand uniquely valuable. How do you deliver on your purpose differently from competitors? Use comparative analysis to identify differentiators.",
    duration: "30 min",
    responsePrompt:
      "What are 3 things your brand does that competitors can't or won't?",
    responseTitle: "Unique Value",
    responseSubtitle: "Your competitive differentiators",
  },
  {
    title: "Map Customer Journey",
    description:
      "Understand how customers experience your brand from first awareness through loyalty. Map the touchpoints: Awareness → Consideration → Purchase → Onboarding → Retention → Advocacy.",
    duration: "30 min",
    responsePrompt:
      "Describe the key moments that define your customer's journey with your brand.",
    responseTitle: "Customer Journey",
    responseSubtitle: "Key touchpoints and moments",
  },
  {
    title: "Synthesize Insights",
    description:
      "Bring together the insights from previous steps. Look for patterns and recurring themes across exercises — these are your brand truths that will form the foundation of your guidelines.",
    duration: "25 min",
    responsePrompt:
      "What are the top 3 recurring themes or brand truths that emerged?",
    responseTitle: "Key Insights",
    responseSubtitle: "Patterns and brand truths",
  },
  {
    title: "Synthesis & Action Planning",
    description:
      "Create a concrete action plan to implement your brand insights across the organization. Assign specific owners, set 30/60/90-day milestones for accountability.",
    duration: "30 min",
    responsePrompt:
      "List 3-5 actionable next steps with owners and deadlines.",
    responseTitle: "Action Plan",
    responseSubtitle: "Next steps and accountability",
  },
] as const;

export const FACILITATOR_TIPS = [
  "Create a safe space — remind participants there are no wrong answers.",
  "Use the 'Yes, and...' technique to build on ideas rather than shutting them down.",
  "Keep time — don't let any single exercise run more than 10 minutes over.",
  "Capture everything visually — use the whiteboard, sticky notes, or digital canvas.",
  "Encourage quiet participants by using round-robin for key questions.",
  "Summarize key insights after each exercise before moving on.",
  "End with energy — celebrate what was accomplished and set clear next steps.",
] as const;

export const MOCK_KEY_FINDINGS = [
  {
    num: 1,
    title: "Core Purpose",
    text: "Brand exists to democratize brand management through AI-powered tools accessible to teams of all sizes.",
  },
  {
    num: 2,
    title: "Unique Value",
    text: "The integrated strategy-to-content pipeline is a clear differentiator with no direct competition.",
  },
  {
    num: 3,
    title: "Customer Need",
    text: "Brand drift is the #1 challenge for growing marketing teams, creating strong product-market fit.",
  },
  {
    num: 4,
    title: "Market Position",
    text: "Positioned uniquely between brand consultancy and content tooling — a defensible niche.",
  },
  {
    num: 5,
    title: "Growth Lever",
    text: "Thought leadership and case studies are the most effective channels for target audience.",
  },
] as const;

export const MOCK_RECOMMENDATIONS = [
  "Formalize the brand voice guidelines based on workshop findings",
  "Create a brand consistency scorecard for all content",
  "Develop an internal brand training program",
  "Launch a customer-facing brand health assessment tool",
] as const;

export const MOCK_PARTICIPANTS = [
  { name: "Erik Jager", role: "Brand Manager" },
  { name: "Sarah Mitchell", role: "Content Lead" },
  { name: "David Chen", role: "Marketing Director" },
  { name: "Lisa Park", role: "Design Lead" },
  { name: "Tom Wilson", role: "Product Manager" },
  { name: "Ana Rivera", role: "UX Researcher" },
  { name: "James Brown", role: "Sales Lead" },
  { name: "Maya Singh", role: "CEO" },
] as const;

export const MOCK_OBJECTIVES = [
  "Define core brand purpose and values",
  "Map the customer journey touchpoints",
  "Identify brand differentiation factors",
  "Create actionable brand guidelines",
] as const;

export const MOCK_AGENDA = [
  { time: "09:00", item: "Welcome & Introductions" },
  { time: "09:15", item: "Core Purpose Exercise" },
  { time: "09:45", item: "Break" },
  { time: "10:00", item: "Unique Value Mapping" },
  { time: "10:30", item: "Customer Journey Workshop" },
  { time: "11:00", item: "Break" },
  { time: "11:15", item: "Insight Synthesis" },
  { time: "11:45", item: "Action Planning" },
  { time: "12:15", item: "Closing & Next Steps" },
  { time: "12:30", item: "Workshop End" },
] as const;

export const MOCK_NOTES = [
  {
    name: "Sarah Mitchell",
    time: "10:23 AM",
    text: "Key insight: our customers don't just want tools, they want strategic guidance that scales.",
  },
  {
    name: "David Chen",
    time: "10:45 AM",
    text: "We should emphasize the AI-powered aspect more — it's what sets us apart from traditional brand platforms.",
  },
  {
    name: "Lisa Park",
    time: "11:12 AM",
    text: "Visual consistency is as important as voice consistency. Need to address both in guidelines.",
  },
  {
    name: "Maya Singh",
    time: "11:35 AM",
    text: "The brand drift concept resonated with everyone. Consider making it central to our messaging.",
  },
] as const;

export const MOCK_GALLERY = [
  { caption: "Team brainstorming session" },
  { caption: "Golden Circle whiteboard" },
  { caption: "Customer journey mapping" },
  { caption: "Action planning board" },
] as const;

export const INDIVIDUAL_ASSETS = [
  "Golden Circle",
  "Core Values",
  "Brand Essence",
  "Brand Personality",
  "Brand Promise",
  "Vision Statement",
  "Mission Statement",
  "Brand Story",
  "Brand Archetype",
  "Brand Positioning",
  "Brand Tone & Voice",
  "Social Relevancy",
  "Transformative Goals",
] as const;
