import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard, getServiceClient } from '@/lib/supabase';
import { getLevelForXp } from '@/lib/xp';

// GET /api/cohorts/[id]/leaderboard — cohort-scoped leaderboard
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const entries = await getLeaderboard(50, id);

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
    console.error('GET /api/cohorts/[id]/leaderboard:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
