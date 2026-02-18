'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface StoreData {
  name: string;
  description: string;
  slug: string;
  logo_url?: string;
  banner_url?: string;
  theme: { primary: string; bg: string; accent: string };
  tier: number;
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  compare_at_price?: number;
  images: string[];
  category?: string;
}

interface CartItem {
  product: Product;
  qty: number;
}

export default function PublicStorefront() {
  const params = useParams();
  const slug = params?.slug as string;

  const [store, setStore] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  // Checkout form
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [address, setAddress] = useState({ line1: '', city: '', state: '', zip: '', country: 'US' });
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/store/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then(data => {
        setStore(data.store);
        setProducts(data.products || []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product, qty: 1 }];
    });
    setSelectedProduct(null);
    setShowCart(true);
  }, []);

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty < 1) return removeFromCart(productId);
    setCart(prev => prev.map(i => i.product.id === productId ? { ...i, qty } : i));
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  const placeOrder = async () => {
    if (!customerName || !customerEmail || !address.line1 || !address.city || !address.zip) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/store/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_slug: slug,
          customer_email: customerEmail,
          customer_name: customerName,
          shipping_address: address,
          items: cart.map(i => ({ product_id: i.product.id, qty: i.qty })),
        }),
      });
      const data = await res.json();
      if (data.order) {
        setOrderNumber(data.order.order_number);
        setOrderPlaced(true);
        setCart([]);
      }
    } catch (err) {
      console.error('Order failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (notFound || !store) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div className="text-center">
          <h2>Store Not Found</h2>
          <p style={{ color: 'var(--text-tertiary)' }}>This store doesn&apos;t exist or isn&apos;t published yet.</p>
        </div>
      </div>
    );
  }

  const theme = store.theme || { primary: '#2563eb', bg: '#ffffff', accent: '#f59e0b' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* Store Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        padding: 'var(--space-4) var(--space-6)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(16px)',
      }}>
        <div className="flex items-center gap-3">
          {store.logo_url ? (
            <img src={store.logo_url} alt="" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '32px', height: '32px', borderRadius: 'var(--radius-sm)',
              background: theme.primary, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: '0.75rem',
            }}>
              {store.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>{store.name}</span>
        </div>

        <button
          className="btn btn-outline btn-sm"
          onClick={() => setShowCart(true)}
          style={{ position: 'relative' }}
        >
          Cart {cartCount > 0 && (
            <span style={{
              position: 'absolute', top: '-6px', right: '-6px',
              width: '20px', height: '20px', borderRadius: '50%',
              background: theme.primary, color: '#fff',
              fontSize: '0.6875rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {cartCount}
            </span>
          )}
        </button>
      </header>

      {/* Store Description */}
      {store.description && (
        <div style={{ padding: 'var(--space-6)', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>{store.description}</p>
        </div>
      )}

      {/* Product Grid */}
      <div style={{ padding: '0 var(--space-6) var(--space-12)', maxWidth: '1200px', margin: '0 auto' }}>
        {products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">Coming Soon</div>
            <div className="empty-state-desc">This store is setting up. Check back later!</div>
          </div>
        ) : (
          <div className="product-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {products.map(product => (
              <div key={product.id} className="product-card" onClick={() => setSelectedProduct(product)}>
                <div className="product-card-image">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.title} />
                  ) : (
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '2rem' }}>?</span>
                  )}
                </div>
                <div className="product-card-body">
                  <div className="product-card-title">{product.title}</div>
                  <div className="product-card-price">
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: theme.primary }}>
                      ${product.price.toFixed(2)}
                    </span>
                    {product.compare_at_price && product.compare_at_price > product.price && (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>
                        ${product.compare_at_price.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="product-card-actions">
                  <button
                    className="btn btn-sm"
                    style={{ flex: 1, background: theme.primary, color: '#fff', fontWeight: 700 }}
                    onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Powered by bizwin.lol (Tier 1 only) */}
      {store.tier < 2 && (
        <div style={{
          textAlign: 'center', padding: 'var(--space-4)',
          fontSize: '0.75rem', color: 'var(--text-tertiary)',
          borderTop: '1px solid var(--border)',
        }}>
          Powered by bizwin.lol
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--space-4)',
        }} onClick={() => setSelectedProduct(null)}>
          <div className="card" style={{ maxWidth: '600px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
              <h5 style={{ margin: 0 }}>Product Details</h5>
              <button onClick={() => setSelectedProduct(null)} className="btn btn-ghost btn-sm">X</button>
            </div>

            {selectedProduct.images?.[0] && (
              <div style={{
                width: '100%', aspectRatio: '4/3', borderRadius: 'var(--radius-md)',
                overflow: 'hidden', marginBottom: 'var(--space-4)', background: 'var(--neutral-200)',
              }}>
                <img src={selectedProduct.images[0]} alt={selectedProduct.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}

            <h4 style={{ marginBottom: 'var(--space-2)' }}>{selectedProduct.title}</h4>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: theme.primary, marginBottom: 'var(--space-4)' }}>
              ${selectedProduct.price.toFixed(2)}
              {selectedProduct.compare_at_price && selectedProduct.compare_at_price > selectedProduct.price && (
                <span style={{ fontSize: '1rem', color: 'var(--text-tertiary)', textDecoration: 'line-through', marginLeft: 'var(--space-2)' }}>
                  ${selectedProduct.compare_at_price.toFixed(2)}
                </span>
              )}
            </div>

            {selectedProduct.description && (
              <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.6 }}>
                {selectedProduct.description}
              </p>
            )}

            <button
              className="btn"
              style={{ width: '100%', background: theme.primary, color: '#fff', fontWeight: 700 }}
              onClick={() => addToCart(selectedProduct)}
            >
              Add to Cart
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.5)',
        }} onClick={() => setShowCart(false)}>
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0,
            width: '400px', maxWidth: '90vw',
            background: 'var(--surface)', borderLeft: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: 'var(--space-4) var(--space-5)',
              borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h5 style={{ margin: 0 }}>Cart ({cartCount})</h5>
              <button onClick={() => setShowCart(false)} className="btn btn-ghost btn-sm">X</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>
                  Your cart is empty
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {cart.map(item => (
                    <div key={item.product.id} style={{
                      display: 'flex', gap: 'var(--space-3)', alignItems: 'center',
                      padding: 'var(--space-3)', background: 'var(--surface-elevated)',
                      borderRadius: 'var(--radius-md)',
                    }}>
                      {item.product.images?.[0] && (
                        <img src={item.product.images[0]} alt=""
                          style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600 }} className="truncate">{item.product.title}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>${item.product.price.toFixed(2)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }}
                          onClick={() => updateQty(item.product.id, item.qty - 1)}>-</button>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }}
                          onClick={() => updateQty(item.product.id, item.qty + 1)}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ padding: 'var(--space-4) var(--space-5)', borderTop: '1px solid var(--border)' }}>
                <div className="flex justify-between" style={{ marginBottom: 'var(--space-3)', fontSize: '1.125rem', fontWeight: 700 }}>
                  <span>Total</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <button
                  className="btn"
                  style={{ width: '100%', background: theme.primary, color: '#fff', fontWeight: 700 }}
                  onClick={() => { setShowCart(false); setShowCheckout(true); }}
                >
                  Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && !orderPlaced && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--space-4)',
        }} onClick={() => setShowCheckout(false)}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
              <h5 style={{ margin: 0 }}>Checkout</h5>
              <button onClick={() => setShowCheckout(false)} className="btn btn-ghost btn-sm">X</button>
            </div>

            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>
                Full Name
              </label>
              <input className="input" value={customerName} onChange={e => setCustomerName(e.target.value)} />
            </div>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>
                Email
              </label>
              <input className="input" type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
            </div>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>
                Address
              </label>
              <input className="input" value={address.line1} onChange={e => setAddress(a => ({ ...a, line1: e.target.value }))}
                placeholder="Street address" style={{ marginBottom: 'var(--space-2)' }} />
              <div className="flex gap-2">
                <input className="input" value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))}
                  placeholder="City" style={{ flex: 2 }} />
                <input className="input" value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))}
                  placeholder="State" style={{ flex: 1 }} />
                <input className="input" value={address.zip} onChange={e => setAddress(a => ({ ...a, zip: e.target.value }))}
                  placeholder="ZIP" style={{ flex: 1 }} />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)', marginTop: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              {cart.map(item => (
                <div key={item.product.id} className="flex justify-between" style={{ fontSize: '0.875rem', padding: 'var(--space-1) 0' }}>
                  <span>{item.product.title} x{item.qty}</span>
                  <span>${(item.product.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between" style={{ fontWeight: 700, fontSize: '1.125rem', marginTop: 'var(--space-3)' }}>
                <span>Total</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              className="btn"
              style={{ width: '100%', background: theme.primary, color: '#fff', fontWeight: 700 }}
              onClick={placeOrder}
              disabled={submitting || !customerName || !customerEmail || !address.line1}
            >
              {submitting ? 'Placing Order...' : `Place Order - $${cartTotal.toFixed(2)}`}
            </button>
          </div>
        </div>
      )}

      {/* Order Confirmation */}
      {orderPlaced && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--space-4)',
        }}>
          <div className="card text-center" style={{ maxWidth: '400px', width: '100%' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>&#10003;</div>
            <h4>Order Placed!</h4>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
              Thank you for your order.
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.125rem', marginBottom: 'var(--space-4)' }}>
              {orderNumber}
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
              A confirmation has been sent to {customerEmail}
            </p>
            <button className="btn btn-primary" onClick={() => { setOrderPlaced(false); setShowCheckout(false); }}>
              Continue Shopping
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
