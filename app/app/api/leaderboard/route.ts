import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard, getServiceClient } from '@/lib/supabase';
import { getLevelForXp } from '@/lib/xp';

// GET /api/leaderboard — global or cohort-scoped leaderboard
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cohortId = searchParams.get('cohort_id') || undefined;

    const entries = await getLeaderboard(50, cohortId);

    // Fetch user profiles for display names
    const userIds = entries.map((e: { user_id: string }) => e.user_id);
    let profileMap: Record<string, string> = {};

    if (userIds.length > 0) {
      const svc = getServiceClient();
      const { data: profiles } = await svc
        .from('user_profiles')
        .select('id, full_name')
        .in('id', userIds);

      profileMap = (profiles || []).reduce(
        (acc: Record<string, string>, p: { id: string; full_name: string }) => {
          acc[p.id] = p.full_name;
          return acc;
        },
        {} as Record<string, string>,
      );
    }

    const leaderboard = entries.map((entry: { user_id: string; total_xp: number; current_level: number }, index: number) => ({
      rank: index + 1,
      user_id: entry.user_id,
      full_name: profileMap[entry.user_id] || 'Unknown',
      total_xp: entry.total_xp,
      current_level: entry.current_level,
      levelInfo: getLevelForXp(entry.total_xp),
    }));

    return NextResponse.json({ leaderboard });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/leaderboard:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
