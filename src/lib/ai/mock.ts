import type { AIProvider, AIGenerateOptions, AIAnalysisResult, AIBrandHealthResult } from "./provider";

const MOCK_DELAY = 1500;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockProvider implements AIProvider {
  async generateText(options: AIGenerateOptions): Promise<string> {
    await delay(MOCK_DELAY);

    const prompt = options.prompt.toLowerCase();

    if (prompt.includes("improve")) {
      return "Here is an improved version of your content with enhanced clarity, stronger brand voice, and better engagement:\n\n" +
        "Your brand stands at the intersection of innovation and reliability. By leveraging cutting-edge AI technology, we empower marketing teams to create consistent, compelling content that resonates with their target audience. Our platform transforms brand strategy from a static document into a living, breathing system that adapts and grows with your business.\n\n" +
        "Key improvements: stronger opening, clearer value proposition, and actionable language throughout.";
    }

    if (prompt.includes("shorten")) {
      return "Our AI-powered platform empowers marketing teams to create consistent, on-brand content at scale. Transform strategy into action with intelligent tools that adapt to your brand.";
    }

    if (prompt.includes("expand")) {
      return "In today's rapidly evolving digital landscape, maintaining brand consistency across all touchpoints has become one of the most significant challenges facing marketing teams. Research shows that brands with consistent presentation across platforms see a 23% increase in revenue.\n\n" +
        "Our platform addresses this challenge head-on by providing AI-powered tools that understand your brand's unique voice, values, and visual identity. From content creation to campaign management, every piece of content is automatically checked against your brand guidelines.\n\n" +
        "The result? Marketing teams can move faster without sacrificing quality or consistency. With automated brand alignment checks, real-time collaboration features, and intelligent content suggestions, your team can focus on what matters most — creating meaningful connections with your audience.\n\n" +
        "Whether you're a startup building your brand from scratch or an enterprise managing a global brand portfolio, our platform scales to meet your needs while maintaining the personal touch that makes your brand unique.";
    }

    return "Empower your brand with intelligent tools that bridge the gap between strategy and execution. Our AI-powered platform helps marketing teams create consistent, compelling content that resonates with their target audience.\n\n" +
      "Key benefits:\n" +
      "- Maintain brand consistency at scale\n" +
      "- AI-assisted content generation aligned with your brand voice\n" +
      "- Real-time brand alignment scoring\n" +
      "- Streamlined campaign management\n\n" +
      "Start building a stronger brand today.";
  }

  async analyzeText(_content: string, _brandContext: string): Promise<AIAnalysisResult> {
    await delay(MOCK_DELAY);

    return {
      tone: "Professional",
      readability: 78,
      brandAlignment: 82,
      suggestions: [
        "Consider using more active voice to strengthen the brand's assertive positioning",
        "Add specific metrics or data points to support claims and increase credibility",
        "The closing paragraph could better reflect the brand's call-to-action style",
        "Consider incorporating more of the brand's key differentiators in the opening",
      ],
    };
  }

  async brandHealth(_brandAssets: string): Promise<AIBrandHealthResult> {
    await delay(MOCK_DELAY);

    return {
      overallScore: 78,
      assets: [
        { name: "Mission Statement", score: 92, status: "aligned" },
        { name: "Vision", score: 88, status: "aligned" },
        { name: "Brand Values", score: 85, status: "aligned" },
        { name: "Brand Voice", score: 72, status: "review" },
        { name: "Visual Identity", score: 68, status: "review" },
        { name: "Personas", score: 80, status: "aligned" },
        { name: "Product Positioning", score: 55, status: "outdated" },
        { name: "Competitive Differentiation", score: 74, status: "review" },
      ],
      recommendations: [
        "Update Product Positioning to reflect recent market changes and new product features",
        "Review Visual Identity guidelines to ensure consistency across new digital channels",
        "Strengthen Brand Voice documentation with specific examples for social media",
        "Consider adding a Brand Architecture section to clarify sub-brand relationships",
        "Schedule quarterly brand alignment reviews to maintain consistency",
      ],
    };
  }
}
