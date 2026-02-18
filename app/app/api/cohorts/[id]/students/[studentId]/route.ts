import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { getLevelForXp } from '@/lib/xp';

// GET /api/cohorts/[id]/students/[studentId] — comprehensive student data for educator
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> },
) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, studentId } = await params;
    const svc = getServiceClient();

    // Verify caller is cohort instructor
    const { data: cohort } = await svc
      .from('cohorts')
      .select('instructor_id')
      .eq('id', id)
      .single();

    if (!cohort) {
      return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
    }

    if (cohort.instructor_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify student is a member of this cohort
    const { data: membership } = await svc
      .from('cohort_members')
      .select('id')
      .eq('cohort_id', id)
      .eq('user_id', studentId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Student not in this cohort' }, { status: 404 });
    }

    // Fetch all student data in parallel
    const [profileRes, progressRes, xpRes, xpEventsRes, storeRes] = await Promise.all([
      svc.from('user_profiles').select('full_name, email').eq('id', studentId).single(),
      svc.from('scenario_progress')
        .select('scenario_id, score, completed_at, evaluation_json')
        .eq('user_id', studentId)
        .eq('completed', true)
        .order('completed_at', { ascending: false }),
      svc.from('user_xp').select('*').eq('user_id', studentId).single(),
      svc.from('xp_events')
        .select('*')
        .eq('user_id', studentId)
        .order('created_at', { ascending: false })
        .limit(20),
      svc.from('stores').select('id, store_name, slug, is_published').eq('user_id', studentId).single(),
    ]);

    const profile = profileRes.data || { full_name: 'Unknown', email: '' };
    const scenarios = progressRes.data || [];
    const xp = xpRes.data || { total_xp: 0, current_level: 1, xp_to_next_level: 100 };
    const xpEvents = xpEventsRes.data || [];
    const store = storeRes.data;

    // Fetch store product count, order count, and revenue if store exists
    let productCount = 0;
    let orderCount = 0;
    let totalRevenue = 0;

    if (store) {
      const [productsRes, ordersRes] = await Promise.all([
        svc.from('store_products')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', store.id)
          .eq('is_active', true),
        svc.from('store_orders')
          .select('total')
          .eq('store_id', store.id),
      ]);

      productCount = productsRes.count || 0;
      orderCount = (ordersRes.data || []).length;
      totalRevenue = (ordersRes.data || []).reduce(
        (sum: number, o: { total: number }) => sum + (o.total || 0),
        0,
      );
    }

    const levelInfo = getLevelForXp(xp.total_xp || 0);

    return NextResponse.json({
      student: {
        user_id: studentId,
        full_name: profile.full_name,
        email: profile.email,
        scenarios,
        xp: {
          total_xp: xp.total_xp || 0,
          current_level: xp.current_level || 1,
          xp_to_next_level: xp.xp_to_next_level || 100,
          level_name: levelInfo.name,
          level_progress: levelInfo.progress,
        },
        xp_events: xpEvents,
        store: store
          ? {
              store_name: store.store_name,
              slug: store.slug,
              is_published: store.is_published,
              product_count: productCount,
              order_count: orderCount,
              total_revenue: totalRevenue,
            }
          : null,
        level_info: levelInfo,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/cohorts/[id]/students/[studentId]:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
