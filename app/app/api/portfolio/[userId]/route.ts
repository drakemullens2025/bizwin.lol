import { NextRequest, NextResponse } from 'next/server';
import { getPortfolioData } from '@/lib/supabase';
import { getLevelForXp } from '@/lib/xp';

// GET /api/portfolio/[userId] — public portfolio data
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const data = await getPortfolioData(userId);

    if (!data.settings || !data.settings.is_public) {
      return NextResponse.json({ error: 'Portfolio not found or not public' }, { status: 404 });
    }

    const levelInfo = getLevelForXp(data.xp.total_xp);

    return NextResponse.json({
      profile: data.profile,
      settings: data.settings,
      xp: data.xp,
      levelInfo,
      scenarios: data.scenarios,
      store: data.store,
      xpTimeline: data.xpTimeline,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/portfolio/[userId]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
