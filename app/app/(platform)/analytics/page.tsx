'use client';

import { useUser } from '@stackframe/stack';
import { useState, useEffect } from 'react';

interface RevenueDay {
  date: string;
  revenue: number;
}

interface ProductPerformance {
  id: string;
  rank: number;
  title: string;
  revenue: number;
  units_sold: number;
}

interface StoreTotals {
  total_revenue: number;
  order_count: number;
  avg_order_value: number;
  avg_margin: number;
}

interface StoreComparison {
  revenue_change_pct: number;
  order_count_change_pct: number;
  prev_revenue: number;
  prev_order_count: number;
}

interface ScoreEntry {
  scenario_id: string;
  score: number;
  completed_at: string;
}

interface XpWeek {
  week_start: string;
  xp: number;
}

interface TierProgress {
  tier: number;
  completed: number;
  total: number;
  percentage: number;
}

interface StrengthWeakness {
  dimension: string;
  avg_score: number;
}

interface ReviewSection {
  title: string;
  content: string;
}

interface AIReviewData {
  grade: string;
  sections: ReviewSection[];
}

export default function AnalyticsPage() {
  const user = useUser({ or: 'redirect' });
  const [activeTab, setActiveTab] = useState<'store' | 'learning' | 'ai-review' | 'export'>('store');

  // Store state
  const [storeId, setStoreId] = useState<string | null>(null);
  const [revenueByDay, setRevenueByDay] = useState<RevenueDay[]>([]);
  const [productPerformance, setProductPerformance] = useState<ProductPerformance[]>([]);
  const [totals, setTotals] = useState<StoreTotals | null>(null);
  const [comparison, setComparison] = useState<StoreComparison | null>(null);
  const [storeLoading, setStoreLoading] = useState(false);

  // Learning state
  const [scoresOverTime, setScoresOverTime] = useState<ScoreEntry[]>([]);
  const [dimensionAverages, setDimensionAverages] = useState<Record<string, number>>({});
  const [xpByWeek, setXpByWeek] = useState<XpWeek[]>([]);
  const [tierProgress, setTierProgress] = useState<TierProgress[]>([]);
  const [strengths, setStrengths] = useState<StrengthWeakness[]>([]);
  const [weaknesses, setWeaknesses] = useState<StrengthWeakness[]>([]);
  const [learningLoading, setLearningLoading] = useState(false);

  // AI Review state
  const [aiReview, setAiReview] = useState<AIReviewData | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Export state
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  const headers: Record<string, string> = user ? { 'x-user-id': user.id } : {};

  // Load store ID on mount
  useEffect(() => {
    if (!user) return;
    fetch('/api/store', { headers })
      .then(r => r.json())
      .then(data => {
        if (data.store) setStoreId(data.store.id);
      })
      .catch(() => {});
  }, [user]);

  // Load store analytics
  useEffect(() => {
    if (activeTab === 'store' && storeId && !totals && !storeLoading) {
      setStoreLoading(true);
      fetch(`/api/analytics/store?store_id=${storeId}&range=30`, { headers })
        .then(r => r.json())
        .then(data => {
          setRevenueByDay(data.revenue_by_day || []);
          setProductPerformance(data.product_performance || []);
          setTotals(data.totals || null);
          setComparison(data.comparison || null);
        })
        .catch(err => console.error('Failed to load store analytics:', err))
        .finally(() => setStoreLoading(false));
    }
  }, [activeTab, storeId]);

  // Load learning analytics
  useEffect(() => {
    if (activeTab === 'learning' && scoresOverTime.length === 0 && !learningLoading) {
      setLearningLoading(true);
      fetch('/api/analytics/learning', { headers })
        .then(r => r.json())
        .then(data => {
          setScoresOverTime(data.scores_over_time || []);
          setDimensionAverages(data.dimension_averages || {});
          setXpByWeek(data.xp_by_week || []);
          setTierProgress(data.tier_progress || []);
          setStrengths(data.strengths || []);
          setWeaknesses(data.weaknesses || []);
        })
        .catch(err => console.error('Failed to load learning analytics:', err))
        .finally(() => setLearningLoading(false));
    }
  }, [activeTab]);

  const handleAiReview = async () => {
    if (!storeId) return;
    setAiLoading(true);
    setAiReview(null);
    try {
      const res = await fetch('/api/analytics/ai-review', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId }),
      });
      const data = await res.json();
      setAiReview(data.review || null);
    } catch (err) {
      console.error('AI review failed:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleExport = async (type: string) => {
    if (!storeId) return;
    setExportLoading(type);
    try {
      const res = await fetch(`/api/analytics/export?store_id=${storeId}&type=${type}`, { headers });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-export.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExportLoading(null);
    }
  };

  if (!user) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const tabStyle = (tab: string): React.CSSProperties => ({
    padding: 'var(--space-2) var(--space-4)',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    borderBottomColor: activeTab === tab ? 'var(--primary-500)' : 'transparent',
    color: activeTab === tab ? 'var(--primary-500)' : 'var(--text-tertiary)',
  });

  const maxRevenue = revenueByDay.length > 0 ? Math.max(...revenueByDay.map(d => d.revenue), 1) : 1;
  const maxXp = xpByWeek.length > 0 ? Math.max(...xpByWeek.map(w => w.xp), 1) : 1;

  const changeColor = (pct: number) => pct >= 0 ? 'var(--success-500)' : 'var(--error-500)';
  const changePrefix = (pct: number) => pct >= 0 ? '+' : '';

  const tierNames = ['Foundation', 'Growth', 'Operations', 'Scaling'];

  return (
    <div>
      <div className="platform-topbar">
        <div>
          <h4 style={{ margin: 0, fontSize: '1.125rem' }}>Analytics & Business Intelligence</h4>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
            Track your store performance and learning progress
          </p>
        </div>
      </div>

      <div className="platform-content">
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 'var(--space-4)' }}>
          <button style={tabStyle('store')} onClick={() => setActiveTab('store')}>Store Performance</button>
          <button style={tabStyle('learning')} onClick={() => setActiveTab('learning')}>Learning Progress</button>
          <button style={tabStyle('ai-review')} onClick={() => setActiveTab('ai-review')}>AI Review</button>
          <button style={tabStyle('export')} onClick={() => setActiveTab('export')}>Export</button>
        </div>

        {/* Store Performance Tab */}
        {activeTab === 'store' && (
          <div>
            {!storeId ? (
              <div className="card">
                <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                  <div className="empty-state-title">No Store Yet</div>
                  <div className="empty-state-desc">Create a store to see performance analytics.</div>
                </div>
              </div>
            ) : storeLoading ? (
              <div className="empty-state" style={{ padding: 'var(--space-6)' }}><div className="spinner" /></div>
            ) : (
              <div>
                {/* Stats Strip */}
                {totals && (
                  <div className="stat-strip" style={{ marginBottom: 'var(--space-6)' }}>
                    <div className="stat-card">
                      <div className="stat-value" style={{ color: 'var(--success-500)', fontSize: '2rem' }}>
                        ${totals.total_revenue.toFixed(2)}
                      </div>
                      <div className="stat-label">
                        Revenue (30d)
                        {comparison && (
                          <span style={{ marginLeft: 'var(--space-1)', color: changeColor(comparison.revenue_change_pct), fontWeight: 700 }}>
                            {changePrefix(comparison.revenue_change_pct)}{comparison.revenue_change_pct}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value" style={{ color: 'var(--primary-500)', fontSize: '2rem' }}>
                        {totals.order_count}
                      </div>
                      <div className="stat-label">
                        Orders
                        {comparison && (
                          <span style={{ marginLeft: 'var(--space-1)', color: changeColor(comparison.order_count_change_pct), fontWeight: 700 }}>
                            {changePrefix(comparison.order_count_change_pct)}{comparison.order_count_change_pct}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value" style={{ color: 'var(--accent-500)', fontSize: '2rem' }}>
                        ${totals.avg_order_value.toFixed(2)}
                      </div>
                      <div className="stat-label">Avg Order Value</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value" style={{ color: 'var(--warning-500)', fontSize: '2rem' }}>
                        {totals.avg_margin.toFixed(1)}%
                      </div>
                      <div className="stat-label">Avg Margin</div>
                    </div>
                  </div>
                )}

                {/* Revenue Chart (CSS bar chart) */}
                <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                  <h5 style={{ marginBottom: 'var(--space-3)' }}>Revenue by Day (Last 30 Days)</h5>
                  {revenueByDay.length === 0 ? (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', padding: 'var(--space-4)' }}>No revenue data.</div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '160px', padding: 'var(--space-2) 0' }}>
                      {revenueByDay.map((d) => {
                        const heightPct = maxRevenue > 0 ? (d.revenue / maxRevenue) * 100 : 0;
                        return (
                          <div
                            key={d.date}
                            title={`${d.date}: $${d.revenue.toFixed(2)}`}
                            style={{
                              flex: 1,
                              height: `${Math.max(heightPct, 2)}%`,
                              background: d.revenue > 0 ? 'var(--primary-500)' : 'var(--border)',
                              borderRadius: '2px 2px 0 0',
                              minWidth: '4px',
                              cursor: 'default',
                              transition: 'opacity 0.15s',
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Product Performance Table */}
                <div className="card">
                  <h5 style={{ marginBottom: 'var(--space-3)' }}>Product Performance</h5>
                  {productPerformance.length === 0 ? (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', padding: 'var(--space-4)' }}>No product sales data.</div>
                  ) : (
                    <div>
                      <div style={{
                        display: 'flex', padding: 'var(--space-2) var(--space-4)', marginBottom: 'var(--space-2)',
                        fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase',
                      }}>
                        <span style={{ width: '40px' }}>#</span>
                        <span style={{ flex: 1 }}>Product</span>
                        <span style={{ width: '80px', textAlign: 'right' }}>Units</span>
                        <span style={{ width: '100px', textAlign: 'right' }}>Revenue</span>
                      </div>
                      {productPerformance.map(p => (
                        <div key={p.id} style={{
                          display: 'flex', alignItems: 'center', padding: 'var(--space-2) var(--space-4)',
                          borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-1)',
                        }}>
                          <span style={{ width: '40px', fontWeight: 700, color: p.rank <= 3 ? 'var(--warning-500)' : 'var(--text-tertiary)' }}>{p.rank}</span>
                          <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9375rem' }}>{p.title}</span>
                          <span style={{ width: '80px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{p.units_sold}</span>
                          <span style={{ width: '100px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success-500)' }}>${p.revenue.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Learning Progress Tab */}
        {activeTab === 'learning' && (
          <div>
            {learningLoading ? (
              <div className="empty-state" style={{ padding: 'var(--space-6)' }}><div className="spinner" /></div>
            ) : (
              <div>
                {/* XP by Week Chart */}
                <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                  <h5 style={{ marginBottom: 'var(--space-3)' }}>XP Growth by Week</h5>
                  {xpByWeek.length === 0 ? (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', padding: 'var(--space-4)' }}>No XP data yet. Complete scenarios to earn XP.</div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px', padding: 'var(--space-2) 0' }}>
                      {xpByWeek.map((w) => {
                        const heightPct = maxXp > 0 ? (w.xp / maxXp) * 100 : 0;
                        return (
                          <div
                            key={w.week_start}
                            title={`Week of ${w.week_start}: ${w.xp} XP`}
                            style={{
                              flex: 1,
                              height: `${Math.max(heightPct, 4)}%`,
                              background: 'var(--accent-500)',
                              borderRadius: '2px 2px 0 0',
                              minWidth: '8px',
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Scenario Scores */}
                  <div className="card">
                    <h5 style={{ marginBottom: 'var(--space-3)' }}>Scenario Scores</h5>
                    {scoresOverTime.length === 0 ? (
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', padding: 'var(--space-4)' }}>No completed scenarios yet.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {scoresOverTime.map(s => {
                          const color = s.score >= 80 ? 'var(--success-500)' : s.score >= 50 ? 'var(--warning-500)' : 'var(--error-500)';
                          return (
                            <div key={s.scenario_id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                              <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600 }}>{s.scenario_id}</span>
                              <div style={{ width: '120px' }}>
                                <div style={{
                                  height: '8px',
                                  borderRadius: '4px',
                                  background: 'var(--surface-elevated)',
                                  overflow: 'hidden',
                                }}>
                                  <div style={{
                                    height: '100%',
                                    width: `${s.score}%`,
                                    background: color,
                                    borderRadius: '4px',
                                  }} />
                                </div>
                              </div>
                              <span style={{ width: '40px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color, fontSize: '0.8125rem' }}>{s.score}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Dimension Averages */}
                  <div className="card">
                    <h5 style={{ marginBottom: 'var(--space-3)' }}>Dimension Averages</h5>
                    {Object.keys(dimensionAverages).length === 0 ? (
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', padding: 'var(--space-4)' }}>No evaluation data yet.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {Object.entries(dimensionAverages).map(([dim, avg]) => {
                          const label = dim.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                          return (
                            <div key={dim} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                              <span style={{ flex: 1, fontSize: '0.8125rem' }}>{label}</span>
                              <div style={{ width: '100px' }}>
                                <div style={{
                                  height: '8px',
                                  borderRadius: '4px',
                                  background: 'var(--surface-elevated)',
                                  overflow: 'hidden',
                                }}>
                                  <div style={{
                                    height: '100%',
                                    width: `${(avg / 25) * 100}%`,
                                    background: 'var(--primary-500)',
                                    borderRadius: '4px',
                                  }} />
                                </div>
                              </div>
                              <span style={{ width: '40px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 700 }}>{avg}/25</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Tier Progress */}
                  <div className="card">
                    <h5 style={{ marginBottom: 'var(--space-3)' }}>Tier Progress</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                      {tierProgress.map(t => (
                        <div key={t.tier}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Tier {t.tier}: {tierNames[t.tier]}</span>
                            <span style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}>
                              {t.completed}{t.total > 0 ? `/${t.total}` : ''}
                            </span>
                          </div>
                          <div className="progress">
                            <div className="progress-bar" style={{ width: `${t.percentage}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Strengths & Weaknesses */}
                  <div className="card">
                    <h5 style={{ marginBottom: 'var(--space-3)' }}>Strengths & Weaknesses</h5>
                    {strengths.length === 0 && weaknesses.length === 0 ? (
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', padding: 'var(--space-4)' }}>Complete more scenarios to see patterns.</div>
                    ) : (
                      <div>
                        {strengths.length > 0 && (
                          <div style={{ marginBottom: 'var(--space-3)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success-500)', textTransform: 'uppercase', marginBottom: 'var(--space-1)' }}>Strengths</div>
                            {strengths.map(s => (
                              <div key={s.dimension} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: 'var(--space-1) 0' }}>
                                <span>{s.dimension}</span>
                                <span style={{ fontWeight: 700, color: 'var(--success-500)' }}>{s.avg_score}/25</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {weaknesses.length > 0 && (
                          <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--error-500)', textTransform: 'uppercase', marginBottom: 'var(--space-1)' }}>Areas to Improve</div>
                            {weaknesses.map(w => (
                              <div key={w.dimension} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: 'var(--space-1) 0' }}>
                                <span>{w.dimension}</span>
                                <span style={{ fontWeight: 700, color: 'var(--error-500)' }}>{w.avg_score}/25</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Review Tab */}
        {activeTab === 'ai-review' && (
          <div>
            {!storeId ? (
              <div className="card">
                <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                  <div className="empty-state-title">No Store Yet</div>
                  <div className="empty-state-desc">Create a store with products and orders to get an AI business review.</div>
                </div>
              </div>
            ) : (
              <div>
                <div className="card" style={{ marginBottom: 'var(--space-4)', textAlign: 'center' }}>
                  <h5 style={{ marginBottom: 'var(--space-2)' }}>AI Business Review</h5>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                    Get an AI-generated comprehensive review of your store performance, revenue trends, and growth opportunities.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={handleAiReview}
                    disabled={aiLoading}
                  >
                    {aiLoading ? 'Generating Review...' : 'Generate Review'}
                  </button>
                </div>

                {aiReview && (
                  <div>
                    {/* Grade */}
                    <div className="card" style={{ marginBottom: 'var(--space-4)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>
                        Overall Grade
                      </div>
                      <div style={{
                        fontSize: '4rem', fontWeight: 800, lineHeight: 1,
                        color: aiReview.grade === 'A' ? 'var(--success-500)'
                          : aiReview.grade === 'B' ? 'var(--primary-500)'
                          : aiReview.grade === 'C' ? 'var(--warning-500)'
                          : 'var(--error-500)',
                      }}>
                        {aiReview.grade}
                      </div>
                    </div>

                    {/* Sections */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                      {aiReview.sections.map((section, idx) => (
                        <div key={idx} className="card">
                          <h5 style={{ marginBottom: 'var(--space-2)' }}>{section.title}</h5>
                          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            {section.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div>
            {!storeId ? (
              <div className="card">
                <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                  <div className="empty-state-title">No Store Yet</div>
                  <div className="empty-state-desc">Create a store to export data.</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div className="card" style={{ gridColumn: 'span 2' }}>
                  <h5 style={{ marginBottom: 'var(--space-4)' }}>Export Store Data</h5>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                    Download your store data as CSV files for external analysis or record keeping.
                  </p>
                </div>

                <div className="card">
                  <h5 style={{ marginBottom: 'var(--space-2)' }}>Orders Export</h5>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
                    Order number, date, customer name, total, and status for all orders.
                  </p>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleExport('orders')}
                    disabled={exportLoading === 'orders'}
                    style={{ width: '100%' }}
                  >
                    {exportLoading === 'orders' ? 'Downloading...' : 'Download Orders CSV'}
                  </button>
                </div>

                <div className="card">
                  <h5 style={{ marginBottom: 'var(--space-2)' }}>Products Export</h5>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
                    Product title, price, CJ cost, margin, and category for all active products.
                  </p>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleExport('products')}
                    disabled={exportLoading === 'products'}
                    style={{ width: '100%' }}
                  >
                    {exportLoading === 'products' ? 'Downloading...' : 'Download Products CSV'}
                  </button>
                </div>

                <div className="card" style={{ gridColumn: 'span 2' }}>
                  <h5 style={{ marginBottom: 'var(--space-2)' }}>Monthly Summary Export</h5>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
                    Monthly revenue, order count, and average order value for all time.
                  </p>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleExport('summary')}
                    disabled={exportLoading === 'summary'}
                    style={{ width: '200px' }}
                  >
                    {exportLoading === 'summary' ? 'Downloading...' : 'Download Summary CSV'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
