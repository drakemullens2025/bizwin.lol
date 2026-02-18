import { NextRequest, NextResponse } from 'next/server';
import { getScenarioProgress, getUserXp } from '@/lib/supabase';
import { getLevelForXp } from '@/lib/xp';

// GET /api/progress — get user's aggregated progress
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const totalScenarios = 15;

    const [completedScenarioIds, xp] = await Promise.all([
      getScenarioProgress(userId),
      getUserXp(userId),
    ]);

    const levelInfo = getLevelForXp(xp.total_xp);

    return NextResponse.json({
      completedScenarioIds,
      scenariosDone: completedScenarioIds.length,
      totalScenarios,
      xp,
      levelInfo,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/progress:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
