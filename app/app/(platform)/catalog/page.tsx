'use client';

import { useState, useEffect, useCallback } from 'react';

interface CJProduct {
  pid: string;
  productNameEn: string;
  productImage: string;
  sellPrice: number;
  categoryName?: string;
  productSku?: string;
}

interface ProductAnalysis {
  viability_score: number;
  verdict: string;
  recommendation: string;
  strengths: string[];
  risks: string[];
  margin_analysis?: {
    cj_cost: number;
    recommended_retail: number;
    estimated_margin_percent: number;
    assessment: string;
  };
  competition?: {
    level: string;
    assessment: string;
  };
}

export default function CatalogPage() {
  const [products, setProducts] = useState<CJProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Array<{ categoryId: string; categoryName: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [analyzingProduct, setAnalyzingProduct] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ProductAnalysis | null>(null);

  // Load categories on mount
  useEffect(() => {
    fetch('/api/cj/categories')
      .then(r => r.json())
      .then(data => setCategories(data.categories || []))
      .catch(console.error);
  }, []);

  const searchProducts = useCallback(async (resetPage = false) => {
    setLoading(true);
    const currentPage = resetPage ? 1 : page;
    if (resetPage) setPage(1);

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (selectedCategory) params.set('category', selectedCategory);
      params.set('page', String(currentPage));
      params.set('pageSize', '20');

      const res = await fetch(`/api/cj/products?${params}`);
      const data = await res.json();

      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, page]);

  // Search on mount and when filters change
  useEffect(() => {
    searchProducts(true);
  }, [selectedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchProducts(true);
  };

  const analyzeProduct = async (product: CJProduct) => {
    setAnalyzingProduct(product.pid);
    setAnalysisResult(null);

    try {
      const res = await fetch('/api/ai/product-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            name: product.productNameEn,
            categoryName: product.categoryName,
            sellPrice: product.sellPrice,
            sku: product.productSku,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAnalysisResult(data.analysis);
      }
    } catch (err) {
      console.error('Analysis failed:', err);
    }
  };

  const closeAnalysis = () => {
    setAnalyzingProduct(null);
    setAnalysisResult(null);
  };

  const estimatedRetail = (cost: number) => Math.round(cost * 2.5 * 100) / 100;
  const estimatedMargin = (cost: number) => Math.round(((estimatedRetail(cost) - cost) / estimatedRetail(cost)) * 100);

  return (
    <div>
      {/* Top Bar */}
      <div className="platform-topbar">
        <div>
          <h4 style={{ margin: 0, fontSize: '1.125rem' }}>Product Catalog</h4>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
            {total > 0 ? `${total.toLocaleString()} products` : 'Search CJ\'s 400K+ products'}
          </p>
        </div>
      </div>

      <div className="platform-content" style={{ maxWidth: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 'var(--space-6)' }}>
          {/* Category Sidebar */}
          <div>
            <div style={{ position: 'sticky', top: '60px' }}>
              <div className="sidebar-section-label">Categories</div>
              <button
                onClick={() => setSelectedCategory('')}
                className={`sidebar-link ${!selectedCategory ? 'active' : ''}`}
                style={{ width: '100%', textAlign: 'left', fontSize: '0.8125rem' }}
              >
                All Products
              </button>
              {categories.slice(0, 15).map((cat) => (
                <button
                  key={cat.categoryId}
                  onClick={() => setSelectedCategory(cat.categoryId)}
                  className={`sidebar-link ${selectedCategory === cat.categoryId ? 'active' : ''}`}
                  style={{ width: '100%', textAlign: 'left', fontSize: '0.8125rem' }}
                >
                  {cat.categoryName}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div>
            {/* Search Bar */}
            <form onSubmit={handleSearch} style={{ marginBottom: 'var(--space-6)', display: 'flex', gap: 'var(--space-3)' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', paddingRight: searchQuery ? '36px' : undefined }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setPage(1); searchProducts(true); }}
                    style={{
                      position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-tertiary)', fontSize: '1.125rem', lineHeight: 1,
                      padding: '4px', borderRadius: '50%',
                    }}
                    title="Clear search"
                  >
                    &#x2715;
                  </button>
                )}
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>

            {/* Products */}
            {loading && products.length === 0 ? (
              <div className="empty-state">
                <div className="spinner" />
                <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-tertiary)' }}>Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">?</div>
                <div className="empty-state-title">No products found</div>
                <div className="empty-state-desc">Try a different search term or category</div>
              </div>
            ) : (
              <>
                <div className="product-grid">
                  {products.map((product) => (
                    <div key={product.pid} className="product-card">
                      <div className="product-card-image">
                        {product.productImage ? (
                          <img src={product.productImage} alt={product.productNameEn} />
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '2rem' }}>?</span>
                        )}
                      </div>
                      <div className="product-card-body">
                        <div className="product-card-title">{product.productNameEn}</div>
                        <div className="product-card-price">
                          <span className="product-card-cost">${product.sellPrice?.toFixed(2)}</span>
                          <span className="product-card-margin">~{estimatedMargin(product.sellPrice)}% margin</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                          Sell at ~${estimatedRetail(product.sellPrice)}
                        </div>
                      </div>
                      <div className="product-card-actions">
                        <button
                          className="btn btn-accent btn-sm"
                          style={{ flex: 1, fontSize: '0.75rem' }}
                          onClick={() => analyzeProduct(product)}
                        >
                          AI Analyze
                        </button>
                        <button className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem' }}>
                          Save
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex justify-center gap-4" style={{ marginTop: 'var(--space-8)' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={page <= 1}
                    onClick={() => { setPage(p => p - 1); searchProducts(); }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', alignSelf: 'center' }}>
                    Page {page}
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={products.length < 20}
                    onClick={() => { setPage(p => p + 1); searchProducts(); }}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* AI Analysis Modal */}
      {analyzingProduct && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--space-4)',
        }} onClick={closeAnalysis}>
          <div
            className="card"
            style={{ maxWidth: '560px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            {!analysisResult ? (
              <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                <div className="spinner" />
                <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-secondary)' }}>
                  AI is analyzing this product...
                </p>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
                  <h5 style={{ margin: 0 }}>Product Analysis</h5>
                  <button onClick={closeAnalysis} className="btn btn-ghost btn-sm">X</button>
                </div>

                {/* Viability Score */}
                <div className="flex items-center gap-4" style={{ marginBottom: 'var(--space-4)' }}>
                  <div className="score-ring" style={{
                    borderColor: analysisResult.viability_score >= 70 ? 'var(--success-500)' :
                      analysisResult.viability_score >= 40 ? 'var(--warning-500)' : 'var(--error-500)'
                  }}>
                    <span className="score-ring-value">{analysisResult.viability_score}</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 'var(--space-1)' }}>
                      {analysisResult.verdict?.replace('_', ' ').toUpperCase()}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                      Viability Score
                    </div>
                  </div>
                </div>

                {/* Details */}
                {analysisResult.recommendation && (
                  <div className="coaching-note" style={{ marginBottom: 'var(--space-4)' }}>
                    {analysisResult.recommendation}
                  </div>
                )}

                {analysisResult.strengths?.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-3)' }}>
                    <div className="workspace-panel-label">Strengths</div>
                    <div className="flex flex-wrap">
                      {analysisResult.strengths.map((s, i) => (
                        <span key={i} className="eval-tag eval-tag-strength">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {analysisResult.risks?.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-3)' }}>
                    <div className="workspace-panel-label">Risks</div>
                    <div className="flex flex-wrap">
                      {analysisResult.risks.map((r, i) => (
                        <span key={i} className="eval-tag eval-tag-gap">{r}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
