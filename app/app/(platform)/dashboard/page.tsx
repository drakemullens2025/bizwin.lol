'use client';

import { useUser } from '@stackframe/stack';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  total_xp: number;
  rank: number;
}

interface ChallengeEntry {
  id: string;
  title: string;
  target_value: number;
  current_value: number;
  xp_reward: number;
  ends_at: string;
  completed_at: string | null;
}

interface DashboardData {
  scenariosDone: number;
  totalScenarios: number;
  productCount: number;
  storeExists: boolean;
  storeName: string;
  storeSlug: string;
  storePublished: boolean;
  orderCount: number;
  revenue: number;
  totalXp: number;
  levelName: string;
  leaderboard: LeaderboardEntry[];
  myRank: number | null;
  challenges: ChallengeEntry[];
}

export default function DashboardPage() {
  const user = useUser({ or: 'redirect' });
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        // Load store, products, progress, xp, leaderboard, and challenges in parallel
        const [storeRes, productsRes, progressRes, xpRes, leaderboardRes, challengesRes] = await Promise.all([
          fetch('/api/store', { headers: { 'x-user-id': user.id } }).then(r => r.json()),
          fetch('/api/store/products', { headers: { 'x-user-id': user.id } }).then(r => r.json()),
          fetch('/api/progress', { headers: { 'x-user-id': user.id } }).then(r => r.json()).catch(() => ({ scenarios_completed: 0, total_scenarios: 15 })),
          fetch('/api/xp', { headers: { 'x-user-id': user.id } }).then(r => r.json()).catch(() => ({ total_xp: 0, level_name: 'Newcomer' })),
          fetch('/api/leaderboard', { headers: { 'x-user-id': user.id } }).then(r => r.json()).catch(() => ({ leaderboard: [] })),
          fetch('/api/challenges', { headers: { 'x-user-id': user.id } }).then(r => r.json()).catch(() => ({ challenges: [] })),
        ]);

        const store = storeRes.store;
        const products = productsRes.products || [];

        // Load orders if store exists
        let orders: Array<{ total: number }> = [];
        if (store) {
          const ordersRes = await fetch(`/api/store/orders?store_id=${store.id}`).then(r => r.json());
          orders = ordersRes.orders || [];
        }

        // Find current user rank in leaderboard
        const lbEntries: LeaderboardEntry[] = leaderboardRes.leaderboard || [];
        const myEntry = lbEntries.find((e: LeaderboardEntry) => e.user_id === user.id);

        // Filter active challenges (not completed, not ended)
        const now = new Date();
        const allChallenges: ChallengeEntry[] = challengesRes.challenges || [];
        const activeChallenges = allChallenges.filter((c: ChallengeEntry) => !c.completed_at && new Date(c.ends_at) > now);

        setData({
          scenariosDone: progressRes.scenarios_completed ?? 0,
          totalScenarios: progressRes.total_scenarios ?? 15,
          productCount: products.length,
          storeExists: !!store,
          storeName: store?.store_name || '',
          storeSlug: store?.slug || '',
          storePublished: store?.is_published || false,
          orderCount: orders.length,
          revenue: orders.reduce((sum: number, o: { total: number }) => sum + (o.total || 0), 0),
          totalXp: xpRes.total_xp ?? 0,
          levelName: xpRes.level_name ?? 'Newcomer',
          leaderboard: lbEntries.slice(0, 5),
          myRank: myEntry?.rank ?? null,
          challenges: activeChallenges.slice(0, 3),
        });
      } catch (err) {
        console.error('Dashboard load failed:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  if (!user || loading) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const d = data || {
    scenariosDone: 0, totalScenarios: 15, productCount: 0,
    storeExists: false, storeName: '', storeSlug: '', storePublished: false,
    orderCount: 0, revenue: 0, totalXp: 0, levelName: 'Newcomer',
    leaderboard: [], myRank: null, challenges: [],
  };

  const progressPct = d.totalScenarios > 0 ? Math.round((d.scenariosDone / d.totalScenarios) * 100) : 0;

  return (
    <div>
      <div className="platform-topbar">
        <div>
          <h4 style={{ margin: 0, fontSize: '1.125rem' }}>Command Center</h4>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
            Welcome back, {user.displayName || user.primaryEmail?.split('@')[0]}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge badge-accent badge-tier">Tier 0</span>
        </div>
      </div>

      <div className="platform-content">
        {/* Stats Row */}
        <div className="stat-strip" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--primary-500)', fontSize: '2rem' }}>{d.scenariosDone}</div>
            <div className="stat-label">Scenarios Done</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--accent-500)', fontSize: '2rem' }}>{d.productCount}</div>
            <div className="stat-label">Products Listed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--warning-500)', fontSize: '2rem' }}>
              {d.storeExists ? (d.storePublished ? 'Live' : 'Draft') : '--'}
            </div>
            <div className="stat-label">Store Status</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--success-500)', fontSize: '2rem' }}>
              ${d.revenue.toFixed(0)}
            </div>
            <div className="stat-label">Revenue</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--primary-500)', fontSize: '2rem' }}>
              {d.totalXp.toLocaleString()}
            </div>
            <div className="stat-label">XP ({d.levelName})</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Learning Progress */}
          <div className="card">
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <h5 style={{ marginBottom: 'var(--space-2)' }}>Learning Progress</h5>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
                Complete scenarios to unlock store capabilities
              </p>
            </div>

            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div className="flex justify-between" style={{ marginBottom: 'var(--space-2)' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Tier 0: Foundation</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{d.scenariosDone} / {d.totalScenarios}</span>
              </div>
              <div className="progress">
                <div className="progress-bar" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            <Link href="/learn/0" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
              {d.scenariosDone > 0 ? 'Continue Learning' : 'Start Learning'}
            </Link>
          </div>

          {/* Store Status */}
          <div className="card">
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <h5 style={{ marginBottom: 'var(--space-2)' }}>Your Store</h5>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
                {d.storeExists ? `${d.storeName} — /store/${d.storeSlug}` : 'Set up your branded storefront'}
              </p>
            </div>

            {d.storeExists ? (
              <div>
                <div className="flex gap-3" style={{ marginBottom: 'var(--space-3)' }}>
                  <div style={{ flex: 1, padding: 'var(--space-3)', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{d.productCount}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Products</div>
                  </div>
                  <div style={{ flex: 1, padding: 'var(--space-3)', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{d.orderCount}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Orders</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Link href="/store/setup" className="btn btn-outline btn-sm" style={{ flex: 1 }}>Settings</Link>
                  <Link href="/store/products" className="btn btn-primary btn-sm" style={{ flex: 1 }}>Products</Link>
                </div>
              </div>
            ) : (
              <div>
                <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                  <div className="empty-state-icon">+</div>
                  <div className="empty-state-title">Create Your Store</div>
                  <div className="empty-state-desc">
                    Set up your branded storefront and start selling
                  </div>
                </div>
                <Link href="/store/setup" className="btn btn-accent btn-sm" style={{ width: '100%' }}>
                  Create Store
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h5 style={{ marginBottom: 'var(--space-4)' }}>Quick Actions</h5>
            <div className="flex flex-col gap-3">
              <Link href="/catalog" className="sidebar-link" style={{ padding: 'var(--space-3)' }}>
                <span style={{ fontFamily: 'var(--font-mono)' }}>?</span>
                Browse CJ Catalog
              </Link>
              <Link href="/learn/0" className="sidebar-link" style={{ padding: 'var(--space-3)' }}>
                <span style={{ fontFamily: 'var(--font-mono)' }}>&gt;</span>
                {d.scenariosDone > 0 ? 'Continue Scenarios' : 'Start Tier 0'}
              </Link>
              {d.storeExists && (
                <Link href={`/store/${d.storeSlug}`} className="sidebar-link" style={{ padding: 'var(--space-3)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>~</span>
                  View Storefront
                </Link>
              )}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="card">
            <h5 style={{ marginBottom: 'var(--space-4)' }}>
              {d.orderCount > 0 ? 'Recent Orders' : 'Recent Activity'}
            </h5>
            {d.orderCount > 0 ? (
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                  {d.orderCount} order{d.orderCount !== 1 ? 's' : ''} totaling ${d.revenue.toFixed(2)}
                </div>
                <Link href="/store/orders" className="btn btn-outline btn-sm" style={{ width: '100%' }}>
                  View All Orders
                </Link>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                <div className="empty-state-desc">
                  Your activity will appear here as you complete scenarios and build your store.
                </div>
              </div>
            )}
          </div>

          {/* Mini Leaderboard */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h5 style={{ margin: 0 }}>Leaderboard</h5>
              <Link href="/leaderboard" style={{ fontSize: '0.75rem', color: 'var(--primary-500)', textDecoration: 'none' }}>View All</Link>
            </div>
            {d.leaderboard.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-4)' }}>
                <div className="empty-state-desc">No leaderboard data yet.</div>
              </div>
            ) : (
              <div>
                {d.leaderboard.map((entry: LeaderboardEntry) => (
                  <div key={entry.user_id} style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                    padding: 'var(--space-2) 0',
                    borderBottom: '1px solid var(--border)',
                    background: entry.user_id === user.id ? 'color-mix(in srgb, var(--primary-500) 8%, transparent)' : 'transparent',
                    borderRadius: entry.user_id === user.id ? 'var(--radius-sm)' : '0',
                    paddingLeft: entry.user_id === user.id ? 'var(--space-2)' : '0',
                    paddingRight: entry.user_id === user.id ? 'var(--space-2)' : '0',
                  }}>
                    <span style={{
                      width: '24px', fontWeight: 700, fontSize: '0.8125rem',
                      color: entry.rank === 1 ? '#FFD700' : entry.rank === 2 ? '#C0C0C0' : entry.rank === 3 ? '#CD7F32' : 'var(--text-tertiary)',
                    }}>{entry.rank}</span>
                    <span style={{ flex: 1, fontSize: '0.8125rem', fontWeight: 600 }}>
                      {entry.full_name}
                      {entry.user_id === user.id && <span style={{ color: 'var(--primary-500)', marginLeft: '4px' }}>(You)</span>}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-500)' }}>
                      {entry.total_xp.toLocaleString()}
                    </span>
                  </div>
                ))}
                {d.myRank && d.myRank > 5 && (
                  <div style={{ textAlign: 'center', paddingTop: 'var(--space-2)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    Your rank: #{d.myRank}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Active Challenges */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h5 style={{ margin: 0 }}>Active Challenges</h5>
              <Link href="/challenges" style={{ fontSize: '0.75rem', color: 'var(--primary-500)', textDecoration: 'none' }}>View All</Link>
            </div>
            {d.challenges.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-4)' }}>
                <div className="empty-state-desc">No active challenges.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {d.challenges.map((c: ChallengeEntry) => {
                  const pct = c.target_value > 0 ? Math.min(100, Math.round((c.current_value / c.target_value) * 100)) : 0;
                  return (
                    <div key={c.id}>
                      <div className="flex justify-between" style={{ marginBottom: 'var(--space-1)' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{c.title}</span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--warning-500)', fontWeight: 700 }}>+{c.xp_reward} XP</span>
                      </div>
                      <div className="progress" style={{ marginBottom: 'var(--space-1)' }}>
                        <div className="progress-bar" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between" style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                        <span>{c.current_value} / {c.target_value}</span>
                        <span>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
