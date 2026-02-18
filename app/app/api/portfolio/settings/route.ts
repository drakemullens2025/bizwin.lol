import { NextRequest, NextResponse } from 'next/server';
import { getPortfolioSettings, updatePortfolioSettings } from '@/lib/supabase';

// GET /api/portfolio/settings — current user's portfolio settings
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await getPortfolioSettings(userId);

    return NextResponse.json({
      settings: settings || {
        is_public: false,
        show_scores: true,
        show_store_stats: true,
        bio: '',
        headline: '',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/portfolio/settings:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/portfolio/settings — update portfolio settings
export async function PATCH(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    const allowed = ['is_public', 'show_scores', 'show_store_stats', 'bio', 'headline'];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) safeUpdates[key] = body[key];
    }

    const settings = await updatePortfolioSettings(userId, safeUpdates);

    return NextResponse.json({ settings });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('PATCH /api/portfolio/settings:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
