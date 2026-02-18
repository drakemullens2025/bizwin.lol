import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

// GET /api/analytics/store — store performance analytics
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const svc = getServiceClient();
    const storeId = req.nextUrl.searchParams.get('store_id');
    const rangeDays = parseInt(req.nextUrl.searchParams.get('range') || '30', 10);

    if (!storeId) {
      return NextResponse.json({ error: 'store_id query parameter is required' }, { status: 400 });
    }

    // Verify store ownership
    const { data: store } = await svc
      .from('stores')
      .select('id, user_id')
      .eq('id', storeId)
      .single();

    if (!store || store.user_id !== userId) {
      return NextResponse.json({ error: 'Store not found or not yours' }, { status: 403 });
    }

    const now = new Date();
    const periodStart = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
    const prevPeriodStart = new Date(now.getTime() - 2 * rangeDays * 24 * 60 * 60 * 1000).toISOString();

    // Fetch current period orders and previous period orders
    const [currentOrdersRes, prevOrdersRes, productsRes] = await Promise.all([
      svc.from('store_orders')
        .select('id, total, created_at, line_items')
        .eq('store_id', storeId)
        .gte('created_at', periodStart)
        .order('created_at', { ascending: true }),
      svc.from('store_orders')
        .select('id, total')
        .eq('store_id', storeId)
        .gte('created_at', prevPeriodStart)
        .lt('created_at', periodStart),
      svc.from('store_products')
        .select('id, title, price, cj_cost, margin_percent, category')
        .eq('store_id', storeId)
        .eq('is_active', true),
    ]);

    const currentOrders = currentOrdersRes.data || [];
    const prevOrders = prevOrdersRes.data || [];
    const products = productsRes.data || [];

    // Revenue by day
    const revenueByDay: Record<string, number> = {};
    for (const order of currentOrders as Array<{ total: number; created_at: string }>) {
      const day = order.created_at.split('T')[0];
      revenueByDay[day] = (revenueByDay[day] || 0) + (order.total || 0);
    }

    // Fill in missing days with zero
    const revenueDays: Array<{ date: string; revenue: number }> = [];
    for (let i = 0; i < rangeDays; i++) {
      const d = new Date(now.getTime() - (rangeDays - 1 - i) * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      revenueDays.push({ date: dateStr, revenue: revenueByDay[dateStr] || 0 });
    }

    // Product performance from line_items
    const productRevenue: Record<string, { title: string; revenue: number; units: number }> = {};
    for (const order of currentOrders as Array<{ line_items: Array<{ product_id?: string; title?: string; price?: number; quantity?: number }> }>) {
      const items = order.line_items || [];
      for (const item of items) {
        const pid = item.product_id || item.title || 'unknown';
        if (!productRevenue[pid]) {
          productRevenue[pid] = { title: item.title || pid, revenue: 0, units: 0 };
        }
        productRevenue[pid].revenue += (item.price || 0) * (item.quantity || 1);
        productRevenue[pid].units += item.quantity || 1;
      }
    }

    const productPerformance = Object.entries(productRevenue)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .map(([id, data], idx) => ({
        id,
        rank: idx + 1,
        title: data.title,
        revenue: Math.round(data.revenue * 100) / 100,
        units_sold: data.units,
      }));

    // Totals
    const totalRevenue = currentOrders.reduce(
      (s: number, o: { total: number }) => s + (o.total || 0), 0,
    );
    const orderCount = currentOrders.length;
    const avgOrderValue = orderCount > 0 ? Math.round((totalRevenue / orderCount) * 100) / 100 : 0;

    // Average margin from products
    const avgMargin = products.length > 0
      ? Math.round(
          (products.reduce((s: number, p: { margin_percent: number }) => s + (p.margin_percent || 0), 0) / products.length) * 100,
        ) / 100
      : 0;

    // Comparison with previous period
    const prevRevenue = prevOrders.reduce(
      (s: number, o: { total: number }) => s + (o.total || 0), 0,
    );
    const prevOrderCount = prevOrders.length;

    const revenueChange = prevRevenue > 0
      ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
      : (totalRevenue > 0 ? 100 : 0);
    const orderCountChange = prevOrderCount > 0
      ? Math.round(((orderCount - prevOrderCount) / prevOrderCount) * 100)
      : (orderCount > 0 ? 100 : 0);

    return NextResponse.json({
      revenue_by_day: revenueDays,
      product_performance: productPerformance,
      totals: {
        total_revenue: Math.round(totalRevenue * 100) / 100,
        order_count: orderCount,
        avg_order_value: avgOrderValue,
        avg_margin: avgMargin,
      },
      comparison: {
        revenue_change_pct: revenueChange,
        order_count_change_pct: orderCountChange,
        prev_revenue: Math.round(prevRevenue * 100) / 100,
        prev_order_count: prevOrderCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/analytics/store:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
