import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

// GET /api/cohorts/[id]/curriculum — return cohort's curriculum_config
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

    // Verify user is instructor or member
    const { data: cohort } = await svc
      .from('cohorts')
      .select('instructor_id, curriculum_config')
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

    // Return curriculum config with defaults
    const config = cohort.curriculum_config || {
      enabled_tiers: [0, 1, 2, 3],
      required_scenarios: [],
    };

    return NextResponse.json({ curriculum_config: config });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/cohorts/[id]/curriculum:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/cohorts/[id]/curriculum — update curriculum_config (instructor only)
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
    const { enabled_tiers, required_scenarios } = body;

    // Validate input
    const config: { enabled_tiers?: number[]; required_scenarios?: string[] } = {};

    if (enabled_tiers !== undefined) {
      if (!Array.isArray(enabled_tiers) || !enabled_tiers.every((t: unknown) => typeof t === 'number' && t >= 0 && t <= 3)) {
        return NextResponse.json({ error: 'enabled_tiers must be an array of numbers 0-3' }, { status: 400 });
      }
      config.enabled_tiers = enabled_tiers;
    }

    if (required_scenarios !== undefined) {
      if (!Array.isArray(required_scenarios) || !required_scenarios.every((s: unknown) => typeof s === 'string')) {
        return NextResponse.json({ error: 'required_scenarios must be an array of strings' }, { status: 400 });
      }
      config.required_scenarios = required_scenarios;
    }

    // Merge with existing config
    const { data: existing } = await svc
      .from('cohorts')
      .select('curriculum_config')
      .eq('id', id)
      .single();

    const existingConfig = existing?.curriculum_config || {
      enabled_tiers: [0, 1, 2, 3],
      required_scenarios: [],
    };

    const mergedConfig = { ...existingConfig, ...config };

    const { data, error } = await svc
      .from('cohorts')
      .update({
        curriculum_config: mergedConfig,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('curriculum_config')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ curriculum_config: data?.curriculum_config });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('PATCH /api/cohorts/[id]/curriculum:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
