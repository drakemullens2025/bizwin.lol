import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase';

// GET /api/store/[slug] — public storefront data
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const supabase = getServiceClient();

  // Get published store
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id, slug, store_name, description, logo_url, banner_url, theme, tier')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (storeError || !store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  // Get active products
  const { data: products } = await supabase
    .from('store_products')
    .select('id, title, description, price, compare_at_price, images, category')
    .eq('store_id', store.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  return NextResponse.json({
    store: {
      name: store.store_name,
      description: store.description,
      slug: store.slug,
      logo_url: store.logo_url,
      banner_url: store.banner_url,
      theme: store.theme,
      tier: store.tier,
    },
    products: (products || []).map(p => ({
      ...p,
      images: (() => { try { return JSON.parse(p.images as string); } catch { return []; } })(),
    })),
  });
}
