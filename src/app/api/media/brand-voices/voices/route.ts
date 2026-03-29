import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import {
  isElevenLabsConfigured,
  listVoices,
} from '@/lib/integrations/elevenlabs/elevenlabs-client';

// ─── In-memory cache (5 min TTL) ────────────────────────────

let cachedVoices: { data: unknown; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

/** GET /api/media/brand-voices/voices — Browse ElevenLabs voice library */
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isElevenLabsConfigured()) {
      return NextResponse.json({
        voices: [],
        error: 'ElevenLabs not configured. Add ELEVENLABS_API_KEY to enable voice selection.',
      });
    }

    // Return cached data if fresh
    if (cachedVoices && Date.now() < cachedVoices.expiresAt) {
      return NextResponse.json(cachedVoices.data);
    }

    const voices = await listVoices();

    const responseData = { voices };
    cachedVoices = { data: responseData, expiresAt: Date.now() + CACHE_TTL_MS };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching ElevenLabs voices:', error);
    return NextResponse.json(
      { voices: [], error: 'Failed to fetch voices from ElevenLabs' },
      { status: 500 },
    );
  }
}
