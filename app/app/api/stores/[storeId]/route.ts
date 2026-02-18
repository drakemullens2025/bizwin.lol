import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

// GET /api/stores/[storeId] — get a specific store (verify ownership)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { storeId } = await params;
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ store: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/stores/[storeId] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/stores/[storeId] — update store fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { storeId } = await params;
    const updates = await req.json();
    const supabase = getServiceClient();

    // Verify ownership
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .eq('user_id', userId)
      .single();

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Whitelist allowed fields
    const allowed = ['store_name', 'description', 'theme', 'logo_url', 'banner_url', 'is_published', 'template_id', 'is_primary'];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in updates) safeUpdates[key] = updates[key];
    }
    safeUpdates.updated_at = new Date().toISOString();

    // If setting is_primary=true, unset all other stores for this user
    if (safeUpdates.is_primary === true) {
      await supabase
        .from('stores')
        .update({ is_primary: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .neq('id', storeId);
    }

    const { data, error } = await supabase
      .from('stores')
      .update(safeUpdates)
      .eq('id', storeId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ store: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('PATCH /api/stores/[storeId] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/stores/[storeId] — permanently delete store and its products
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { storeId } = await params;
    const supabase = getServiceClient();

    // Verify ownership
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .eq('user_id', userId)
      .single();

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Delete store products first (FK constraint)
    await supabase.from('store_products').delete().eq('store_id', storeId);

    // Delete the store
    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', storeId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Store deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('DELETE /api/stores/[storeId] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
