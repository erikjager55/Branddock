import type { AIProvider, AIGenerateOptions, AIAnalysisResult, AIBrandHealthResult } from "./provider";

export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private baseUrl = "https://api.openai.com/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async chat(messages: { role: string; content: string }[], maxTokens = 2000, temperature = 0.7): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  async generateText(options: AIGenerateOptions): Promise<string> {
    const messages: { role: string; content: string }[] = [];

    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }

    messages.push({ role: "user", content: options.prompt });

    return this.chat(messages, options.maxTokens, options.temperature);
  }

  async analyzeText(content: string, brandContext: string): Promise<AIAnalysisResult> {
    const systemPrompt = `You are a brand content analyst. Analyze the following content against the brand context provided.
Return your analysis as valid JSON with this exact structure:
{
  "tone": "<detected tone, e.g. Professional, Casual, Authoritative>",
  "readability": <score 1-100>,
  "brandAlignment": <score 1-100>,
  "suggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>"]
}
Only return the JSON, nothing else.`;

    const prompt = `Brand Context:\n${brandContext}\n\nContent to analyze:\n${content}`;

    const result = await this.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      1000,
      0.3
    );

    try {
      return JSON.parse(result);
    } catch {
      return { tone: "Neutral", readability: 70, brandAlignment: 65, suggestions: ["Unable to parse AI analysis. Please try again."] };
    }
  }

  async brandHealth(brandAssets: string): Promise<AIBrandHealthResult> {
    const systemPrompt = `You are a brand strategy consultant. Analyze the completeness, consistency, and alignment of these brand assets.
Return your analysis as valid JSON with this exact structure:
{
  "overallScore": <score 0-100>,
  "assets": [{"name": "<asset name>", "score": <score 0-100>, "status": "<aligned|review|outdated>"}],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"]
}
Only return the JSON, nothing else.`;

    const result = await this.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Brand Assets:\n${brandAssets}` },
      ],
      1500,
      0.3
    );

    try {
      return JSON.parse(result);
    } catch {
      return {
        overallScore: 75,
        assets: [],
        recommendations: ["Unable to parse AI analysis. Please try again."],
      };
    }
  }
}
