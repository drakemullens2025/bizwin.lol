import { NextRequest, NextResponse } from 'next/server';
import { getCohortMembers, getServiceClient } from '@/lib/supabase';
import { getLevelForXp } from '@/lib/xp';

// GET /api/cohorts/[id]/members — list cohort members with XP
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

    // Verify user is a member or instructor
    const { data: cohort } = await svc
      .from('cohorts')
      .select('instructor_id')
      .eq('id', id)
      .single();

    if (!cohort) {
      return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
    }

    const isInstructor = cohort.instructor_id === userId;

    if (!isInstructor) {
      const { data: membership } = await svc
        .from('cohort_members')
        .select('id')
        .eq('cohort_id', id)
        .eq('user_id', userId)
        .single();

      if (!membership) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const members = await getCohortMembers(id);
    const memberIds = members.map((m: { user_id: string }) => m.user_id);

    // Fetch profiles and XP for all members
    let profileMap: Record<string, { full_name: string; email: string }> = {};
    let xpMap: Record<string, { total_xp: number; current_level: number }> = {};

    if (memberIds.length > 0) {
      const [profilesResult, xpResult] = await Promise.all([
        svc.from('user_profiles').select('id, full_name, email').in('id', memberIds),
        svc.from('user_xp').select('user_id, total_xp, current_level').in('user_id', memberIds),
      ]);

      profileMap = (profilesResult.data || []).reduce(
        (acc: Record<string, { full_name: string; email: string }>, p: { id: string; full_name: string; email: string }) => {
          acc[p.id] = { full_name: p.full_name, email: p.email };
          return acc;
        },
        {} as Record<string, { full_name: string; email: string }>,
      );

      xpMap = (xpResult.data || []).reduce(
        (acc: Record<string, { total_xp: number; current_level: number }>, x: { user_id: string; total_xp: number; current_level: number }) => {
          acc[x.user_id] = { total_xp: x.total_xp, current_level: x.current_level };
          return acc;
        },
        {} as Record<string, { total_xp: number; current_level: number }>,
      );
    }

    const enrichedMembers = members.map((m: { user_id: string; role: string; joined_at: string }) => {
      const profile = profileMap[m.user_id] || { full_name: 'Unknown', email: '' };
      const xp = xpMap[m.user_id] || { total_xp: 0, current_level: 1 };
      return {
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        full_name: profile.full_name,
        email: profile.email,
        total_xp: xp.total_xp,
        current_level: xp.current_level,
        levelInfo: getLevelForXp(xp.total_xp),
      };
    });

    return NextResponse.json({ members: enrichedMembers });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/cohorts/[id]/members:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
