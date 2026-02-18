import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { store_name, description, products, theme } = await req.json();

    if (!store_name) {
      return NextResponse.json({ error: 'Store name required' }, { status: 400 });
    }

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
    }

    const productSummary = products?.length
      ? products.map((p: { title: string; price: number; category?: string }) =>
          `- ${p.title} ($${p.price}, ${p.category || 'uncategorized'})`
        ).join('\n')
      : 'No products added yet.';

    const prompt = `You are an expert e-commerce brand strategist evaluating a student's dropshipping store for a learning platform. Be constructive but honest.

STORE DATA:
- Name: "${store_name}"
- Description: "${description || 'No description provided'}"
- Theme Colors: ${theme ? JSON.stringify(theme) : 'Default'}
- Products (${products?.length || 0}):
${productSummary}

Evaluate this store and return ONLY valid JSON:
{
  "brand_score": <0-100>,
  "niche_clarity": {
    "score": <0-100>,
    "assessment": "<2 sentences on how clear/focused the niche is>"
  },
  "name_critique": {
    "score": <0-100>,
    "memorable": <true/false>,
    "professional": <true/false>,
    "feedback": "<2 sentences on the store name>"
  },
  "description_critique": {
    "score": <0-100>,
    "feedback": "<2 sentences on the description quality>"
  },
  "product_mix": {
    "score": <0-100>,
    "coherence": "<complementary | somewhat_related | scattered | too_few_to_judge>",
    "assessment": "<2 sentences on product selection>"
  },
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<specific improvement 1>", "<specific improvement 2>", "<specific improvement 3>"],
  "overall_verdict": "<strong_foundation | needs_work | major_rethink>",
  "recommendation": "<3-4 sentences of prioritized, actionable advice>"
}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'bizwin.lol Store Critic',
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
      console.error('Failed to parse store critique:', content);
      return NextResponse.json({ error: 'Failed to parse analysis' }, { status: 500 });
    }

    analysis.brand_score = Math.min(100, Math.max(0, analysis.brand_score || 50));

    return NextResponse.json({ success: true, analysis });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Store critic error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
