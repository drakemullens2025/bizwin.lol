import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase';

// GET /api/store/orders?store_id=xxx — list orders for a store
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('store_id');
  if (!storeId) {
    return NextResponse.json({ error: 'store_id required' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('store_orders')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: data || [] });
}

// POST /api/store/orders — create a customer order (public checkout)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { store_slug, customer_email, customer_name, shipping_address, items } = body;

  if (!store_slug || !customer_email || !customer_name || !shipping_address || !items?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Resolve store
  const { data: store } = await supabase
    .from('stores')
    .select('id, tier')
    .eq('slug', store_slug)
    .eq('is_published', true)
    .single();

  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  // Resolve product prices from DB (don't trust client prices)
  const productIds = items.map((i: { product_id: string }) => i.product_id);
  const { data: products } = await supabase
    .from('store_products')
    .select('id, title, price, cj_cost')
    .in('id', productIds)
    .eq('store_id', store.id)
    .eq('is_active', true);

  if (!products || products.length === 0) {
    return NextResponse.json({ error: 'No valid products' }, { status: 400 });
  }

  const priceMap = new Map(products.map(p => [p.id, p]));
  const lineItems = items
    .map((item: { product_id: string; qty: number }) => {
      const product = priceMap.get(item.product_id);
      if (!product) return null;
      return {
        product_id: product.id,
        title: product.title,
        qty: Math.max(1, Math.min(10, item.qty || 1)),
        price: product.price,
      };
    })
    .filter(Boolean);

  if (lineItems.length === 0) {
    return NextResponse.json({ error: 'No valid items' }, { status: 400 });
  }

  const subtotal = lineItems.reduce((sum: number, item: { price: number; qty: number }) => sum + item.price * item.qty, 0);
  const shippingCost = 0; // TODO: calculate from CJ shipping estimates
  const total = subtotal + shippingCost;

  const orderNumber = `CJV-${Date.now().toString(36).toUpperCase()}`;

  const { data: order, error } = await supabase
    .from('store_orders')
    .insert({
      store_id: store.id,
      order_number: orderNumber,
      customer_email,
      customer_name,
      shipping_address,
      line_items: lineItems,
      subtotal: Math.round(subtotal * 100) / 100,
      shipping_cost: shippingCost,
      total: Math.round(total * 100) / 100,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ order });
}
