import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

// GET /api/analytics/learning — learning progress analytics
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const svc = getServiceClient();

    // Fetch all scenario progress, xp events, and tier progress in parallel
    const [progressRes, xpEventsRes, tierProgressRes] = await Promise.all([
      svc.from('scenario_progress')
        .select('scenario_id, score, completed_at, evaluation_json, completed')
        .eq('user_id', userId)
        .eq('completed', true)
        .order('completed_at', { ascending: true }),
      svc.from('xp_events')
        .select('xp_amount, created_at, event_type')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
      svc.from('tier_progress')
        .select('tier, completed_scenarios, total_scenarios, completion_percentage')
        .eq('user_id', userId)
        .order('tier', { ascending: true }),
    ]);

    const scenarios = progressRes.data || [];
    const xpEvents = xpEventsRes.data || [];
    const tierProgress = tierProgressRes.data || [];

    // Scores over time
    const scoresOverTime = scenarios.map((s: {
      scenario_id: string;
      score: number;
      completed_at: string;
    }) => ({
      scenario_id: s.scenario_id,
      score: s.score || 0,
      completed_at: s.completed_at,
    }));

    // Dimension averages: parse evaluation_json and average each dimension
    const dimensionTotals: Record<string, { sum: number; count: number }> = {};
    for (const s of scenarios as Array<{ evaluation_json: { score_breakdown?: Record<string, number>; dimensions?: string[] } }>) {
      const evalJson = s.evaluation_json;
      if (evalJson && evalJson.score_breakdown) {
        for (const [key, value] of Object.entries(evalJson.score_breakdown)) {
          if (typeof value === 'number') {
            if (!dimensionTotals[key]) {
              dimensionTotals[key] = { sum: 0, count: 0 };
            }
            dimensionTotals[key].sum += value;
            dimensionTotals[key].count++;
          }
        }
      }
    }

    const dimensionAverages: Record<string, number> = {};
    for (const [key, data] of Object.entries(dimensionTotals)) {
      dimensionAverages[key] = data.count > 0 ? Math.round((data.sum / data.count) * 10) / 10 : 0;
    }

    // XP by week (ISO week)
    const xpByWeek: Record<string, number> = {};
    for (const evt of xpEvents as Array<{ xp_amount: number; created_at: string }>) {
      const date = new Date(evt.created_at);
      // Get ISO week start (Monday)
      const dayOfWeek = date.getDay();
      const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const weekStart = new Date(date.setDate(diff));
      const weekKey = weekStart.toISOString().split('T')[0];
      xpByWeek[weekKey] = (xpByWeek[weekKey] || 0) + (evt.xp_amount || 0);
    }

    const xpWeeks = Object.entries(xpByWeek)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week_start, xp]) => ({ week_start, xp }));

    // Tier progress: count completed vs total per tier (0-3)
    // Fill in missing tiers with defaults
    const tierData = [0, 1, 2, 3].map(tier => {
      const found = tierProgress.find((t: { tier: number }) => t.tier === tier);
      if (found) {
        return {
          tier,
          completed: (found as { completed_scenarios: number }).completed_scenarios || 0,
          total: (found as { total_scenarios: number }).total_scenarios || 0,
          percentage: (found as { completion_percentage: number }).completion_percentage || 0,
        };
      }
      // Count from scenario_progress directly for this tier
      const tierPrefix = `t${tier}-`;
      const tierScenarios = scenarios.filter(
        (s: { scenario_id: string }) => s.scenario_id.startsWith(tierPrefix),
      );
      return {
        tier,
        completed: tierScenarios.length,
        total: 0,
        percentage: 0,
      };
    });

    // Strengths and weaknesses from dimension averages
    const sortedDimensions = Object.entries(dimensionAverages)
      .sort((a, b) => b[1] - a[1]);

    const strengths = sortedDimensions.slice(0, 3).map(([dimension, avg_score]) => ({
      dimension: dimension.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      avg_score,
    }));

    const weaknesses = sortedDimensions.slice(-3).reverse().map(([dimension, avg_score]) => ({
      dimension: dimension.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      avg_score,
    }));

    return NextResponse.json({
      scores_over_time: scoresOverTime,
      dimension_averages: dimensionAverages,
      xp_by_week: xpWeeks,
      tier_progress: tierData,
      strengths,
      weaknesses,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/analytics/learning:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
