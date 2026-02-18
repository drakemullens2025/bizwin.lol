import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

// POST /api/analytics/ai-review — AI business review for a store
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { store_id } = await req.json();

    if (!store_id) {
      return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
    }

    const svc = getServiceClient();

    // Verify store ownership
    const { data: store } = await svc
      .from('stores')
      .select('id, user_id, store_name')
      .eq('id', store_id)
      .single();

    if (!store || store.user_id !== userId) {
      return NextResponse.json({ error: 'Store not found or not yours' }, { status: 403 });
    }

    // Fetch orders and products
    const [ordersRes, productsRes] = await Promise.all([
      svc.from('store_orders')
        .select('id, total, created_at, status, line_items')
        .eq('store_id', store_id)
        .order('created_at', { ascending: true }),
      svc.from('store_products')
        .select('title, price, cj_cost, margin_percent, category')
        .eq('store_id', store_id)
        .eq('is_active', true),
    ]);

    const orders = ordersRes.data || [];
    const products = productsRes.data || [];

    if (products.length === 0 && orders.length === 0) {
      return NextResponse.json({
        review: {
          grade: 'N/A',
          sections: [{
            title: 'No Data',
            content: 'Your store has no products or orders yet. Add products and make sales to get an AI business review.',
          }],
        },
      });
    }

    // Compute stats for AI context
    const totalRevenue = orders.reduce((s: number, o: { total: number }) => s + (o.total || 0), 0);
    const orderCount = orders.length;
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
    const avgMargin = products.length > 0
      ? products.reduce((s: number, p: { margin_percent: number }) => s + (p.margin_percent || 0), 0) / products.length
      : 0;

    // Revenue by month
    const revenueByMonth: Record<string, number> = {};
    for (const o of orders as Array<{ total: number; created_at: string }>) {
      const month = o.created_at.substring(0, 7);
      revenueByMonth[month] = (revenueByMonth[month] || 0) + (o.total || 0);
    }

    // Category distribution
    const catCount: Record<string, number> = {};
    for (const p of products as Array<{ category: string }>) {
      const cat = p.category || 'uncategorized';
      catCount[cat] = (catCount[cat] || 0) + 1;
    }

    const productSummary = products.map((p: { title: string; price: number; cj_cost: number; margin_percent: number; category: string }) => ({
      title: p.title,
      price: p.price,
      cost: p.cj_cost,
      margin: p.margin_percent,
      category: p.category || 'uncategorized',
    }));

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
    }

    const prompt = `You are a senior e-commerce business analyst. Provide a comprehensive business review for this dropshipping store.

STORE: ${store.store_name}
TOTAL REVENUE: $${totalRevenue.toFixed(2)}
TOTAL ORDERS: ${orderCount}
AVG ORDER VALUE: $${avgOrderValue.toFixed(2)}
AVG MARGIN: ${avgMargin.toFixed(1)}%

REVENUE BY MONTH:
${JSON.stringify(revenueByMonth, null, 2)}

PRODUCTS (${products.length}):
${JSON.stringify(productSummary, null, 2)}

CATEGORY DISTRIBUTION:
${JSON.stringify(catCount, null, 2)}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "grade": "<A, B, C, D, or F>",
  "sections": [
    {
      "title": "Revenue Trend Analysis",
      "content": "<2-3 sentences analyzing revenue trend>"
    },
    {
      "title": "Top Performers",
      "content": "<2-3 sentences identifying best products>"
    },
    {
      "title": "Underperformers",
      "content": "<2-3 sentences identifying weak products>"
    },
    {
      "title": "Pricing Recommendations",
      "content": "<2-3 specific pricing suggestions>"
    },
    {
      "title": "Growth Opportunities",
      "content": "<3-4 actionable growth strategies>"
    }
  ]
}

Be specific. Reference actual product names and data points.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'bizwin.lol Analytics',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter API error:', errText);
      return NextResponse.json({ error: 'Failed to generate AI review' }, { status: response.status });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'No review generated' }, { status: 500 });
    }

    let review;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      review = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI review:', content);
      return NextResponse.json({ error: 'Failed to parse AI review' }, { status: 500 });
    }

    return NextResponse.json({
      review: {
        grade: review.grade || 'N/A',
        sections: review.sections || [],
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('POST /api/analytics/ai-review:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
