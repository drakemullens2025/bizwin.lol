import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { product, user_reasoning, user_niche } = await req.json();

    if (!product) {
      return NextResponse.json({ error: 'Product data required' }, { status: 400 });
    }

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
    }

    const prompt = `You are an expert e-commerce product analyst for a dropshipping education platform. Analyze this product for a student who is learning to build a dropshipping business.

PRODUCT DATA:
- Name: ${product.name || product.productNameEn || 'Unknown'}
- Category: ${product.categoryName || product.category || 'Unknown'}
- CJ Cost: $${product.sellPrice || product.cj_cost || 'Unknown'}
- Listed Price: $${product.productPrice || 'Unknown'}
- SKU: ${product.sku || 'N/A'}

${user_niche ? `STUDENT'S TARGET NICHE: ${user_niche}` : ''}
${user_reasoning ? `STUDENT'S REASONING FOR THIS PRODUCT: "${user_reasoning}"` : ''}

Analyze this product and return ONLY valid JSON:
{
  "viability_score": <0-100>,
  "verdict": "<strong_pick | decent | risky | avoid>",
  "margin_analysis": {
    "cj_cost": <number>,
    "recommended_retail": <number>,
    "estimated_margin_percent": <number>,
    "assessment": "<1 sentence about margin health>"
  },
  "competition": {
    "level": "<low | moderate | high | saturated>",
    "assessment": "<1-2 sentences>"
  },
  "target_audience": "<who would buy this and why>",
  "seasonal_factors": "<any seasonal or trend considerations>",
  "strengths": ["<product strength 1>", "<product strength 2>"],
  "risks": ["<risk 1>", "<risk 2>"],
  "recommendation": "<2-3 sentences of actionable advice for the student>"
  ${user_reasoning ? ',"reasoning_feedback": "<1-2 sentences evaluating the student\'s reasoning for choosing this product>"' : ''}
}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'bizwin.lol Product Advisor',
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
      console.error('Failed to parse product analysis:', content);
      return NextResponse.json({ error: 'Failed to parse analysis' }, { status: 500 });
    }

    analysis.viability_score = Math.min(100, Math.max(0, analysis.viability_score || 50));

    return NextResponse.json({ success: true, analysis });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Product advisor error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
