import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

// GET /api/intelligence/margins — margin analysis for a store's products
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const svc = getServiceClient();
    const storeId = req.nextUrl.searchParams.get('store_id');

    if (!storeId) {
      return NextResponse.json({ error: 'store_id query parameter is required' }, { status: 400 });
    }

    // Verify the store belongs to the user
    const { data: store } = await svc
      .from('stores')
      .select('id, user_id')
      .eq('id', storeId)
      .single();

    if (!store || store.user_id !== userId) {
      return NextResponse.json({ error: 'Store not found or not yours' }, { status: 403 });
    }

    // Get store's products
    const { data: storeProducts } = await svc
      .from('store_products')
      .select('id, title, price, cj_cost, margin_percent, category, is_active')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const products = storeProducts || [];

    // Calculate platform average margin per category from all store_products
    const { data: allProducts } = await svc
      .from('store_products')
      .select('category, margin_percent')
      .eq('is_active', true)
      .not('category', 'is', null);

    const categoryTotals: Record<string, { sum: number; count: number }> = {};
    for (const p of (allProducts || []) as Array<{ category: string; margin_percent: number }>) {
      const cat = p.category || 'uncategorized';
      if (!categoryTotals[cat]) {
        categoryTotals[cat] = { sum: 0, count: 0 };
      }
      categoryTotals[cat].sum += p.margin_percent || 0;
      categoryTotals[cat].count++;
    }

    const categoryAvgMargin: Record<string, number> = {};
    for (const [cat, data] of Object.entries(categoryTotals)) {
      categoryAvgMargin[cat] = data.count > 0 ? Math.round((data.sum / data.count) * 100) / 100 : 0;
    }

    const enrichedProducts = products.map((p: {
      id: string;
      title: string;
      price: number;
      cj_cost: number;
      margin_percent: number;
      category: string;
    }) => {
      const cat = p.category || 'uncategorized';
      const catAvg = categoryAvgMargin[cat] || 0;
      const marginPct = p.margin_percent || 0;
      return {
        id: p.id,
        title: p.title,
        price: p.price,
        cj_cost: p.cj_cost,
        margin_pct: marginPct,
        category: cat,
        category_avg_margin: catAvg,
        margin_vs_avg: Math.round((marginPct - catAvg) * 100) / 100,
      };
    });

    return NextResponse.json({ products: enrichedProducts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/intelligence/margins:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
