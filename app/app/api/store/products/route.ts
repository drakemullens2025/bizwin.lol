import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, logProductEvent } from '../../../../lib/supabase';

// GET /api/store/products — list products for user's store (supports ?store_id=)
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceClient();
  const storeId = req.nextUrl.searchParams.get('store_id');

  let store;
  if (storeId) {
    const { data } = await supabase.from('stores').select('id').eq('user_id', userId).eq('id', storeId).maybeSingle();
    store = data;
  } else {
    // Fall back: primary store, then first store
    const { data: primary } = await supabase.from('stores').select('id').eq('user_id', userId).eq('is_primary', true).maybeSingle();
    if (primary) {
      store = primary;
    } else {
      const { data: first } = await supabase.from('stores').select('id').eq('user_id', userId).order('created_at', { ascending: true }).limit(1).maybeSingle();
      store = first;
    }
  }

  if (!store) {
    return NextResponse.json({ products: [] });
  }

  const { data, error } = await supabase
    .from('store_products')
    .select('*')
    .eq('store_id', store.id)
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data || [] });
}

// POST /api/store/products — add product to store
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceClient();

  const body = await req.json();
  const requestedStoreId = body.store_id;

  let store;
  if (requestedStoreId) {
    const { data } = await supabase.from('stores').select('id, tier').eq('user_id', userId).eq('id', requestedStoreId).maybeSingle();
    store = data;
  } else {
    const { data: primary } = await supabase.from('stores').select('id, tier').eq('user_id', userId).eq('is_primary', true).maybeSingle();
    if (primary) {
      store = primary;
    } else {
      const { data: first } = await supabase.from('stores').select('id, tier').eq('user_id', userId).order('created_at', { ascending: true }).limit(1).maybeSingle();
      store = first;
    }
  }

  if (!store) {
    return NextResponse.json({ error: 'Create a store first' }, { status: 400 });
  }

  // Check product limit for tier
  const { count } = await supabase
    .from('store_products')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', store.id)
    .eq('is_active', true);

  const limit = store.tier >= 2 ? Infinity : 10;
  if ((count || 0) >= limit) {
    return NextResponse.json({ error: `Product limit reached (${limit}). Upgrade to add more.` }, { status: 403 });
  }

  const { cj_product_id, cj_variant_id, title, description, price, compare_at_price, cj_cost, images, category } = body;

  if (!cj_product_id || !title || !price || !cj_cost) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const marginPercent = cj_cost > 0 ? ((price - cj_cost) / price) * 100 : 0;

  const { data, error } = await supabase
    .from('store_products')
    .insert({
      store_id: store.id,
      cj_product_id,
      cj_variant_id,
      title,
      description: description || '',
      price,
      compare_at_price,
      cj_cost,
      margin_percent: Math.round(marginPercent * 100) / 100,
      images: JSON.stringify(images || []),
      category,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log add_to_store event for intelligence (non-blocking)
  const userIdForEvent = req.headers.get('x-user-id');
  if (userIdForEvent && data) {
    logProductEvent(userIdForEvent, 'add_to_store', { cj_product_id: body.cj_product_id, category: body.category }).catch(() => {});
  }

  return NextResponse.json({ product: data });
}

// PATCH /api/store/products — update a product
export async function PATCH(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { product_id, ...updates } = await req.json();
  if (!product_id) {
    return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Verify ownership
  const { data: product } = await supabase
    .from('store_products')
    .select('id, store_id, stores!inner(user_id)')
    .eq('id', product_id)
    .single();

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const storeOwner = (product as unknown as { stores: { user_id: string } }).stores.user_id;
  if (storeOwner !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const allowed = ['title', 'description', 'price', 'compare_at_price', 'images', 'is_active', 'sort_order', 'category', 'tags'];
  const safeUpdates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) safeUpdates[key] = updates[key];
  }

  // Recalculate margin if price changed
  if ('price' in safeUpdates) {
    const { data: full } = await supabase.from('store_products').select('cj_cost').eq('id', product_id).single();
    if (full?.cj_cost && Number(safeUpdates.price) > 0) {
      safeUpdates.margin_percent = Math.round(((Number(safeUpdates.price) - full.cj_cost) / Number(safeUpdates.price)) * 100 * 100) / 100;
    }
  }

  safeUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('store_products')
    .update(safeUpdates)
    .eq('id', product_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}

// DELETE /api/store/products — remove product
export async function DELETE(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { product_id } = await req.json();
  if (!product_id) {
    return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Verify ownership via join
  const { data: product } = await supabase
    .from('store_products')
    .select('id, store_id, stores!inner(user_id)')
    .eq('id', product_id)
    .single();

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const storeOwner = (product as unknown as { stores: { user_id: string } }).stores.user_id;
  if (storeOwner !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { error } = await supabase
    .from('store_products')
    .delete()
    .eq('id', product_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
