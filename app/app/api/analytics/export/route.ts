import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

function escapeCsv(val: string | number | null | undefined): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// GET /api/analytics/export — export store data as CSV
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const svc = getServiceClient();
    const storeId = req.nextUrl.searchParams.get('store_id');
    const exportType = req.nextUrl.searchParams.get('type') || 'orders';

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

    let csv = '';
    let filename = '';

    if (exportType === 'orders') {
      const { data: orders } = await svc
        .from('store_orders')
        .select('order_number, created_at, customer_name, total, status')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      const header = 'order_number,date,customer,total,status';
      const rows = (orders || []).map((o: {
        order_number: string;
        created_at: string;
        customer_name: string;
        total: number;
        status: string;
      }) => [
        escapeCsv(o.order_number),
        escapeCsv(o.created_at.split('T')[0]),
        escapeCsv(o.customer_name),
        (o.total || 0).toFixed(2),
        escapeCsv(o.status),
      ].join(','));

      csv = [header, ...rows].join('\n');
      filename = 'orders-export.csv';

    } else if (exportType === 'products') {
      const { data: products } = await svc
        .from('store_products')
        .select('title, price, cj_cost, margin_percent, category')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      const header = 'title,price,cj_cost,margin,category';
      const rows = (products || []).map((p: {
        title: string;
        price: number;
        cj_cost: number;
        margin_percent: number;
        category: string;
      }) => [
        escapeCsv(p.title),
        (p.price || 0).toFixed(2),
        (p.cj_cost || 0).toFixed(2),
        (p.margin_percent || 0).toFixed(1),
        escapeCsv(p.category),
      ].join(','));

      csv = [header, ...rows].join('\n');
      filename = 'products-export.csv';

    } else if (exportType === 'summary') {
      const { data: orders } = await svc
        .from('store_orders')
        .select('total, created_at')
        .eq('store_id', storeId)
        .order('created_at', { ascending: true });

      // Aggregate by month
      const monthlyData: Record<string, { revenue: number; count: number }> = {};
      for (const o of (orders || []) as Array<{ total: number; created_at: string }>) {
        const month = o.created_at.substring(0, 7);
        if (!monthlyData[month]) {
          monthlyData[month] = { revenue: 0, count: 0 };
        }
        monthlyData[month].revenue += o.total || 0;
        monthlyData[month].count++;
      }

      const header = 'month,revenue,order_count,avg_order_value';
      const rows = Object.entries(monthlyData)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, data]) => [
          month,
          data.revenue.toFixed(2),
          data.count,
          data.count > 0 ? (data.revenue / data.count).toFixed(2) : '0.00',
        ].join(','));

      csv = [header, ...rows].join('\n');
      filename = 'summary-export.csv';

    } else {
      return NextResponse.json({ error: 'Invalid export type. Use: orders, products, or summary' }, { status: 400 });
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/analytics/export:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
