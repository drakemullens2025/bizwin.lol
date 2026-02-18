import { NextRequest, NextResponse } from 'next/server';
import { getUserCohorts, createCohort } from '@/lib/supabase';

// GET /api/cohorts — user's cohorts (enrolled + instructing)
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cohorts = await getUserCohorts(userId);

    return NextResponse.json(cohorts);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/cohorts:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/cohorts — create a new cohort
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, description } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Cohort name is required' }, { status: 400 });
    }

    const cohort = await createCohort(userId, name, description);

    return NextResponse.json({ cohort });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('POST /api/cohorts:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
