import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Lazy initialization to avoid build-time crashes when env vars aren't set
let _supabase: SupabaseClient | null = null;

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase URL and Anon Key must be configured in .env.local');
      }
      _supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    return (_supabase as unknown as Record<string, unknown>)[prop as string];
  },
});

// Service role client for server-side operations that bypass RLS
export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase service role key must be configured');
  }
  return createClient(supabaseUrl, serviceKey);
}

// ---- User Profiles ----

export async function getUserProfile(userId: string) {
  const svc = getServiceClient();
  const { data, error } = await svc
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error && error.code !== 'PGRST116') console.error('getUserProfile:', error);
  return data;
}

export async function ensureUserProfile(userId: string, email: string, fullName?: string) {
  const svc = getServiceClient();
  const { data: existing } = await svc
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (existing) return existing;

  const { data, error } = await svc
    .from('user_profiles')
    .insert({ id: userId, email, full_name: fullName || email.split('@')[0] })
    .select()
    .single();
  if (error) console.error('ensureUserProfile:', error);
  return data;
}

// ---- Stores ----

export async function getUserStore(userId: string) {
  const svc = getServiceClient();
  const { data, error } = await svc
    .from('stores')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') console.error('getUserStore:', error);
  return data;
}

export async function createStore(userId: string, slug: string, storeName: string, description?: string) {
  const svc = getServiceClient();
  const { data, error } = await svc
    .from('stores')
    .insert({ user_id: userId, slug, store_name: storeName, description })
    .select()
    .single();
  if (error) console.error('createStore:', error);
  return data;
}

export async function updateStore(storeId: string, updates: Record<string, unknown>) {
  const svc = getServiceClient();
  const { data, error } = await svc
    .from('stores')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', storeId)
    .select()
    .single();
  if (error) console.error('updateStore:', error);
  return data;
}

export async function getStoreBySlug(slug: string) {
  const svc = getServiceClient();
  const { data, error } = await svc
    .from('stores')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();
  if (error && error.code !== 'PGRST116') console.error('getStoreBySlug:', error);
  return data;
}

// ---- Store Products ----

export async function getStoreProducts(storeId: string) {
  const svc = getServiceClient();
  const { data, error } = await svc
    .from('store_products')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) console.error('getStoreProducts:', error);
  return data || [];
}

export async function addStoreProduct(storeId: string, product: {
  cj_product_id: string;
  cj_variant_id?: string;
  title: string;
  description?: string;
  price: number;
  compare_at_price?: number;
  cj_cost: number;
  images?: string[];
  category?: string;
}) {
  const svc = getServiceClient();
  const marginPercent = product.cj_cost > 0
    ? ((product.price - product.cj_cost) / product.price) * 100
    : 0;

  const { data, error } = await svc
    .from('store_products')
    .insert({
      store_id: storeId,
      ...product,
      images: JSON.stringify(product.images || []),
      margin_percent: Math.round(marginPercent * 100) / 100,
    })
    .select()
    .single();
  if (error) console.error('addStoreProduct:', error);
  return data;
}

export async function updateStoreProduct(productId: string, updates: Record<string, unknown>) {
  const svc = getServiceClient();
  const { data, error } = await svc
    .from('store_products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .select()
    .single();
  if (error) console.error('updateStoreProduct:', error);
  return data;
}

// ---- Product Wishlist ----

export async function getWishlist(userId: string) {
  const svc = getServiceClient();
  const { data, error } = await svc
    .from('product_wishlist')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) console.error('getWishlist:', error);
  return data || [];
}

export async function addToWishlist(userId: string, cjProductId: string, notes?: string) {
  const svc = getServiceClient();
  const { data, error } = await svc
    .from('product_wishlist')
    .upsert({ user_id: userId, cj_product_id: cjProductId, notes }, { onConflict: 'user_id,cj_product_id' })
    .select()
    .single();
  if (error) console.error('addToWishlist:', error);
  return data;
}

export async function removeFromWishlist(userId: string, cjProductId: string) {
  const svc = getServiceClient();
  const { error } = await svc
    .from('product_wishlist')
    .delete()
    .eq('user_id', userId)
    .eq('cj_product_id', cjProductId);
  if (error) console.error('removeFromWishlist:', error);
}

