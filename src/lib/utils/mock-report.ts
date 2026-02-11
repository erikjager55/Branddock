export interface AnalysisReport {
  completedAt: string;
  dataPoints: number;
  sources: number;
  executiveSummary: string;
  findings: {
    icon: string;
    title: string;
    description: string;
    color: string;
    iconBg: string;
  }[];
  recommendations: {
    number: number;
    title: string;
    description: string;
  }[];
}

export function generateMockReport(
  assetName: string,
  questionCount: number
): AnalysisReport {
  return {
    completedAt: new Date().toISOString(),
    dataPoints: 180 + Math.floor(Math.random() * 120),
    sources: 4,
    executiveSummary: `Based on comprehensive analysis of ${questionCount} questions about ${assetName}, your brand demonstrates strong foundational elements with clear opportunities for differentiation. The analysis reveals consistent themes around authenticity, customer-centricity, and innovation that can be leveraged to strengthen your market position. Key areas of focus should include refining your unique value proposition and ensuring consistent brand expression across all touchpoints.`,
    findings: [
      {
        icon: "🎯",
        title: "Brand Purpose",
        description: `Your ${assetName.toLowerCase()} shows a clear sense of purpose that resonates with your target audience. The core themes of innovation and reliability provide a strong foundation for brand communications.`,
        color: "#F59E0B",
        iconBg: "bg-amber-500/15 text-amber-500",
      },
      {
        icon: "👥",
        title: "Target Audience Alignment",
        description:
          "Analysis indicates strong alignment between your brand positioning and target audience expectations. There is an opportunity to deepen emotional connections through storytelling.",
        color: "#3B82F6",
        iconBg: "bg-blue-500/15 text-blue-500",
      },
      {
        icon: "✨",
        title: "Unique Value Proposition",
        description:
          "Your differentiators are clear but could be communicated more consistently. The analysis suggests emphasizing your unique approach to customer relationships.",
        color: "#10B981",
        iconBg: "bg-emerald-500/15 text-emerald-500",
      },
      {
        icon: "💡",
        title: "Customer Challenge",
        description:
          "The primary customer pain point your brand addresses is well-defined. Consider expanding your messaging to address secondary challenges that your solution also resolves.",
        color: "#8B5CF6",
        iconBg: "bg-purple-500/15 text-purple-500",
      },
      {
        icon: "📈",
        title: "Market Position",
        description:
          "Your current market positioning is competitive but has room for more distinctive differentiation. Focus on the elements that only your brand can deliver.",
        color: "#EC4899",
        iconBg: "bg-pink-500/15 text-pink-500",
      },
    ],
    recommendations: [
      {
        number: 1,
        title: "Strengthen Core Messaging",
        description:
          "Refine your primary brand message to be more concise and emotionally resonant. Focus on the 'why' behind your brand rather than the 'what'.",
      },
      {
        number: 2,
        title: "Expand Validation Methods",
        description:
          "Complement this AI analysis with stakeholder interviews and customer surveys to build a comprehensive validation framework.",
      },
      {
        number: 3,
        title: "Develop Brand Guidelines",
        description:
          "Create detailed brand expression guidelines that ensure consistency across all channels and touchpoints.",
      },
      {
        number: 4,
        title: "Conduct Competitive Analysis",
        description:
          "Map your brand positioning against key competitors to identify white space opportunities in your market.",
      },
      {
        number: 5,
        title: "Create Brand Story Framework",
        description:
          "Develop a structured narrative framework that connects your brand history, current mission, and future vision.",
      },
    ],
  };
}
