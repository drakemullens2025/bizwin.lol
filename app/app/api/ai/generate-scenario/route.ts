import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { tier, category } = await req.json();
    const svc = getServiceClient();

    // 1. Fetch user's completed scenario scores to find weak areas
    const { data: progress } = await svc
      .from('scenario_progress')
      .select('scenario_id, score, evaluation_json')
      .eq('user_id', userId)
      .eq('completed', true);

    // 2. Fetch user's store data for personalization
    const { data: store } = await svc
      .from('stores')
      .select('id, store_name, description')
      .eq('user_id', userId)
      .limit(1)
      .single();

    let products: { title: string; category: string; price: number; cj_cost: number }[] = [];
    if (store?.id) {
      const { data: productData } = await svc
        .from('store_products')
        .select('title, category, price, cj_cost')
        .eq('store_id', store.id)
        .limit(10);
      products = productData || [];
    }

    // 3. Analyze weak areas from evaluation dimensions
    const dimensionScores: Record<string, { total: number; count: number }> = {};
    const categoryScores: Record<string, { total: number; count: number }> = {};

    for (const p of progress || []) {
      // Aggregate dimension scores from evaluations
      if (p.evaluation_json?.score_breakdown) {
        for (const [dim, val] of Object.entries(p.evaluation_json.score_breakdown)) {
          if (!dimensionScores[dim]) dimensionScores[dim] = { total: 0, count: 0 };
          dimensionScores[dim].total += val as number;
          dimensionScores[dim].count += 1;
        }
      }
      // Aggregate category scores
      const scenarioCategory = p.scenario_id?.startsWith('CS-T')
        ? null // We do not know the category from the ID alone for tier scenarios
        : null;
      if (p.evaluation_json?.scenario_id && p.score) {
        const cat = p.evaluation_json.category || 'unknown';
        if (!categoryScores[cat]) categoryScores[cat] = { total: 0, count: 0 };
        categoryScores[cat].total += p.score;
        categoryScores[cat].count += 1;
      }
    }

    // Find weakest dimensions
    const weakDimensions = Object.entries(dimensionScores)
      .map(([dim, { total, count }]) => ({ dim, avg: total / count }))
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 3)
      .map(d => d.dim.replace(/_/g, ' '));

    // 4. Build personalization context
    const storeContext = store
      ? `The user runs a store called "${store.store_name}"${store.description ? `: ${store.description}` : ''}.`
      : 'The user has not set up a store yet.';

    const productContext = products.length > 0
      ? `Their products include: ${products.map(p => `${p.title} ($${p.price}, cost $${p.cj_cost})`).join(', ')}.`
      : '';

    const weakAreaContext = weakDimensions.length > 0
      ? `Their weakest skill areas are: ${weakDimensions.join(', ')}.`
      : '';

    const difficultyRange = tier === 0 ? '1-2' : tier === 1 ? '2-3' : tier === 2 ? '3-4' : '4-5';
    const categories = ['market_analysis', 'pricing', 'store_design', 'operations', 'scaling'];
    const targetCategory = category && categories.includes(category) ? category : categories[Math.floor(Math.random() * categories.length)];

    // 5. Call OpenRouter to generate scenario
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
    }

    const prompt = `You are an expert e-commerce educator generating a personalized learning scenario for a dropshipping entrepreneurship platform.

STUDENT CONTEXT:
${storeContext}
${productContext}
${weakAreaContext}

REQUIREMENTS:
- Generate a Tier ${tier} scenario in the "${targetCategory}" category
- Difficulty range: ${difficultyRange} (out of 5)
- The scenario must be specific, realistic, and actionable
- Reference real e-commerce concepts and strategies
- Personalize to the student's store/products if available
- Focus on the student's weak areas if identified

Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
  "id": "CS-GEN-${Date.now().toString(36).toUpperCase()}",
  "tier": ${tier},
  "category": "${targetCategory}",
  "difficulty": <number between ${difficultyRange.split('-')[0]} and ${difficultyRange.split('-')[1]}>,
  "title": "<creative 3-6 word title>",
  "context": "<2-4 sentences of specific business context>",
  "challenge": "<specific question or task for the student>",
  "optimalApproach": "<3-5 sentences describing the best approach>",
  "keyInsights": ["<insight 1>", "<insight 2>", "<insight 3>"],
  "commonMistakes": ["<mistake 1>", "<mistake 2>", "<mistake 3>"],
  "requiresCatalog": false,
  "nextLevel": []
}

Make the scenario feel like a real business situation the student might face. Be specific with numbers, costs, and metrics.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'bizwin.lol Scenario Generation',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', errorText);
      return NextResponse.json({ error: 'Failed to generate scenario' }, { status: response.status });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'No scenario generated' }, { status: 500 });
    }

    let scenario;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      scenario = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse generated scenario:', content);
      return NextResponse.json({ error: 'Failed to parse generated scenario' }, { status: 500 });
    }

    // Validate and sanitize the scenario
    const validatedScenario = {
      id: scenario.id || `CS-GEN-${Date.now().toString(36).toUpperCase()}`,
      tier: tier,
      category: targetCategory,
      difficulty: Math.min(5, Math.max(1, scenario.difficulty || 3)),
      title: (scenario.title || 'Generated Scenario').slice(0, 100),
      context: (scenario.context || '').slice(0, 1000),
      challenge: (scenario.challenge || '').slice(0, 1000),
      optimalApproach: (scenario.optimalApproach || '').slice(0, 2000),
      keyInsights: Array.isArray(scenario.keyInsights) ? scenario.keyInsights.slice(0, 4) : [],
      commonMistakes: Array.isArray(scenario.commonMistakes) ? scenario.commonMistakes.slice(0, 4) : [],
      requiresCatalog: Boolean(scenario.requiresCatalog),
      nextLevel: [],
    };

    // 6. Save to generated_scenarios table
    const { data: saved, error: saveError } = await svc
      .from('generated_scenarios')
      .insert({
        user_id: userId,
        scenario_id: validatedScenario.id,
        tier: validatedScenario.tier,
        category: validatedScenario.category,
        difficulty: validatedScenario.difficulty,
        title: validatedScenario.title,
        context: validatedScenario.context,
        challenge: validatedScenario.challenge,
        optimal_approach: validatedScenario.optimalApproach,
        key_insights: validatedScenario.keyInsights,
        common_mistakes: validatedScenario.commonMistakes,
        requires_catalog: validatedScenario.requiresCatalog,
        scenario_json: validatedScenario,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save generated scenario:', saveError);
      // Still return the scenario even if save fails
    }

    return NextResponse.json({
      success: true,
      scenario: validatedScenario,
      saved_id: saved?.id || null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Generate scenario error:', message);
    return NextResponse.json({ error: 'Internal server error', message }, { status: 500 });
  }
}
