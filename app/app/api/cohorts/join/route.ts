import { NextRequest, NextResponse } from 'next/server';
import { joinCohort } from '@/lib/supabase';

// POST /api/cohorts/join — join a cohort via invite code
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { invite_code } = await req.json();

    if (!invite_code) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    const result = await joinCohort(userId, invite_code);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      member: result.member,
      cohortId: result.cohortId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('POST /api/cohorts/join:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
