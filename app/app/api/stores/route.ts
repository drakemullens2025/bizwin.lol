import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, ensureUserProfile } from '@/lib/supabase';
import { storeTemplates } from '@/data/store-templates';

// GET /api/stores — list all stores for the current user
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ stores: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/stores error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/stores — create a new store (multi-store support)
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { slug, store_name, description, theme, template_id } = await req.json();

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
    const { data: existingSlug } = await supabase
      .from('stores')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingSlug) {
      return NextResponse.json({ error: 'This slug is already taken' }, { status: 409 });
    }

    // Determine if user already has stores (for is_primary)
    const { data: existingStores } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userId);

    const hasExistingStores = (existingStores || []).length > 0;

    // Build theme: start with default, apply template if provided, then apply overrides
    let finalTheme = { primary: '#2563eb', bg: '#ffffff', accent: '#f59e0b' };

    if (template_id) {
      const template = storeTemplates.find(t => t.id === template_id);
      if (template) {
        finalTheme = {
          primary: template.theme.primary,
          bg: template.theme.bg,
          accent: template.theme.accent,
        };
      }
    }

    // Apply any direct theme overrides
    if (theme) {
      finalTheme = { ...finalTheme, ...theme };
    }

    const { data, error } = await supabase
      .from('stores')
      .insert({
        user_id: userId,
        slug,
        store_name,
        description: description || '',
        theme: finalTheme,
        template_id: template_id || null,
        is_primary: !hasExistingStores,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Duplicate store entry' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ store: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('POST /api/stores error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
