'use client';

import { useUser } from '@stackframe/stack';
import { useState, useEffect } from 'react';

interface TrendingSearch {
  query: string;
  count: number;
}

interface TrendingProduct {
  cj_product_id: string;
  product_name: string;
  count: number;
}

interface RisingTrend {
  query: string;
  current_count: number;
  previous_count: number;
  growth_pct: number;
}

interface MarginProduct {
  id: string;
  title: string;
  price: number;
  cj_cost: number;
  margin_pct: number;
  category: string;
  category_avg_margin: number;
  margin_vs_avg: number;
}

interface ShippingInfo {
  warehouses: string[];
  in_stock: boolean;
  estimated_days: { us: number; intl: number };
  message?: string;
}

interface AIReview {
  health_score: number;
  margin_analysis: string;
  top_performers: string[];
  underperformers: string[];
  risk_factors: string[];
  recommendations: string[];
}

export default function IntelligencePage() {
  const user = useUser({ or: 'redirect' });
  const [activeTab, setActiveTab] = useState<'trends' | 'margins' | 'shipping' | 'ai-review'>('trends');

  // Trends state
  const [trendingSearches, setTrendingSearches] = useState<TrendingSearch[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<TrendingProduct[]>([]);
  const [risingTrends, setRisingTrends] = useState<RisingTrend[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);

  // Margins state
  const [marginProducts, setMarginProducts] = useState<MarginProduct[]>([]);
  const [marginsLoading, setMarginsLoading] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);

  // Shipping state
  const [shippingProductId, setShippingProductId] = useState('');
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);

  // AI Review state
  const [aiReview, setAiReview] = useState<AIReview | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

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

  // Load trends on tab switch
  useEffect(() => {
    if (activeTab === 'trends' && trendingSearches.length === 0 && !trendsLoading) {
      setTrendsLoading(true);
      fetch('/api/intelligence/trends', { headers })
        .then(r => r.json())
        .then(data => {
          setTrendingSearches(data.trending_searches || []);
          setTrendingProducts(data.trending_products || []);
          setRisingTrends(data.rising || []);
        })
        .catch(err => console.error('Failed to load trends:', err))
        .finally(() => setTrendsLoading(false));
    }
  }, [activeTab]);

  // Load margins
  useEffect(() => {
    if (activeTab === 'margins' && storeId && marginProducts.length === 0 && !marginsLoading) {
      setMarginsLoading(true);
      fetch(`/api/intelligence/margins?store_id=${storeId}`, { headers })
        .then(r => r.json())
        .then(data => setMarginProducts(data.products || []))
        .catch(err => console.error('Failed to load margins:', err))
        .finally(() => setMarginsLoading(false));
    }
  }, [activeTab, storeId]);

  const handleShippingCheck = async () => {
    if (!shippingProductId.trim()) return;
    setShippingLoading(true);
    setShippingInfo(null);
    try {
      const paramKey = shippingProductId.length > 20 ? 'cj_product_id' : 'product_id';
      const res = await fetch(`/api/intelligence/shipping?${paramKey}=${shippingProductId.trim()}`, { headers });
      const data = await res.json();
      if (data.error) {
        setShippingInfo({ warehouses: [], in_stock: false, estimated_days: { us: 0, intl: 0 }, message: data.error });
      } else {
        setShippingInfo(data);
      }
    } catch (err) {
      console.error('Shipping check failed:', err);
    } finally {
      setShippingLoading(false);
    }
  };

  const handleAiReview = async () => {
    if (!storeId) return;
    setAiLoading(true);
    setAiReview(null);
    try {
      const res = await fetch('/api/intelligence/ai-review', {
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

  const marginColor = (pct: number) => {
    if (pct >= 40) return 'var(--success-500)';
    if (pct >= 20) return 'var(--warning-500)';
    return 'var(--error-500)';
  };

  return (
    <div>
      <div className="platform-topbar">
        <div>
          <h4 style={{ margin: 0, fontSize: '1.125rem' }}>Supply Chain Intelligence</h4>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
            Market trends, margin analysis, and AI-powered insights
          </p>
        </div>
      </div>

      <div className="platform-content">
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 'var(--space-4)' }}>
          <button style={tabStyle('trends')} onClick={() => setActiveTab('trends')}>Trends</button>
          <button style={tabStyle('margins')} onClick={() => setActiveTab('margins')}>My Margins</button>
          <button style={tabStyle('shipping')} onClick={() => setActiveTab('shipping')}>Shipping</button>
          <button style={tabStyle('ai-review')} onClick={() => setActiveTab('ai-review')}>AI Review</button>
        </div>

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <div>
            {trendsLoading ? (
              <div className="empty-state" style={{ padding: 'var(--space-6)' }}><div className="spinner" /></div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {/* Trending Searches */}
                <div className="card">
                  <h5 style={{ marginBottom: 'var(--space-3)' }}>Trending Searches (7d)</h5>
                  {trendingSearches.length === 0 ? (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', padding: 'var(--space-4)' }}>No search data yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      {trendingSearches.map((s, i) => (
                        <div key={s.query} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span style={{ width: '24px', fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'right' }}>{i + 1}</span>
                          <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600 }}>{s.query}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--accent-500)' }}>{s.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Trending Products */}
                <div className="card">
                  <h5 style={{ marginBottom: 'var(--space-3)' }}>Trending Products (7d)</h5>
                  {trendingProducts.length === 0 ? (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', padding: 'var(--space-4)' }}>No product data yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      {trendingProducts.map((p, i) => (
                        <div key={p.cj_product_id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span style={{ width: '24px', fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'right' }}>{i + 1}</span>
                          <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.product_name}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--accent-500)' }}>{p.count} adds</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Rising Trends */}
                <div className="card" style={{ gridColumn: 'span 2' }}>
                  <h5 style={{ marginBottom: 'var(--space-3)' }}>Rising Trends</h5>
                  {risingTrends.length === 0 ? (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', padding: 'var(--space-4)' }}>No rising trends detected yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      {risingTrends.map(r => (
                        <div key={r.query} style={{
                          padding: 'var(--space-2) var(--space-3)',
                          background: 'color-mix(in srgb, var(--success-500) 10%, transparent)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.875rem',
                        }}>
                          <span style={{ fontWeight: 600 }}>{r.query}</span>
                          <span style={{ marginLeft: 'var(--space-2)', color: 'var(--success-500)', fontWeight: 700, fontSize: '0.8125rem' }}>
                            +{r.growth_pct}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Margins Tab */}
        {activeTab === 'margins' && (
          <div>
            {!storeId ? (
              <div className="card">
                <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                  <div className="empty-state-title">No Store</div>
                  <div className="empty-state-desc">Create a store to see margin analysis.</div>
                </div>
              </div>
            ) : marginsLoading ? (
              <div className="empty-state" style={{ padding: 'var(--space-6)' }}><div className="spinner" /></div>
            ) : marginProducts.length === 0 ? (
              <div className="card">
                <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                  <div className="empty-state-title">No Products</div>
                  <div className="empty-state-desc">Add products to your store to see margin analysis.</div>
                </div>
              </div>
            ) : (
              <div className="card">
                <div style={{
                  display: 'flex', alignItems: 'center',
                  padding: 'var(--space-2) var(--space-4)',
                  marginBottom: 'var(--space-2)',
                  fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  <span style={{ flex: 1 }}>Product</span>
                  <span style={{ width: '80px', textAlign: 'right' }}>Price</span>
                  <span style={{ width: '80px', textAlign: 'right' }}>Cost</span>
                  <span style={{ width: '100px', textAlign: 'right' }}>Margin</span>
                  <span style={{ width: '120px', textAlign: 'right' }}>vs Category Avg</span>
                </div>
                {marginProducts.map(p => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center',
                    padding: 'var(--space-3) var(--space-4)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-1)',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{p.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{p.category}</div>
                    </div>
                    <span style={{ width: '80px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>${p.price.toFixed(2)}</span>
                    <span style={{ width: '80px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>${p.cj_cost.toFixed(2)}</span>
                    <div style={{ width: '100px', textAlign: 'right' }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        color: marginColor(p.margin_pct),
                        background: `color-mix(in srgb, ${marginColor(p.margin_pct)} 12%, transparent)`,
                      }}>
                        {p.margin_pct.toFixed(1)}%
                      </div>
                    </div>
                    <span style={{
                      width: '120px', textAlign: 'right',
                      fontFamily: 'var(--font-mono)', fontSize: '0.8125rem',
                      color: p.margin_vs_avg >= 0 ? 'var(--success-500)' : 'var(--error-500)',
                    }}>
                      {p.margin_vs_avg >= 0 ? '+' : ''}{p.margin_vs_avg.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Shipping Tab */}
        {activeTab === 'shipping' && (
          <div>
            <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
              <h5 style={{ marginBottom: 'var(--space-3)' }}>Check Shipping & Inventory</h5>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <input
                  type="text"
                  value={shippingProductId}
                  onChange={(e) => setShippingProductId(e.target.value)}
                  placeholder="Enter product ID or CJ product ID"
                  style={{
                    flex: 1,
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleShippingCheck()}
                />
                <button className="btn btn-primary btn-sm" onClick={handleShippingCheck} disabled={shippingLoading || !shippingProductId.trim()}>
                  {shippingLoading ? 'Checking...' : 'Check'}
                </button>
              </div>
            </div>

            {shippingInfo && (
              <div className="card">
                {shippingInfo.message ? (
                  <div style={{ fontSize: '0.875rem', color: 'var(--error-500)', padding: 'var(--space-3)' }}>{shippingInfo.message}</div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                      <div style={{ flex: 1, padding: 'var(--space-3)', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                        <div style={{
                          fontSize: '1.25rem', fontWeight: 700,
                          color: shippingInfo.in_stock ? 'var(--success-500)' : 'var(--error-500)',
                        }}>
                          {shippingInfo.in_stock ? 'In Stock' : 'Out of Stock'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Availability</div>
                      </div>
                      <div style={{ flex: 1, padding: 'var(--space-3)', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-500)' }}>
                          {shippingInfo.estimated_days.us}d
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>US Shipping</div>
                      </div>
                      <div style={{ flex: 1, padding: 'var(--space-3)', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-500)' }}>
                          {shippingInfo.estimated_days.intl}d
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Intl Shipping</div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)', textTransform: 'uppercase' }}>
                      Warehouses ({shippingInfo.warehouses.length})
                    </div>
                    {shippingInfo.warehouses.length === 0 ? (
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>No warehouse data available.</div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                        {shippingInfo.warehouses.map((w, i) => (
                          <span key={i} style={{
                            padding: 'var(--space-1) var(--space-2)',
                            background: 'var(--surface-elevated)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                          }}>
                            {w}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!shippingInfo && !shippingLoading && (
              <div className="card">
                <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                  <div className="empty-state-title">Enter a Product ID</div>
                  <div className="empty-state-desc">Check real-time inventory and shipping estimates for any product.</div>
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
                  <div className="empty-state-title">No Store</div>
                  <div className="empty-state-desc">Create a store with products to get an AI review.</div>
                </div>
              </div>
            ) : (
              <div>
                <div className="card" style={{ marginBottom: 'var(--space-4)', textAlign: 'center' }}>
                  <h5 style={{ marginBottom: 'var(--space-2)' }}>AI Product Lineup Review</h5>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                    Get an AI-powered analysis of your product lineup health, margins, risks, and recommendations.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={handleAiReview}
                    disabled={aiLoading}
                  >
                    {aiLoading ? 'Analyzing...' : 'Analyze My Store'}
                  </button>
                </div>

                {aiReview && (
                  <div>
                    {/* Health Score */}
                    <div className="card" style={{ marginBottom: 'var(--space-4)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>
                        Health Score
                      </div>
                      <div style={{
                        fontSize: '3rem', fontWeight: 800,
                        color: aiReview.health_score >= 70 ? 'var(--success-500)' : aiReview.health_score >= 40 ? 'var(--warning-500)' : 'var(--error-500)',
                      }}>
                        {aiReview.health_score}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                        {aiReview.margin_analysis}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Risk Factors */}
                      <div className="card">
                        <h5 style={{ marginBottom: 'var(--space-3)', color: 'var(--error-500)' }}>Risk Factors</h5>
                        {aiReview.risk_factors.length === 0 ? (
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>No risks identified.</div>
                        ) : (
                          <ul style={{ margin: 0, paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                            {aiReview.risk_factors.map((r, i) => (
                              <li key={i} style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{r}</li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Recommendations */}
                      <div className="card">
                        <h5 style={{ marginBottom: 'var(--space-3)', color: 'var(--success-500)' }}>Recommendations</h5>
                        {aiReview.recommendations.length === 0 ? (
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>No recommendations.</div>
                        ) : (
                          <ul style={{ margin: 0, paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                            {aiReview.recommendations.map((r, i) => (
                              <li key={i} style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{r}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
