// ── Interview Question Templates ──
// Organized by brand asset category for the Question Templates panel

export interface QuestionTemplate {
  id: string;
  questionText: string;
  questionType: "OPEN" | "MULTIPLE_CHOICE" | "MULTI_SELECT" | "RATING_SCALE" | "RANKING";
  category: string;
  options?: string[];
}

export interface TemplateCategory {
  name: string;
  assetKey: string;
  icon: string;
  templates: QuestionTemplate[];
}

export const QUESTION_TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    name: "Golden Circle Templates",
    assetKey: "golden-circle",
    icon: "circle",
    templates: [
      { id: "gc-1", questionText: "What do you believe is our core purpose (WHY)?", questionType: "OPEN", category: "Golden Circle" },
      { id: "gc-2", questionText: "How would you describe our unique approach (HOW)?", questionType: "OPEN", category: "Golden Circle" },
      { id: "gc-3", questionText: "What products or services do you most associate with us (WHAT)?", questionType: "OPEN", category: "Golden Circle" },
      { id: "gc-4", questionText: "How does our purpose align with your own values?", questionType: "RATING_SCALE", category: "Golden Circle" },
      { id: "gc-5", questionText: "Which statement best describes why our brand exists?", questionType: "MULTIPLE_CHOICE", category: "Golden Circle", options: ["To solve a specific problem", "To serve a community", "To innovate in our industry", "To create a better experience"] },
    ],
  },
  {
    name: "Core Values Templates",
    assetKey: "core-values",
    icon: "heart",
    templates: [
      { id: "cv-1", questionText: "Which of our stated values do you see reflected in daily operations?", questionType: "MULTI_SELECT", category: "Core Values", options: ["Evidence-Based", "Clarity Over Complexity", "Continuous Alignment", "Collaborative Intelligence", "Transparency"] },
      { id: "cv-2", questionText: "How well does our team live by our core values?", questionType: "RATING_SCALE", category: "Core Values" },
      { id: "cv-3", questionText: "Can you describe a moment where our values were clearly demonstrated?", questionType: "OPEN", category: "Core Values" },
      { id: "cv-4", questionText: "Which value do you think needs more attention or investment?", questionType: "OPEN", category: "Core Values" },
    ],
  },
  {
    name: "Brand Positioning Templates",
    assetKey: "brand-positioning",
    icon: "map-pin",
    templates: [
      { id: "bp-1", questionText: "How would you position our brand relative to our top 3 competitors?", questionType: "OPEN", category: "Brand Positioning" },
      { id: "bp-2", questionText: "What is the single most important differentiator of our brand?", questionType: "OPEN", category: "Brand Positioning" },
      { id: "bp-3", questionText: "Rate our brand's market positioning clarity.", questionType: "RATING_SCALE", category: "Brand Positioning" },
      { id: "bp-4", questionText: "Which audience segment do you think we serve best?", questionType: "MULTIPLE_CHOICE", category: "Brand Positioning", options: ["Enterprise", "SMB", "Startups", "Agencies", "Freelancers"] },
    ],
  },
  {
    name: "Brand Personality Templates",
    assetKey: "brand-personality",
    icon: "smile",
    templates: [
      { id: "bpe-1", questionText: "If our brand were a person, how would you describe their personality?", questionType: "OPEN", category: "Brand Personality" },
      { id: "bpe-2", questionText: "Which personality traits best describe our brand?", questionType: "MULTI_SELECT", category: "Brand Personality", options: ["Insightful", "Methodical", "Approachable", "Empowering", "Trustworthy", "Innovative"] },
      { id: "bpe-3", questionText: "How consistent is our brand personality across touchpoints?", questionType: "RATING_SCALE", category: "Brand Personality" },
      { id: "bpe-4", questionText: "What tone should our brand use when communicating with customers?", questionType: "OPEN", category: "Brand Personality" },
    ],
  },
  {
    name: "General Interview Templates",
    assetKey: "general",
    icon: "message-square",
    templates: [
      { id: "gen-1", questionText: "What are the top 3 words that come to mind when you think of our brand?", questionType: "OPEN", category: "General" },
      { id: "gen-2", questionText: "How likely are you to recommend our brand to a colleague?", questionType: "RATING_SCALE", category: "General" },
      { id: "gen-3", questionText: "What is the biggest challenge our brand faces in the market?", questionType: "OPEN", category: "General" },
      { id: "gen-4", questionText: "How well does our brand communicate its value proposition?", questionType: "RATING_SCALE", category: "General" },
      { id: "gen-5", questionText: "What would you change about our brand if you could change one thing?", questionType: "OPEN", category: "General" },
    ],
  },
];

export const ALL_QUESTION_TEMPLATES = QUESTION_TEMPLATE_CATEGORIES.flatMap(
  (c) => c.templates
);

export const QUESTION_TYPE_OPTIONS = [
  { value: "OPEN", label: "Open (free text)" },
  { value: "MULTIPLE_CHOICE", label: "Multiple Choice" },
  { value: "MULTI_SELECT", label: "Multi-Select" },
  { value: "RATING_SCALE", label: "Rating Scale (1-5)" },
  { value: "RANKING", label: "Ranking" },
] as const;

export type QuestionType = (typeof QUESTION_TYPE_OPTIONS)[number]["value"];

export const DURATION_OPTIONS = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
  { value: "90", label: "90 min" },
  { value: "120", label: "120 min" },
] as const;

// Brand asset list for the Questions step asset selector
export const INTERVIEW_ASSET_OPTIONS = [
  { key: "golden-circle", name: "Golden Circle", category: "Foundation", icon: "circle" },
  { key: "core-values", name: "Core Values", category: "Foundation", icon: "heart" },
  { key: "brand-essence", name: "Brand Essence", category: "Core", icon: "diamond" },
  { key: "brand-personality", name: "Brand Personality", category: "Personality", icon: "smile" },
  { key: "brand-positioning", name: "Brand Positioning", category: "Strategy", icon: "map-pin" },
  { key: "vision-statement", name: "Vision Statement", category: "Strategy", icon: "eye" },
  { key: "mission-statement", name: "Mission Statement", category: "Strategy", icon: "target" },
  { key: "brand-promise", name: "Brand Promise", category: "Strategy", icon: "handshake" },
  { key: "brand-story", name: "Brand Story", category: "Narrative", icon: "book-open" },
  { key: "brand-tone-voice", name: "Brand Tone & Voice", category: "Communication", icon: "megaphone" },
] as const;
