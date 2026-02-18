'use client';

import { useUser } from '@stackframe/stack';
import { useState, useEffect, useCallback } from 'react';

interface StoreProduct {
  id: string;
  cj_product_id: string;
  title: string;
  description: string;
  price: number;
  compare_at_price?: number;
  cj_cost: number;
  margin_percent: number;
  images: string;
  category?: string;
  is_active: boolean;
  sort_order: number;
}

interface CJProduct {
  pid: string;
  productNameEn: string;
  productImage: string;
  sellPrice: number;
  categoryName?: string;
}

interface PricingAnalysis {
  margin_health: { score: number; assessment: string };
  recommended_range: { floor: number; sweet_spot: number; ceiling: number; reasoning: string };
  positioning: { strategy: string; assessment: string };
  verdict: string;
  recommendation: string;
}

export default function ProductsPage() {
  const user = useUser({ or: 'redirect' });
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<CJProduct[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const [pricingAnalysis, setPricingAnalysis] = useState<PricingAnalysis | null>(null);
  const [analyzingPrice, setAnalyzingPrice] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCompareAt, setEditCompareAt] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProducts = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/store/products', { headers: { 'x-user-id': user.id } });
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error('Load products failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const searchCatalog = async () => {
    setCatalogLoading(true);
    try {
      const params = new URLSearchParams();
      if (catalogSearch) params.set('q', catalogSearch);
      params.set('pageSize', '12');
      const res = await fetch(`/api/cj/products?${params}`);
      const data = await res.json();
      setCatalogProducts(data.products || []);
    } catch (err) {
      console.error('Catalog search failed:', err);
    } finally {
      setCatalogLoading(false);
    }
  };

  const addProduct = async (cjProduct: CJProduct) => {
    if (!user) return;
    const retailPrice = Math.round(cjProduct.sellPrice * 2.5 * 100) / 100;

    try {
      const res = await fetch('/api/store/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({
          cj_product_id: cjProduct.pid,
          title: cjProduct.productNameEn,
          price: retailPrice,
          cj_cost: cjProduct.sellPrice,
          images: cjProduct.productImage ? [cjProduct.productImage] : [],
          category: cjProduct.categoryName,
        }),
      });
      const data = await res.json();
      if (data.product) {
        setProducts(prev => [...prev, data.product]);
        setShowCatalog(false);
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error('Add product failed:', err);
    }
  };

  const openEdit = (product: StoreProduct) => {
    setEditingProduct(product);
    setEditTitle(product.title);
    setEditDescription(product.description || '');
    setEditPrice(product.price.toString());
    setEditCompareAt(product.compare_at_price?.toString() || '');
    setPricingAnalysis(null);
  };

  const saveEdit = async () => {
    if (!user || !editingProduct) return;
    setSaving(true);

    try {
      const res = await fetch('/api/store/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({
          product_id: editingProduct.id,
          title: editTitle.trim(),
          description: editDescription.trim(),
          price: parseFloat(editPrice),
          compare_at_price: editCompareAt ? parseFloat(editCompareAt) : null,
        }),
      });
      const data = await res.json();
      if (data.product) {
        setProducts(prev => prev.map(p => p.id === data.product.id ? data.product : p));
        setEditingProduct(null);
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (product: StoreProduct) => {
    if (!user) return;
    try {
      const res = await fetch('/api/store/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ product_id: product.id, is_active: !product.is_active }),
      });
      const data = await res.json();
      if (data.product) {
        setProducts(prev => prev.map(p => p.id === data.product.id ? data.product : p));
      }
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  };

  const deleteProduct = async (product: StoreProduct) => {
    if (!user || !confirm('Remove this product from your store?')) return;
    try {
      await fetch('/api/store/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ product_id: product.id }),
      });
      setProducts(prev => prev.filter(p => p.id !== product.id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const analyzePricing = async () => {
    if (!editingProduct) return;
    setAnalyzingPrice(true);
    setPricingAnalysis(null);

    try {
      const res = await fetch('/api/ai/pricing-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: editTitle,
          cj_cost: editingProduct.cj_cost,
          proposed_price: parseFloat(editPrice) || null,
          category: editingProduct.category,
        }),
      });
      const data = await res.json();
      if (data.success) setPricingAnalysis(data.analysis);
    } catch (err) {
      console.error('Pricing analysis failed:', err);
    } finally {
      setAnalyzingPrice(false);
    }
  };

  const parseImages = (img: string): string[] => {
    try { return JSON.parse(img); } catch { return []; }
  };

  const margin = (price: number, cost: number) =>
    price > 0 ? Math.round(((price - cost) / price) * 100) : 0;

  if (loading) {
    return <div className="empty-state" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;
  }

  return (
    <div>
      <div className="platform-topbar">
        <div>
          <h4 style={{ margin: 0, fontSize: '1.125rem' }}>Products</h4>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
            {products.length} product{products.length !== 1 ? 's' : ''} in your store
          </p>
        </div>
        <button className="btn btn-accent btn-sm" onClick={() => { setShowCatalog(true); searchCatalog(); }}>
          + Add Product
        </button>
      </div>

      <div className="platform-content" style={{ maxWidth: '100%' }}>
        {products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">=</div>
            <div className="empty-state-title">No Products Yet</div>
            <div className="empty-state-desc">
              Add products from the CJ catalog to start building your store.
            </div>
            <button className="btn btn-primary" onClick={() => { setShowCatalog(true); searchCatalog(); }}>
              Browse Catalog
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {products.map(product => {
              const images = parseImages(product.images);
              const m = margin(product.price, product.cj_cost);
              return (
                <div key={product.id} className="card" style={{
                  display: 'grid', gridTemplateColumns: '60px 1fr auto',
                  gap: 'var(--space-4)', padding: 'var(--space-4)', alignItems: 'center',
                  opacity: product.is_active ? 1 : 0.5,
                }}>
                  <div style={{
                    width: '60px', height: '60px', borderRadius: 'var(--radius-md)',
                    overflow: 'hidden', background: 'var(--neutral-200)',
                    flexShrink: 0,
                  }}>
                    {images[0] && <img src={images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 'var(--space-1)' }} className="truncate">
                      {product.title}
                    </div>
                    <div className="flex items-center gap-3" style={{ fontSize: '0.8125rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--accent-500)' }}>${product.price.toFixed(2)}</span>
                      <span style={{ color: 'var(--text-tertiary)' }}>Cost: ${product.cj_cost.toFixed(2)}</span>
                      <span className={`badge ${m >= 40 ? 'badge-success' : m >= 20 ? 'badge-warning' : 'badge-secondary'}`}
                        style={{ fontSize: '0.6875rem' }}>
                        {m}% margin
                      </span>
                      {!product.is_active && <span className="badge badge-secondary" style={{ fontSize: '0.6875rem' }}>Inactive</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem' }} onClick={() => openEdit(product)}>
                      Edit
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }} onClick={() => toggleActive(product)}>
                      {product.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', color: 'var(--error-500)' }} onClick={() => deleteProduct(product)}>
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Product Modal (Catalog Browser) */}
      {showCatalog && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--space-4)',
        }} onClick={() => setShowCatalog(false)}>
          <div className="card" style={{ maxWidth: '800px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
              <h5 style={{ margin: 0 }}>Add from CJ Catalog</h5>
              <button onClick={() => setShowCatalog(false)} className="btn btn-ghost btn-sm">X</button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); searchCatalog(); }}
              className="flex gap-3" style={{ marginBottom: 'var(--space-4)' }}>
              <input className="input" placeholder="Search products..." value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)} style={{ flex: 1 }} />
              <button type="submit" className="btn btn-primary btn-sm" disabled={catalogLoading}>
                {catalogLoading ? '...' : 'Search'}
              </button>
            </form>

            {catalogLoading ? (
              <div className="empty-state" style={{ padding: 'var(--space-6)' }}><div className="spinner" /></div>
            ) : catalogProducts.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                <div className="empty-state-desc">Search the CJ catalog to find products</div>
              </div>
            ) : (
              <div className="product-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                {catalogProducts.map(p => (
                  <div key={p.pid} className="product-card" style={{ fontSize: '0.8125rem' }}>
                    <div className="product-card-image" style={{ aspectRatio: '1' }}>
                      {p.productImage ? <img src={p.productImage} alt={p.productNameEn} /> : null}
                    </div>
                    <div style={{ padding: 'var(--space-3)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: 'var(--space-2)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {p.productNameEn}
                      </div>
                      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-2)' }}>
                        <span style={{ fontWeight: 700, color: 'var(--accent-500)' }}>${p.sellPrice?.toFixed(2)}</span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--success-700)' }}>
                          ~{margin(Math.round(p.sellPrice * 2.5 * 100) / 100, p.sellPrice)}% margin
                        </span>
                      </div>
                      <button className="btn btn-accent btn-sm" style={{ width: '100%', fontSize: '0.75rem' }}
                        onClick={() => addProduct(p)}>
                        Add to Store
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--space-4)',
        }} onClick={() => setEditingProduct(null)}>
          <div className="card" style={{ maxWidth: '700px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
              <h5 style={{ margin: 0 }}>Edit Product</h5>
              <button onClick={() => setEditingProduct(null)} className="btn btn-ghost btn-sm">X</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              {/* Left: Edit form */}
              <div>
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>
                    Title
                  </label>
                  <input className="input" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                </div>
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>
                    Description
                  </label>
                  <textarea className="input textarea" value={editDescription} onChange={e => setEditDescription(e.target.value)}
                    rows={4} placeholder="Write a compelling product description..." />
                </div>
                <div className="flex gap-3" style={{ marginBottom: 'var(--space-3)' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>
                      Price ($)
                    </label>
                    <input className="input" type="number" step="0.01" min="0" value={editPrice}
                      onChange={e => setEditPrice(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>
                      Compare At ($)
                    </label>
                    <input className="input" type="number" step="0.01" min="0" value={editCompareAt}
                      onChange={e => setEditCompareAt(e.target.value)} placeholder="Optional" />
                  </div>
                </div>

                {/* Margin Calculator */}
                <div style={{
                  padding: 'var(--space-3)', background: 'var(--surface-elevated)',
                  borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', fontSize: '0.8125rem',
                }}>
                  <div className="flex justify-between" style={{ marginBottom: 'var(--space-1)' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>CJ Cost</span>
                    <span>${editingProduct.cj_cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between" style={{ marginBottom: 'var(--space-1)' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Your Price</span>
                    <span>${parseFloat(editPrice || '0').toFixed(2)}</span>
                  </div>
                  <div style={{ height: '1px', background: 'var(--border)', margin: 'var(--space-2) 0' }} />
                  <div className="flex justify-between">
                    <span style={{ fontWeight: 700 }}>Profit</span>
                    <span style={{
                      fontWeight: 700,
                      color: (parseFloat(editPrice || '0') - editingProduct.cj_cost) > 0
                        ? 'var(--success-500)' : 'var(--error-500)',
                    }}>
                      ${(parseFloat(editPrice || '0') - editingProduct.cj_cost).toFixed(2)}
                      ({margin(parseFloat(editPrice || '0'), editingProduct.cj_cost)}%)
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={saving} style={{ flex: 1 }}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button className="btn btn-accent btn-sm" onClick={analyzePricing} disabled={analyzingPrice}>
                    {analyzingPrice ? '...' : 'AI Price Check'}
                  </button>
                </div>
              </div>

              {/* Right: AI Pricing Analysis */}
              <div>
                {analyzingPrice ? (
                  <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                    <div className="spinner" />
                    <p style={{ marginTop: 'var(--space-3)', fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                      Analyzing pricing...
                    </p>
                  </div>
                ) : pricingAnalysis ? (
                  <div className="fade-in">
                    <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-3)' }}>
                      <div className="score-ring" style={{
                        width: '56px', height: '56px',
                        borderColor: pricingAnalysis.margin_health.score >= 70 ? 'var(--success-500)' :
                          pricingAnalysis.margin_health.score >= 40 ? 'var(--warning-500)' : 'var(--error-500)',
                      }}>
                        <span className="score-ring-value" style={{ fontSize: '1.125rem' }}>
                          {pricingAnalysis.margin_health.score}
                        </span>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                          {pricingAnalysis.verdict?.replace(/_/g, ' ').toUpperCase()}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Margin Health</div>
                      </div>
                    </div>

                    {pricingAnalysis.recommended_range && (
                      <div style={{
                        padding: 'var(--space-3)', background: 'var(--surface-elevated)',
                        borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)', fontSize: '0.8125rem',
                      }}>
                        <div className="workspace-panel-label">Recommended Range</div>
                        <div className="flex justify-between" style={{ marginBottom: 'var(--space-1)' }}>
                          <span style={{ color: 'var(--text-tertiary)' }}>Floor</span>
                          <span>${pricingAnalysis.recommended_range.floor}</span>
                        </div>
                        <div className="flex justify-between" style={{ marginBottom: 'var(--space-1)' }}>
                          <span style={{ color: 'var(--accent-500)', fontWeight: 700 }}>Sweet Spot</span>
                          <span style={{ fontWeight: 700 }}>${pricingAnalysis.recommended_range.sweet_spot}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--text-tertiary)' }}>Ceiling</span>
                          <span>${pricingAnalysis.recommended_range.ceiling}</span>
                        </div>
                      </div>
                    )}

                    {pricingAnalysis.recommendation && (
                      <div className="coaching-note" style={{ fontSize: '0.8125rem' }}>
                        {pricingAnalysis.recommendation}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                      Click &quot;AI Price Check&quot; to get pricing recommendations
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
