export interface AIGenerateOptions {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIAnalysisResult {
  tone: string;
  readability: number;
  brandAlignment: number;
  suggestions: string[];
}

export interface AIBrandHealthResult {
  overallScore: number;
  assets: { name: string; score: number; status: string }[];
  recommendations: string[];
}

export interface AIProvider {
  generateText(options: AIGenerateOptions): Promise<string>;
  analyzeText(content: string, brandContext: string): Promise<AIAnalysisResult>;
  brandHealth(brandAssets: string): Promise<AIBrandHealthResult>;
}

export type AIProviderType = "openai" | "anthropic";

export function getAIProvider(provider: AIProviderType = "openai"): AIProvider {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (provider === "anthropic" && anthropicKey) {
    // Dynamic import to avoid loading unused SDKs
    const { AnthropicProvider } = require("./anthropic");
    return new AnthropicProvider(anthropicKey);
  }

  if (provider === "openai" && openaiKey) {
    const { OpenAIProvider } = require("./openai");
    return new OpenAIProvider(openaiKey);
  }

  // Fallback: try whichever key is available
  if (anthropicKey) {
    const { AnthropicProvider } = require("./anthropic");
    return new AnthropicProvider(anthropicKey);
  }
  if (openaiKey) {
    const { OpenAIProvider } = require("./openai");
    return new OpenAIProvider(openaiKey);
  }

  // No API keys configured - use mock provider
  const { MockProvider } = require("./mock");
  return new MockProvider();
}
