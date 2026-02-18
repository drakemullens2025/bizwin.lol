import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { product_name, cj_cost, proposed_price, category, shipping_estimate } = await req.json();

    if (!product_name || !cj_cost) {
      return NextResponse.json({ error: 'Product name and CJ cost required' }, { status: 400 });
    }

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
    }

    const totalCost = (cj_cost || 0) + (shipping_estimate || 0);

    const prompt = `You are an expert e-commerce pricing strategist for a dropshipping education platform. A student is pricing a product and needs your analysis.

PRODUCT DATA:
- Product: "${product_name}"
- CJ Cost: $${cj_cost}
- Estimated Shipping: $${shipping_estimate || 'Unknown'}
- Total Cost Basis: $${totalCost}
- Category: ${category || 'General'}
${proposed_price ? `- Student's Proposed Price: $${proposed_price}` : '- No price proposed yet'}

Analyze and return ONLY valid JSON:
{
  "margin_health": {
    "score": <0-100>,
    "current_margin_percent": ${proposed_price ? `<number based on proposed price>` : 'null'},
    "assessment": "<1-2 sentences on margin viability>"
  },
  "recommended_range": {
    "floor": <minimum viable price>,
    "sweet_spot": <optimal price>,
    "ceiling": <maximum before demand drops>,
    "reasoning": "<2 sentences explaining the range>"
  },
  "positioning": {
    "strategy": "<premium | competitive | value | race_to_bottom>",
    "assessment": "<2 sentences on how this price positions the product>"
  },
  "psychological_pricing": [
    "<specific pricing tactic, e.g. 'Price at $29.99 instead of $30 — charm pricing'>",
    "<another tactic>"
  ],
  "bundle_opportunity": "<suggestion for bundling or upselling, or 'None identified'>",
  "volume_projection": {
    "at_low_price": { "price": <number>, "estimated_monthly_units": <number>, "monthly_profit": <number> },
    "at_sweet_spot": { "price": <number>, "estimated_monthly_units": <number>, "monthly_profit": <number> },
    "at_high_price": { "price": <number>, "estimated_monthly_units": <number>, "monthly_profit": <number> }
  },
  "verdict": "<strong_margin | healthy | thin | underwater>",
  "recommendation": "<2-3 sentences of actionable pricing advice>"
}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'bizwin.lol Pricing Advisor',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-v3.2',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter error:', error);
      return NextResponse.json({ error: 'AI analysis failed' }, { status: response.status });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'No analysis generated' }, { status: 500 });
    }

    let analysis;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse pricing analysis:', content);
      return NextResponse.json({ error: 'Failed to parse analysis' }, { status: 500 });
    }

    if (analysis.margin_health) {
      analysis.margin_health.score = Math.min(100, Math.max(0, analysis.margin_health.score || 50));
    }

    return NextResponse.json({ success: true, analysis });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Pricing advisor error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
