import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

// POST /api/intelligence/ai-review — AI analysis of store product lineup
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

    // Fetch store products with margins
    const { data: products } = await svc
      .from('store_products')
      .select('title, price, cj_cost, margin_percent, category, is_active')
      .eq('store_id', store_id)
      .eq('is_active', true);

    const productList = products || [];

    if (productList.length === 0) {
      return NextResponse.json({
        review: {
          health_score: 0,
          margin_analysis: 'No products to analyze.',
          risk_factors: ['Store has no active products'],
          recommendations: ['Add products to your store to get an AI review'],
        },
      });
    }

    // Prepare product data summary for AI
    const productSummary = productList.map((p: {
      title: string;
      price: number;
      cj_cost: number;
      margin_percent: number;
      category: string;
    }) => ({
      title: p.title,
      price: p.price,
      cost: p.cj_cost,
      margin_pct: p.margin_percent,
      category: p.category || 'uncategorized',
    }));

    // Category distribution
    const categoryCount: Record<string, number> = {};
    for (const p of productSummary) {
      categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
    }

    const avgMargin = productSummary.reduce((s, p) => s + (p.margin_pct || 0), 0) / productSummary.length;

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
    }

    const prompt = `You are a dropshipping business analyst. Analyze this store's product lineup and provide a detailed review.

STORE: ${store.store_name}
PRODUCTS (${productList.length} total):
${JSON.stringify(productSummary, null, 2)}

CATEGORY DISTRIBUTION:
${JSON.stringify(categoryCount, null, 2)}

AVERAGE MARGIN: ${avgMargin.toFixed(1)}%

Return ONLY valid JSON (no markdown, no code blocks):
{
  "health_score": <0-100 overall product lineup health>,
  "margin_analysis": "<2-3 sentences analyzing margins across the lineup>",
  "top_performers": ["<product that stands out positively>", "..."],
  "underperformers": ["<product with issues>", "..."],
  "risk_factors": ["<specific risk 1>", "<specific risk 2>", "..."],
  "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>", "<actionable recommendation 3>", "<actionable recommendation 4>", "<actionable recommendation 5>"]
}

Be specific and reference actual product names and numbers.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'bizwin.lol Intelligence',
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
        health_score: Math.min(100, Math.max(0, review.health_score || 0)),
        margin_analysis: review.margin_analysis || '',
        top_performers: review.top_performers || [],
        underperformers: review.underperformers || [],
        risk_factors: review.risk_factors || [],
        recommendations: review.recommendations || [],
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('POST /api/intelligence/ai-review:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
