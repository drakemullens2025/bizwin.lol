import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, isAdmin } from '@/lib/supabase';

// GET /api/challenges/[id] — single challenge detail
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const svc = getServiceClient();

    const { data: challenge, error } = await svc
      .from('challenges')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    return NextResponse.json({ challenge });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/challenges/[id]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/challenges/[id] — update challenge (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = await isAdmin(userId);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const allowed = ['title', 'description', 'target_value', 'xp_reward', 'is_active'];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) safeUpdates[key] = body[key];
    }
    safeUpdates.updated_at = new Date().toISOString();

    const svc = getServiceClient();
    const { data, error } = await svc
      .from('challenges')
      .update(safeUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ challenge: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('PATCH /api/challenges/[id]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/challenges/[id] — deactivate challenge (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = await isAdmin(userId);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const svc = getServiceClient();

    const { error } = await svc
      .from('challenges')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('DELETE /api/challenges/[id]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
