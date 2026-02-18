import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { getLevelForXp } from '@/lib/xp';

// GET /api/cohorts/[id]/export — export cohort data as CSV
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const svc = getServiceClient();

    // Verify instructor
    const { data: cohort } = await svc
      .from('cohorts')
      .select('instructor_id, name')
      .eq('id', id)
      .single();

    if (!cohort) {
      return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
    }

    if (cohort.instructor_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all members
    const { data: members } = await svc
      .from('cohort_members')
      .select('user_id')
      .eq('cohort_id', id);

    const memberIds = (members || []).map((m: { user_id: string }) => m.user_id);

    if (memberIds.length === 0) {
      const csv = 'name,email,total_xp,level,scenarios_completed,avg_score,store_name,product_count,total_revenue\n';
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="cohort-export.csv"`,
        },
      });
    }

    // Fetch all data in parallel
    const [profilesRes, xpRes, progressRes, storesRes] = await Promise.all([
      svc.from('user_profiles').select('id, full_name, email').in('id', memberIds),
      svc.from('user_xp').select('user_id, total_xp').in('user_id', memberIds),
      svc.from('scenario_progress')
        .select('user_id, score, completed')
        .in('user_id', memberIds)
        .eq('completed', true),
      svc.from('stores').select('id, user_id, store_name').in('user_id', memberIds),
    ]);

    const profiles = (profilesRes.data || []).reduce(
      (acc: Record<string, { full_name: string; email: string }>, p: { id: string; full_name: string; email: string }) => {
        acc[p.id] = { full_name: p.full_name, email: p.email };
        return acc;
      },
      {} as Record<string, { full_name: string; email: string }>,
    );

    const xpMap = (xpRes.data || []).reduce(
      (acc: Record<string, number>, x: { user_id: string; total_xp: number }) => {
        acc[x.user_id] = x.total_xp || 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Aggregate scenario data per user
    const scenarioData: Record<string, { count: number; totalScore: number }> = {};
    for (const row of (progressRes.data || []) as Array<{ user_id: string; score: number }>) {
      if (!scenarioData[row.user_id]) {
        scenarioData[row.user_id] = { count: 0, totalScore: 0 };
      }
      scenarioData[row.user_id].count++;
      scenarioData[row.user_id].totalScore += row.score || 0;
    }

    // Map stores by user_id
    const storeMap: Record<string, { id: string; store_name: string }> = {};
    for (const s of (storesRes.data || []) as Array<{ id: string; user_id: string; store_name: string }>) {
      storeMap[s.user_id] = { id: s.id, store_name: s.store_name };
    }

    // Fetch product counts and revenue for stores
    const storeIds = Object.values(storeMap).map(s => s.id);
    let productCounts: Record<string, number> = {};
    let revenueTotals: Record<string, number> = {};

    if (storeIds.length > 0) {
      const [productsRes, ordersRes] = await Promise.all([
        svc.from('store_products')
          .select('store_id')
          .in('store_id', storeIds)
          .eq('is_active', true),
        svc.from('store_orders')
          .select('store_id, total')
          .in('store_id', storeIds),
      ]);

      for (const p of (productsRes.data || []) as Array<{ store_id: string }>) {
        productCounts[p.store_id] = (productCounts[p.store_id] || 0) + 1;
      }

      for (const o of (ordersRes.data || []) as Array<{ store_id: string; total: number }>) {
        revenueTotals[o.store_id] = (revenueTotals[o.store_id] || 0) + (o.total || 0);
      }
    }

    // Build CSV
    const header = 'name,email,total_xp,level,scenarios_completed,avg_score,store_name,product_count,total_revenue';
    const rows = memberIds.map((uid: string) => {
      const profile = profiles[uid] || { full_name: 'Unknown', email: '' };
      const totalXp = xpMap[uid] || 0;
      const level = getLevelForXp(totalXp).name;
      const sd = scenarioData[uid] || { count: 0, totalScore: 0 };
      const avgScore = sd.count > 0 ? Math.round(sd.totalScore / sd.count) : 0;
      const store = storeMap[uid];
      const storeName = store ? store.store_name : '';
      const pCount = store ? (productCounts[store.id] || 0) : 0;
      const revenue = store ? (revenueTotals[store.id] || 0).toFixed(2) : '0.00';

      // Escape CSV fields that might contain commas or quotes
      const escapeCsv = (val: string) => {
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };

      return [
        escapeCsv(profile.full_name),
        escapeCsv(profile.email),
        totalXp,
        escapeCsv(level),
        sd.count,
        avgScore,
        escapeCsv(storeName),
        pCount,
        revenue,
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="cohort-export.csv"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/cohorts/[id]/export:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
