import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

// GET /api/cohorts/[id]/alerts — instructor alerts for struggling/inactive students
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
    const svc = getServiceClient();

    // Verify instructor
    const { data: cohort } = await svc
      .from('cohorts')
      .select('instructor_id')
      .eq('id', id)
      .single();

    if (!cohort) {
      return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
    }

    if (cohort.instructor_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all members
    const { data: members } = await svc
      .from('cohort_members')
      .select('user_id')
      .eq('cohort_id', id);

    const memberIds = (members || []).map((m: { user_id: string }) => m.user_id);

    if (memberIds.length === 0) {
      return NextResponse.json({ alerts: [] });
    }

    // Fetch profiles, xp events, and scenario progress in parallel
    const [profilesRes, xpEventsRes, progressRes] = await Promise.all([
      svc.from('user_profiles').select('id, full_name').in('id', memberIds),
      svc.from('xp_events')
        .select('user_id, created_at')
        .in('user_id', memberIds)
        .order('created_at', { ascending: false }),
      svc.from('scenario_progress')
        .select('user_id, score, completed')
        .in('user_id', memberIds)
        .eq('completed', true),
    ]);

    const profiles = (profilesRes.data || []).reduce(
      (acc: Record<string, string>, p: { id: string; full_name: string }) => {
        acc[p.id] = p.full_name;
        return acc;
      },
      {} as Record<string, string>,
    );

    // Find last active date per user from xp_events
    const lastActive: Record<string, string> = {};
    for (const evt of (xpEventsRes.data || []) as Array<{ user_id: string; created_at: string }>) {
      if (!lastActive[evt.user_id]) {
        lastActive[evt.user_id] = evt.created_at;
      }
    }

    // Aggregate scenario data per user
    const scenarioData: Record<string, { count: number; totalScore: number }> = {};
    for (const row of (progressRes.data || []) as Array<{ user_id: string; score: number }>) {
      if (!scenarioData[row.user_id]) {
        scenarioData[row.user_id] = { count: 0, totalScore: 0 };
      }
      scenarioData[row.user_id].count++;
      scenarioData[row.user_id].totalScore += row.score || 0;
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const alerts: Array<{
      user_id: string;
      full_name: string;
      alert_type: string;
      detail: string;
      last_active: string | null;
    }> = [];

    for (const uid of memberIds) {
      const fullName = profiles[uid] || 'Unknown';
      const userLastActive = lastActive[uid] || null;
      const sd = scenarioData[uid] || { count: 0, totalScore: 0 };

      // Check for "inactive": no xp_events in last 7 days
      if (!userLastActive || userLastActive < sevenDaysAgo) {
        const daysSince = userLastActive
          ? Math.floor((Date.now() - new Date(userLastActive).getTime()) / (1000 * 60 * 60 * 24))
          : null;
        alerts.push({
          user_id: uid,
          full_name: fullName,
          alert_type: 'inactive',
          detail: daysSince !== null
            ? `No activity in ${daysSince} days`
            : 'No activity recorded',
          last_active: userLastActive,
        });
      }

      // Check for "struggling": avg scenario score < 40
      if (sd.count > 0) {
        const avgScore = sd.totalScore / sd.count;
        if (avgScore < 40) {
          alerts.push({
            user_id: uid,
            full_name: fullName,
            alert_type: 'struggling',
            detail: `Average scenario score: ${Math.round(avgScore)}/100 across ${sd.count} scenario${sd.count !== 1 ? 's' : ''}`,
            last_active: userLastActive,
          });
        }
      }

      // Check for "no_progress": zero completed scenarios
      if (sd.count === 0) {
        alerts.push({
          user_id: uid,
          full_name: fullName,
          alert_type: 'no_progress',
          detail: 'Has not completed any scenarios',
          last_active: userLastActive,
        });
      }
    }

    return NextResponse.json({ alerts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/cohorts/[id]/alerts:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