// ---- Learning Progress ----

export async function getScenarioProgress(userId: string) {
  const svc = getServiceClient();
  const { data, error } = await svc
    .from('scenario_progress')
    .select('scenario_id')
    .eq('user_id', userId)
    .eq('completed', true);
  if (error) console.error('getScenarioProgress:', error);
  return (data || []).map(d => d.scenario_id);
}

export async function markScenarioComplete(userId: string, scenarioId: string, timeSpentSeconds?: number) {
  const svc = getServiceClient();
  const { error } = await svc
    .from('scenario_progress')
    .upsert({
      user_id: userId,
      scenario_id: scenarioId,
      completed: true,
      completed_at: new Date().toISOString(),
      time_spent_seconds: timeSpentSeconds || 0,
    }, { onConflict: 'user_id,scenario_id' });
  if (error) console.error('markScenarioComplete:', error);
}

export async function getTierProgress(userId: string, tier: number) {
  const svc = getServiceClient();
  const { data, error } = await svc
    .from('tier_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('tier', tier)
    .single();
  if (error && error.code !== 'PGRST116') console.error('getTierProgress:', error);
  return data;
}

export async function updateTierProgress(userId: string, tier: number, completedCount: number, totalCount: number) {
  const svc = getServiceClient();
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const { error } = await svc
    .from('tier_progress')
    .upsert({
      user_id: userId,
      tier,
      completed_scenarios: completedCount,
      total_scenarios: totalCount,
      completion_percentage: completionPercentage,
    }, { onConflict: 'user_id,tier' });
  if (error) console.error('updateTierProgress:', error);
}

// ---- CJ Product Cache ----

export async function getCachedProduct(cjProductId: string) {
  const svc = getServiceClient();
  const { data, error } = await svc
    .from('cj_product_cache')
    .select('*')
    .eq('cj_product_id', cjProductId)
    .gt('expires_at', new Date().toISOString())
    .single();
  if (error && error.code !== 'PGRST116') return null;
  return data;
}

export async function cacheProduct(cjProductId: string, productData: unknown, images?: unknown, variants?: unknown, categoryPath?: string) {
  const svc = getServiceClient();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { error } = await svc
    .from('cj_product_cache')
    .upsert({
      cj_product_id: cjProductId,
      data: productData,
      images,
      variants,
      category_path: categoryPath,
      fetched_at: new Date().toISOString(),
      expires_at: expiresAt,
    });
  if (error) console.error('cacheProduct:', error);
}

// ---- Orders ----

export async function createStoreOrder(order: {
  store_id: string;
  customer_email: string;
  customer_name: string;
  shipping_address: Record<string, unknown>;
  line_items: unknown[];
  subtotal: number;
  shipping_cost: number;
  total: number;
  payment_intent_id?: string;
}) {
  const svc = getServiceClient();
  const orderNumber = `CJV-${Date.now().toString(36).toUpperCase()}`;
  const { data, error } = await svc
    .from('store_orders')
    .insert({ ...order, order_number: orderNumber })
    .select()
    .single();
  if (error) console.error('createStoreOrder:', error);
  return data;
}

export async function getStoreOrders(storeId: string) {
  const svc = getServiceClient();
  const { data, error } = await svc
    .from('store_orders')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });
  if (error) console.error('getStoreOrders:', error);
  return data || [];
}

