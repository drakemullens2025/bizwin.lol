import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, ensureUserProfile } from '../../../lib/supabase';

// GET /api/store — get current user's store
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ store: data || null });
}

// POST /api/store — create store
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug, store_name, description, theme } = await req.json();

  if (!slug || !store_name) {
    return NextResponse.json({ error: 'Store name and slug required' }, { status: 400 });
  }

  // Validate slug format
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || slug.length < 3 || slug.length > 40) {
    return NextResponse.json({ error: 'Slug must be 3-40 chars, lowercase letters, numbers, and hyphens' }, { status: 400 });
  }

  // Ensure user profile exists (FK requirement)
  const email = req.headers.get('x-user-email') || `${userId}@user.bizwin.lol`;
  await ensureUserProfile(userId, email);

  const supabase = getServiceClient();

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from('stores')
    .select('id')
    .eq('slug', slug)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'This slug is already taken' }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('stores')
    .insert({
      user_id: userId,
      slug,
      store_name,
      description: description || '',
      theme: theme || { primary: '#2563eb', bg: '#ffffff', accent: '#f59e0b' },
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'You already have a store' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ store: data });
}

// PATCH /api/store — update store
export async function PATCH(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const updates = await req.json();

  const supabase = getServiceClient();

  // Get user's store
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!store) {
    return NextResponse.json({ error: 'No store found' }, { status: 404 });
  }

  // Whitelist allowed fields
  const allowed = ['store_name', 'description', 'theme', 'logo_url', 'banner_url', 'is_published', 'settings'];
  const safeUpdates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) safeUpdates[key] = updates[key];
  }
  safeUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('stores')
    .update(safeUpdates)
    .eq('id', store.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ store: data });
}
