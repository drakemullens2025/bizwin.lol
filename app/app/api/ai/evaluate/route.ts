import { NextRequest, NextResponse } from 'next/server';
import { markScenarioComplete, awardScenarioXp, updateChallengeProgress, ensureUserProfile, supabase } from '@/lib/supabase';

// Generalized evaluation endpoint — supports configurable rubric dimensions
export async function POST(req: NextRequest) {
  try {
    const { scenario_id, user_response, scenario_data, rubric_type } = await req.json();

    if (!user_response || !scenario_data) {
      return NextResponse.json(
        { error: 'Missing required fields: user_response, scenario_data' },
        { status: 400 }
      );
    }

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
    }

    const { context, challenge, optimalApproach, keyInsights, commonMistakes, nextLevel } = scenario_data;

    // Select rubric dimensions based on scenario type
    const rubrics: Record<string, string[]> = {
      default: ['Problem Identification', 'Approach Quality', 'Critical Thinking', 'Practical Application'],
      market_analysis: ['Market Identification', 'Data Interpretation', 'Strategic Thinking', 'Actionable Insight'],
      pricing: ['Margin Awareness', 'Competitive Positioning', 'Psychological Pricing', 'Profit Optimization'],
      store_design: ['Brand Coherence', 'UX Clarity', 'Product Curation', 'Conversion Focus'],
      operations: ['Process Efficiency', 'Customer Focus', 'Risk Management', 'Scalability Thinking'],
      scaling: ['Strategic Vision', 'Automation Design', 'Financial Analysis', 'Market Expansion'],
    };

    const dimensions = rubrics[rubric_type || 'default'] || rubrics.default;
    const dimensionKeys = dimensions.map(d => d.toLowerCase().replace(/\s+/g, '_'));

    const prompt = `You are an expert business evaluator for an entrepreneurship education platform. Evaluate a student's response to a commerce scenario.

SCENARIO CONTEXT:
${context}

CHALLENGE:
${challenge}

OPTIMAL APPROACH:
${optimalApproach}

KEY INSIGHTS THE STUDENT SHOULD DEMONSTRATE:
${(keyInsights || []).map((k: string, i: number) => `${i + 1}. ${k}`).join('\n')}

COMMON MISTAKES TO WATCH FOR:
${(commonMistakes || []).map((m: string, i: number) => `${i + 1}. ${m}`).join('\n')}

STUDENT'S RESPONSE:
"${user_response}"

Evaluate across four dimensions, scoring each 0-25 points:

${dimensions.map((d, i) => `${i + 1}. **${d}** (0-25)`).join('\n')}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "score_breakdown": {
    ${dimensionKeys.map(k => `"${k}": <0-25>`).join(',\n    ')}
  },
  "summary": "<2-3 sentence assessment. Direct and specific.>",
  "gaps": ["<specific gap 1>", "<specific gap 2>"],
  "strengths": ["<specific strength 1>", "<specific strength 2>"],
  "growth_areas": ["<actionable coaching 1>", "<actionable coaching 2>"],
  "coaching_note": "<1-2 sentences of direct coaching. Address as 'you'.>",
  "confidence": <0.0-1.0>
}

Be rigorous but fair. Most solid responses score 60-80. Evaluate what's written, not implied.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'bizwin.lol Evaluation',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-v3.2',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter API error:', error);
      return NextResponse.json({ error: 'Failed to evaluate response' }, { status: response.status });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'No evaluation generated' }, { status: 500 });
    }

    let evaluation;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      evaluation = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI evaluation:', content);
      return NextResponse.json({ error: 'Failed to parse AI evaluation' }, { status: 500 });
    }

    // Calculate total score from breakdown
    const breakdown = evaluation.score_breakdown || {};
    let score = 0;
    const clampedBreakdown: Record<string, number> = {};
    for (const key of dimensionKeys) {
      const val = Math.min(25, Math.max(0, breakdown[key] || 0));
      clampedBreakdown[key] = val;
      score += val;
    }

    const suggestedNext = (nextLevel && nextLevel.length > 0) ? nextLevel[0] : null;

    const result = {
      score: Math.min(100, Math.max(0, score)),
      score_breakdown: clampedBreakdown,
      dimensions,
      dimension_keys: dimensionKeys,
      summary: evaluation.summary || 'Evaluation complete.',
      gaps: evaluation.gaps || [],
      strengths: evaluation.strengths || [],
      growth_areas: evaluation.growth_areas || [],
      coaching_note: evaluation.coaching_note || '',
      suggested_next: suggestedNext,
      confidence: Math.min(1, Math.max(0, evaluation.confidence || 0.7)),
      scenario_id,
    };

    // Persist evaluation results to Supabase (non-blocking)
    const userId = req.headers.get('x-user-id');
    if (userId && scenario_id) {
      try {
        const email = req.headers.get('x-user-email') || `${userId}@user.bizwin.lol`;
        await ensureUserProfile(userId, email);
        await markScenarioComplete(userId, scenario_id, 0);

        // Upsert score and evaluation JSON to scenario_progress
        await supabase
          .from('scenario_progress')
          .upsert({
            user_id: userId,
            scenario_id,
            score: result.score,
            evaluation_json: result,
            completed: true,
            completed_at: new Date().toISOString(),
          }, { onConflict: 'user_id,scenario_id' });

        await awardScenarioXp(userId, scenario_id, result.score);
        await updateChallengeProgress(userId, 'scenario_completion', result.score);
      } catch (persistErr) {
        console.error('Failed to persist evaluation:', persistErr);
      }
    }

    return NextResponse.json({ success: true, evaluation: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI evaluation error:', message);
    return NextResponse.json({ error: 'Internal server error', message }, { status: 500 });
  }
}
