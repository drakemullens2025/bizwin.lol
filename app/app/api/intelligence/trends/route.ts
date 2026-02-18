import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

// GET /api/intelligence/trends — trending searches and products
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const svc = getServiceClient();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch recent product events (last 14 days for comparison)
    const { data: events } = await svc
      .from('product_events')
      .select('event_type, search_query, cj_product_id, product_name, created_at')
      .gte('created_at', fourteenDaysAgo)
      .order('created_at', { ascending: false });

    const allEvents = events || [];

    // Split events into current and previous periods
    const currentEvents = allEvents.filter(e => e.created_at >= sevenDaysAgo);
    const previousEvents = allEvents.filter(e => e.created_at < sevenDaysAgo);

    // Top 10 search queries (last 7 days)
    const searchCounts: Record<string, number> = {};
    for (const e of currentEvents) {
      if (e.event_type === 'search' && e.search_query) {
        const q = e.search_query.toLowerCase().trim();
        searchCounts[q] = (searchCounts[q] || 0) + 1;
      }
    }
    const trendingSearches = Object.entries(searchCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    // Top 10 viewed/added products (last 7 days)
    const productCounts: Record<string, { count: number; name: string }> = {};
    for (const e of currentEvents) {
      if ((e.event_type === 'view' || e.event_type === 'add_to_store') && e.cj_product_id) {
        if (!productCounts[e.cj_product_id]) {
          productCounts[e.cj_product_id] = { count: 0, name: e.product_name || e.cj_product_id };
        }
        productCounts[e.cj_product_id].count++;
      }
    }
    const trendingProducts = Object.entries(productCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([cj_product_id, data]) => ({
        cj_product_id,
        product_name: data.name,
        count: data.count,
      }));

    // Rising trends: compare current vs previous period search counts
    const prevSearchCounts: Record<string, number> = {};
    for (const e of previousEvents) {
      if (e.event_type === 'search' && e.search_query) {
        const q = e.search_query.toLowerCase().trim();
        prevSearchCounts[q] = (prevSearchCounts[q] || 0) + 1;
      }
    }

    const rising = Object.entries(searchCounts)
      .map(([query, count]) => {
        const prevCount = prevSearchCounts[query] || 0;
        const growth = prevCount > 0
          ? Math.round(((count - prevCount) / prevCount) * 100)
          : (count > 1 ? 100 : 0);
        return { query, current_count: count, previous_count: prevCount, growth_pct: growth };
      })
      .filter(r => r.growth_pct > 0)
      .sort((a, b) => b.growth_pct - a.growth_pct)
      .slice(0, 10);

    return NextResponse.json({
      trending_searches: trendingSearches,
      trending_products: trendingProducts,
      rising,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/intelligence/trends:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