export async function updateOrderStatus(orderId: string, status: string, extra?: Record<string, unknown>) {
  const svc = getServiceClient();
  const { error } = await svc
    .from('store_orders')
    .update({ status, ...extra, updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) console.error('updateOrderStatus:', error);
}

// ---- XP & Gamification ----

import { getLevelForXp, calculateScenarioXp } from './xp';

export async function awardXp(userId: string, eventType: string, xpAmount: number, metadata?: Record<string, unknown>) {
  const svc = getServiceClient();
  await svc.from('xp_events').insert({
    user_id: userId, event_type: eventType, xp_amount: xpAmount, metadata: metadata || {},
  });
  const { data: current } = await svc.from('user_xp').select('total_xp').eq('user_id', userId).single();
  const newTotal = (current?.total_xp || 0) + xpAmount;
  const levelInfo = getLevelForXp(newTotal);
  await svc.from('user_xp').upsert({
    user_id: userId, total_xp: newTotal, current_level: levelInfo.level,
    xp_to_next_level: levelInfo.xpToNext, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  return { newTotal, level: levelInfo };
}

export async function getUserXp(userId: string) {
  const { data } = await getServiceClient().from('user_xp').select('*').eq('user_id', userId).single();
  return data || { total_xp: 0, current_level: 1, xp_to_next_level: 100 };
}

export async function getXpEvents(userId: string, limit = 20) {
  const { data } = await getServiceClient().from('xp_events')
    .select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(limit);
  return data || [];
}

export async function getLeaderboard(limit = 50, cohortId?: string) {
  const svc = getServiceClient();
  if (cohortId) {
    const { data: memberIds } = await svc.from('cohort_members').select('user_id').eq('cohort_id', cohortId);
    const ids = (memberIds || []).map((m: { user_id: string }) => m.user_id);
    if (ids.length === 0) return [];
    const { data } = await svc.from('user_xp')
      .select('user_id, total_xp, current_level')
      .in('user_id', ids)
      .order('total_xp', { ascending: false }).limit(limit);
    return data || [];
  }
  const { data } = await svc.from('user_xp')
    .select('user_id, total_xp, current_level')
    .order('total_xp', { ascending: false }).limit(limit);
  return data || [];
}

export async function awardScenarioXp(userId: string, scenarioId: string, score: number) {
  const xp = calculateScenarioXp(score);
  await awardXp(userId, 'scenario_completion', xp, { scenario_id: scenarioId, score });
  // High score bonus (first time 80+)
  if (score >= 80) {
    const { data: prev } = await getServiceClient().from('xp_events')
      .select('id').eq('user_id', userId).eq('event_type', 'scenario_high_score')
      .eq('metadata->>scenario_id', scenarioId).limit(1);
    if (!prev || prev.length === 0) {
      await awardXp(userId, 'scenario_high_score', 25, { scenario_id: scenarioId, score });
    }
  }
}

// ---- Challenges ----

export async function getActiveChallenges(userId: string) {
  const svc = getServiceClient();
  const now = new Date().toISOString();
  // Get user's cohort IDs
  const { data: memberships } = await svc.from('cohort_members').select('cohort_id').eq('user_id', userId);
  const cohortIds = (memberships || []).map((m: { cohort_id: string }) => m.cohort_id);
  // Get global + cohort challenges
  let query = svc.from('challenges')
    .select('*')
    .eq('is_active', true)
    .lte('starts_at', now)
    .gte('ends_at', now);
  if (cohortIds.length > 0) {
    query = query.or(`scope.eq.global,cohort_id.in.(${cohortIds.join(',')})`);
  } else {
    query = query.eq('scope', 'global');
  }
  const { data } = await query;
  return data || [];
}

export async function getChallengeProgress(userId: string, challengeIds: string[]) {
  if (challengeIds.length === 0) return [];
  const { data } = await getServiceClient().from('challenge_progress')
    .select('*').eq('user_id', userId).in('challenge_id', challengeIds);
  return data || [];
}

export async function updateChallengeProgress(userId: string, eventType: string, value: number) {
  const svc = getServiceClient();
  const typeMap: Record<string, string[]> = {
    scenario_completion: ['complete_scenarios', 'earn_xp'],
    scenario_high_score: ['achieve_score', 'earn_xp'],
    product_listed: ['list_products', 'earn_xp'],
    order_received: ['earn_revenue', 'earn_xp'],
    store_created: ['earn_xp'],
    store_published: ['earn_xp'],
  };
  const challengeTypes = typeMap[eventType] || ['earn_xp'];
  const challenges = await getActiveChallenges(userId);
  const relevant = challenges.filter(c => challengeTypes.includes(c.challenge_type));
  if (relevant.length === 0) return;
  const now = new Date().toISOString();
  for (const challenge of relevant) {
    const { data: existing } = await svc.from('challenge_progress')
      .select('*').eq('user_id', userId).eq('challenge_id', challenge.id).single();
    if (existing?.completed) continue;
    const increment = challenge.challenge_type === 'achieve_score'
      ? Math.max(0, value - (existing?.current_value || 0))
      : value;
    if (increment <= 0 && challenge.challenge_type === 'achieve_score') continue;
    const newValue = (existing?.current_value || 0) + (challenge.challenge_type === 'achieve_score' ? increment : 1);
    const completed = newValue >= challenge.target_value;
    await svc.from('challenge_progress').upsert({
      user_id: userId, challenge_id: challenge.id,
      current_value: newValue, completed,
      completed_at: completed ? now : null, updated_at: now,
    }, { onConflict: 'user_id,challenge_id' });
    if (completed && challenge.xp_reward > 0) {
      await awardXp(userId, 'challenge_completed', challenge.xp_reward, { challenge_id: challenge.id });
    }
  }
}

export async function createChallenge(data: {
  created_by: string; title: string; description?: string;
  challenge_type: string; target_value: number; xp_reward: number;
  scope: string; cohort_id?: string; starts_at: string; ends_at: string;
}) {
  const { data: challenge, error } = await getServiceClient()
    .from('challenges').insert(data).select().single();
  if (error) console.error('createChallenge:', error);
  return challenge;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await getServiceClient().from('user_profiles')
    .select('is_admin').eq('id', userId).single();
  return data?.is_admin === true;
}

// ---- Cohorts ----

export async function createCohort(instructorId: string, name: string, description?: string) {
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { data, error } = await getServiceClient().from('cohorts').insert({
    instructor_id: instructorId, name, description, invite_code: inviteCode,
  }).select().single();
  if (error) console.error('createCohort:', error);
  return data;
}

export async function joinCohort(userId: string, inviteCode: string) {
  const svc = getServiceClient();
  const { data: cohort } = await svc.from('cohorts')
    .select('id, max_members').eq('invite_code', inviteCode.toUpperCase()).eq('is_active', true).single();
  if (!cohort) return { error: 'Invalid invite code' };
  const { count } = await svc.from('cohort_members')
    .select('id', { count: 'exact', head: true }).eq('cohort_id', cohort.id);
  if ((count || 0) >= cohort.max_members) return { error: 'Cohort is full' };
  const { data, error } = await svc.from('cohort_members').insert({
    cohort_id: cohort.id, user_id: userId,
  }).select().single();
  if (error?.code === '23505') return { error: 'Already a member' };
  if (error) return { error: error.message };
  return { member: data, cohortId: cohort.id };
}

export async function getUserCohorts(userId: string) {
  const svc = getServiceClient();
  const { data: memberships } = await svc.from('cohort_members')
    .select('cohort_id, role, joined_at')
    .eq('user_id', userId);
  const cohortIds = (memberships || []).map((m: { cohort_id: string }) => m.cohort_id);
  let enrolled: unknown[] = [];
  if (cohortIds.length > 0) {
    const { data } = await svc.from('cohorts').select('*').in('id', cohortIds);
    enrolled = data || [];
  }
  const { data: instructing } = await svc.from('cohorts').select('*').eq('instructor_id', userId);
  return { enrolled, instructing: instructing || [] };
}

export async function getCohortMembers(cohortId: string) {
  const { data } = await getServiceClient().from('cohort_members')
    .select('user_id, role, joined_at')
    .eq('cohort_id', cohortId);
  return data || [];
}

export async function getCohortWithStats(cohortId: string) {
  const svc = getServiceClient();
  const { data: cohort } = await svc.from('cohorts').select('*').eq('id', cohortId).single();
  if (!cohort) return null;
  const members = await getCohortMembers(cohortId);
  const memberIds = members.map(m => m.user_id);
  let avgXp = 0;
  let avgScore = 0;
  if (memberIds.length > 0) {
    const { data: xpData } = await svc.from('user_xp').select('total_xp').in('user_id', memberIds);
    const totalXp = (xpData || []).reduce((s: number, d: { total_xp: number }) => s + (d.total_xp || 0), 0);
    avgXp = Math.round(totalXp / memberIds.length);
    const { data: progressData } = await svc.from('scenario_progress')
      .select('score').in('user_id', memberIds).not('score', 'is', null);
    const scores = (progressData || []).map((d: { score: number }) => d.score).filter(Boolean);
    avgScore = scores.length > 0 ? Math.round(scores.reduce((s: number, v: number) => s + v, 0) / scores.length) : 0;
  }
  return { ...cohort, memberCount: memberIds.length, avgXp, avgScore, members };
}

// ---- Portfolio ----

export async function getPortfolioSettings(userId: string) {
  const { data } = await getServiceClient().from('portfolio_settings')
    .select('*').eq('user_id', userId).single();
  return data;
}

export async function updatePortfolioSettings(userId: string, updates: Record<string, unknown>) {
  const { data } = await getServiceClient().from('portfolio_settings')
    .upsert({ user_id: userId, ...updates, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }).select().single();
  return data;
}

// ---- Multi-Store ----

export async function getUserStores(userId: string) {
  const svc = getServiceClient();
  const { data, error } = await svc.from('stores').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  if (error) console.error('getUserStores:', error);
  return data || [];
}

export async function getStoreById(storeId: string, userId: string) {
  const svc = getServiceClient();
  const { data, error } = await svc.from('stores').select('*').eq('id', storeId).eq('user_id', userId).single();
  if (error && error.code !== 'PGRST116') console.error('getStoreById:', error);
  return data;
}

// ---- Product Events (Intelligence) ----

export async function logProductEvent(userId: string, eventType: string, data: { cj_product_id?: string; search_query?: string; category?: string; metadata?: Record<string, unknown> }) {
  const svc = getServiceClient();
  const { error } = await svc.from('product_events').insert({
    user_id: userId, event_type: eventType,
    cj_product_id: data.cj_product_id, search_query: data.search_query,
    category: data.category, metadata: data.metadata || {},
  });
  if (error) console.error('logProductEvent:', error);
}

export async function getTrendingProducts(days: number = 7) {
  const svc = getServiceClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await svc.from('product_events')
    .select('cj_product_id, event_type')
    .gte('created_at', since)
    .not('cj_product_id', 'is', null);
  return data || [];
}

export async function getTrendingSearches(days: number = 7) {
  const svc = getServiceClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await svc.from('product_events')
    .select('search_query')
    .eq('event_type', 'search')
    .gte('created_at', since)
    .not('search_query', 'is', null);
  return data || [];
}

export async function getPortfolioData(userId: string) {
  const svc = getServiceClient();
  const [profile, settings, xp, scenarios, store] = await Promise.all([
    svc.from('user_profiles').select('*').eq('id', userId).single(),
    svc.from('portfolio_settings').select('*').eq('user_id', userId).single(),
    svc.from('user_xp').select('*').eq('user_id', userId).single(),
    svc.from('scenario_progress').select('scenario_id, score, completed_at')
      .eq('user_id', userId).eq('completed', true).order('completed_at', { ascending: true }),
    svc.from('stores').select('store_name, slug, is_published').eq('user_id', userId).single(),
  ]);
  // XP timeline for growth chart (aggregate by week)
  const { data: xpEvents } = await svc.from('xp_events')
    .select('xp_amount, created_at').eq('user_id', userId)
    .order('created_at', { ascending: true });
  return {
    profile: profile.data, settings: settings.data,
    xp: xp.data || { total_xp: 0, current_level: 1 },
    scenarios: scenarios.data || [], store: store.data,
    xpTimeline: xpEvents || [],
  };
}

// ---- Generated Scenarios ----

export async function getGeneratedScenarios(userId: string, tier: number) {
  const { data } = await getServiceClient().from('generated_scenarios')
    .select('*').eq('user_id', userId).eq('tier', tier)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function saveGeneratedScenario(userId: string, scenario: Record<string, unknown>) {
  const { data, error } = await getServiceClient().from('generated_scenarios')
    .insert({ user_id: userId, ...scenario }).select().single();
  if (error) console.error('saveGeneratedScenario:', error);
  return data;
}
