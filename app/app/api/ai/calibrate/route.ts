import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { getScenariosByTier } from '@/data/commerce-scenarios';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const svc = getServiceClient();

    // Fetch all completed scenario progress with scores
    const { data: progress } = await svc
      .from('scenario_progress')
      .select('scenario_id, score, evaluation_json, completed_at')
      .eq('user_id', userId)
      .eq('completed', true);

    if (!progress || progress.length === 0) {
      return NextResponse.json({
        recommended_tier: 0,
        recommended_difficulty: 1,
        weak_categories: [],
        strong_categories: [],
        avg_score: 0,
        ready_for_next_tier: false,
        total_completed: 0,
        tier_breakdown: {},
      });
    }

    // Determine which tier each scenario belongs to based on ID prefix
    const tierForScenario = (id: string): number => {
      if (id.startsWith('CS-T3-')) return 3;
      if (id.startsWith('CS-T2-')) return 2;
      if (id.startsWith('CS-T1-')) return 1;
      if (id.startsWith('CS-GEN-')) return -1; // generated scenarios handled separately
      return 0; // CS-001 through CS-015 are tier 0
    };

    // Group scores by tier
    const tierScores: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [] };
    // Group scores by category
    const categoryScores: Record<string, number[]> = {};

    for (const p of progress) {
      const t = tierForScenario(p.scenario_id);
      if (t >= 0 && t <= 3) {
        tierScores[t].push(p.score || 0);
      }

      // Extract category from evaluation_json or from scenario data
      const cat = p.evaluation_json?.category;
      if (cat) {
        if (!categoryScores[cat]) categoryScores[cat] = [];
        categoryScores[cat].push(p.score || 0);
      }
    }

    // If categories not available from evaluation_json, infer from scenario data
    if (Object.keys(categoryScores).length === 0) {
      for (const p of progress) {
        const t = tierForScenario(p.scenario_id);
        if (t < 0) continue;
        const scenarios = getScenariosByTier(t);
        const scenario = scenarios.find(s => s.id === p.scenario_id);
        if (scenario) {
          if (!categoryScores[scenario.category]) categoryScores[scenario.category] = [];
          categoryScores[scenario.category].push(p.score || 0);
        }
      }
    }

    // Calculate overall average score
    const allScores = progress.map(p => p.score || 0).filter(s => s > 0);
    const avgScore = allScores.length > 0
      ? Math.round(allScores.reduce((sum, s) => sum + s, 0) / allScores.length)
      : 0;

    // Determine the highest tier the user has meaningfully engaged with
    let currentTier = 0;
    for (let t = 3; t >= 0; t--) {
      if (tierScores[t].length > 0) {
        currentTier = t;
        break;
      }
    }

    // Check readiness for next tier
    // Criteria: avg score >= 75 AND >60% of current tier scenarios completed
    const currentTierScenarios = getScenariosByTier(currentTier);
    const currentTierCompleted = tierScores[currentTier].length;
    const currentTierTotal = currentTierScenarios.length;
    const currentTierCompletionRate = currentTierTotal > 0
      ? currentTierCompleted / currentTierTotal
      : 0;
    const currentTierAvg = tierScores[currentTier].length > 0
      ? tierScores[currentTier].reduce((s, v) => s + v, 0) / tierScores[currentTier].length
      : 0;

    const readyForNextTier = currentTierAvg >= 75
      && currentTierCompletionRate > 0.6
      && currentTier < 3;

    // Determine recommended tier and difficulty
    const recommendedTier = readyForNextTier ? currentTier + 1 : currentTier;

    let recommendedDifficulty: number;
    if (avgScore >= 85) {
      recommendedDifficulty = Math.min(5, (recommendedTier * 1) + 3);
    } else if (avgScore >= 70) {
      recommendedDifficulty = Math.min(5, (recommendedTier * 1) + 2);
    } else if (avgScore >= 50) {
      recommendedDifficulty = Math.max(1, (recommendedTier * 1) + 1);
    } else {
      recommendedDifficulty = Math.max(1, recommendedTier * 1 + 1);
    }

    // Identify weak and strong categories
    const weakCategories: string[] = [];
    const strongCategories: string[] = [];

    for (const [cat, scores] of Object.entries(categoryScores)) {
      if (scores.length === 0) continue;
      const catAvg = scores.reduce((s, v) => s + v, 0) / scores.length;
      if (catAvg < 60) {
        weakCategories.push(cat);
      } else if (catAvg >= 80) {
        strongCategories.push(cat);
      }
    }

    // Build tier breakdown for the response
    const tierBreakdown: Record<number, { completed: number; total: number; avg_score: number }> = {};
    for (let t = 0; t <= 3; t++) {
      const total = getScenariosByTier(t).length;
      const completed = tierScores[t].length;
      const avg = completed > 0
        ? Math.round(tierScores[t].reduce((s, v) => s + v, 0) / completed)
        : 0;
      tierBreakdown[t] = { completed, total, avg_score: avg };
    }

    return NextResponse.json({
      recommended_tier: recommendedTier,
      recommended_difficulty: recommendedDifficulty,
      weak_categories: weakCategories,
      strong_categories: strongCategories,
      avg_score: avgScore,
      ready_for_next_tier: readyForNextTier,
      total_completed: allScores.length,
      current_tier: currentTier,
      tier_breakdown: tierBreakdown,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Calibrate error:', message);
    return NextResponse.json({ error: 'Internal server error', message }, { status: 500 });
  }
}
