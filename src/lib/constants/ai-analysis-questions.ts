export const AI_ANALYSIS_QUESTIONS: Record<string, string[]> = {
  "golden-circle": [
    "What does your organization do? Describe your core products or services.",
    "How does your organization deliver differently from competitors?",
    "Why does your organization exist beyond making money?",
    "What impact do you want to have on your customers' lives?",
    "If your brand were a person, what would it stand for?",
  ],
  "social-relevancy": [
    "How does your brand contribute to society?",
    "What environmental commitments has your organization made?",
    "How does your brand support social responsibility?",
    "What governance and ethical practices define your organization?",
    "What measurable impact goals have you set for 3-5 years?",
  ],
  "brand-tone-voice": [
    "How would you describe your brand's personality in conversation?",
    "What three adjectives best describe how your brand communicates?",
    "What kind of language does your brand avoid?",
    "How does your tone change across different channels (social, email, website)?",
    "If your brand wrote a letter to a customer, what would it sound like?",
  ],
  "brand-promise": [
    "What is the one thing your customers can always count on from you?",
    "How do you consistently deliver on your customer expectations?",
    "What makes your promise different from your competitors'?",
    "How do you measure whether you're keeping your promise?",
    "What would happen if you broke this promise?",
  ],
  "brand-story": [
    "What inspired the creation of your organization?",
    "What challenges has your brand overcome?",
    "What key milestones define your brand's journey?",
    "Where do you see your brand in 5-10 years?",
    "What emotional connection do you want people to feel with your brand?",
  ],
  "brand-essence": [
    "If you had to describe your brand in just two words, what would they be?",
    "What feeling do customers get when they interact with your brand?",
    "What is the single most important thing your brand represents?",
    "How does your brand make people's lives better?",
    "What would be lost if your brand ceased to exist?",
  ],
  "brand-personality": [
    "If your brand were a person, how old would they be and what would they do?",
    "What are your brand's top 5 personality traits?",
    "How does your brand behave in a crisis?",
    "What does your brand value most in relationships?",
    "What kind of humor, if any, does your brand use?",
  ],
  "vision-statement": [
    "What is the ultimate change you want to see in the world?",
    "Where do you see your organization in 10 years?",
    "What would success look like if there were no constraints?",
    "How will the world be different because of your organization?",
    "What legacy do you want to leave?",
  ],
  "mission-statement": [
    "What does your organization do on a daily basis?",
    "Who are the primary beneficiaries of your work?",
    "How do you deliver your products or services?",
    "What sets your approach apart from others in your industry?",
    "What problem does your organization solve?",
  ],
  "brand-archetype": [
    "What role does your brand play in customers' lives?",
    "Which fictional character or public figure best represents your brand?",
    "What motivates your brand at its core — freedom, mastery, belonging, or stability?",
    "How does your brand make customers feel empowered?",
    "What universal human desire does your brand fulfill?",
  ],
  "core-values": [
    "What principles guide your organization's decisions?",
    "What behaviors do you reward and celebrate in your team?",
    "What would you never compromise on, even for profit?",
    "How do your values show up in day-to-day operations?",
    "What values do your best customers share with you?",
  ],
  "transformative-goals": [
    "What ambitious goal would transform your business in 3-5 years?",
    "What market or industry change are you positioning for?",
    "What capability do you need to build to achieve your vision?",
    "How will you measure progress toward your transformative goals?",
    "What would achieving this goal mean for your customers?",
  ],
  "brand-positioning": [
    "Who is your ideal customer, and what do they care about most?",
    "What category does your brand compete in?",
    "What is your unique differentiator compared to alternatives?",
    "Why should someone choose you over the competition?",
    "How do you want to be perceived relative to your competitors?",
  ],
  default: [
    "What is the core essence of your brand?",
    "Who is your primary target audience?",
    "What makes your brand unique compared to competitors?",
    "What values drive your organization?",
    "What is your brand's long-term vision?",
  ],
};

export function getQuestionsForAsset(asset: {
  name: string;
  content?: unknown;
}): string[] {
  // Try content.assetTypeKey first
  const contentObj =
    asset.content && typeof asset.content === "object" && !Array.isArray(asset.content)
      ? (asset.content as Record<string, unknown>)
      : null;
  const contentKey = contentObj?.assetTypeKey as string | undefined;
  if (contentKey && AI_ANALYSIS_QUESTIONS[contentKey]) {
    return AI_ANALYSIS_QUESTIONS[contentKey];
  }

  // Fall back to name matching
  const normalizedName = asset.name.toLowerCase().replace(/\s+/g, "-");
  for (const [key, questions] of Object.entries(AI_ANALYSIS_QUESTIONS)) {
    if (key !== "default" && normalizedName.includes(key)) {
      return questions;
    }
  }

  return AI_ANALYSIS_QUESTIONS.default;
}
