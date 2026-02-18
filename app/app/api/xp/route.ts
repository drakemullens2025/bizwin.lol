import { NextRequest, NextResponse } from 'next/server';
import { getUserXp, getXpEvents } from '@/lib/supabase';
import { getLevelForXp } from '@/lib/xp';

// GET /api/xp — get user's XP details and recent events
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [xp, recentEvents] = await Promise.all([
      getUserXp(userId),
      getXpEvents(userId, 20),
    ]);

    const levelInfo = getLevelForXp(xp.total_xp);

    return NextResponse.json({
      xp,
      levelInfo,
      recentEvents,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/xp:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
