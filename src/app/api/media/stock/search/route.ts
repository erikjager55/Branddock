import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';

const PEXELS_BASE_URL = 'https://api.pexels.com/v1/search';

/** GET /api/media/stock/search — Proxy search to Pexels API */
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Stock photo service is not configured. Please set PEXELS_API_KEY.' },
        { status: 503 }
      );
    }

    const { searchParams } = request.nextUrl;
    const query = searchParams.get('query') || '';
    const page = searchParams.get('page') || '1';
    const perPage = searchParams.get('per_page') || searchParams.get('perPage') || '15';

    if (!query.trim()) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    const url = new URL(PEXELS_BASE_URL);
    url.searchParams.set('query', query);
    url.searchParams.set('page', page);
    url.searchParams.set('per_page', perPage);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('Pexels API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to search stock photos' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error searching stock photos:', error);
    return NextResponse.json(
      { error: 'Failed to search stock photos' },
      { status: 500 }
    );
  }
}
