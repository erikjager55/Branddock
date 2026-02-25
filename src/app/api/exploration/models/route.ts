import { NextResponse } from 'next/server';
import { EXPLORATION_MODELS } from '@/lib/ai/exploration/exploration-llm';

// ─── GET /api/exploration/models ────────────────────────────
// Returns available AI models filtered by configured API keys.
// ────────────────────────────────────────────────────────────

export async function GET() {
  const available = EXPLORATION_MODELS.filter((m) => {
    if (m.provider === 'anthropic') return !!process.env.ANTHROPIC_API_KEY;
    if (m.provider === 'google') return !!process.env.GEMINI_API_KEY;
    return false;
  });

  return NextResponse.json({
    models: available.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      description: m.description,
    })),
  });
}
