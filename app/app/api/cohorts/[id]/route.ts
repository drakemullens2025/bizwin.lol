import { NextRequest, NextResponse } from 'next/server';
import { getCohortWithStats, getServiceClient } from '@/lib/supabase';

// GET /api/cohorts/[id] — cohort detail with stats
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

    // Verify user is a member or instructor
    const svc = getServiceClient();
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

    const stats = await getCohortWithStats(id);

    return NextResponse.json({ cohort: stats });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/cohorts/[id]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/cohorts/[id] — update cohort (instructor only)
export async function PATCH(
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

    if (!cohort || cohort.instructor_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const allowed = ['name', 'description', 'is_active'];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) safeUpdates[key] = body[key];
    }
    safeUpdates.updated_at = new Date().toISOString();

    const { data, error } = await svc
      .from('cohorts')
      .update(safeUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ cohort: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('PATCH /api/cohorts/[id]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/cohorts/[id] — deactivate cohort (instructor only)
export async function DELETE(
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

    if (!cohort || cohort.instructor_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await svc
      .from('cohorts')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('DELETE /api/cohorts/[id]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
