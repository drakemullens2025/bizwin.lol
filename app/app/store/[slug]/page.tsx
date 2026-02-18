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

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return `${parseInt(h.substring(0, 2), 16)}, ${parseInt(h.substring(2, 4), 16)}, ${parseInt(h.substring(4, 6), 16)}`;
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
  const [imageIndex, setImageIndex] = useState(0);

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
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0a0a', color: '#fff',
      }}>
        <div style={{
          width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.15)',
          borderTopColor: '#fff', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (notFound || !store) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0a0a', color: '#fff',
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>Store Not Found</h2>
          <p style={{ color: '#888' }}>This store doesn&apos;t exist or isn&apos;t published yet.</p>
        </div>
      </div>
    );
  }

  const theme = store.theme || { primary: '#2563eb', bg: '#ffffff', accent: '#f59e0b' };
  const rgb = hexToRgb(theme.primary);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fafafa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#111',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        .sf-card {
          background: #fff; border-radius: 12px; overflow: hidden;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          cursor: pointer; position: relative;
        }
        .sf-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.1); }
        .sf-card img { transition: transform 0.4s ease; }
        .sf-card:hover img { transform: scale(1.05); }
        .sf-btn {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 12px 24px; border-radius: 8px; font-weight: 600;
          font-size: 0.9375rem; border: none; cursor: pointer;
          transition: all 0.2s ease; letter-spacing: -0.01em;
        }
        .sf-btn-primary { background: rgb(${rgb}); color: #fff; }
        .sf-btn-primary:hover { box-shadow: 0 4px 16px rgba(${rgb}, 0.35); transform: translateY(-1px); }
        .sf-btn-outline { background: transparent; color: #333; border: 1.5px solid #ddd; }
        .sf-btn-outline:hover { border-color: rgb(${rgb}); color: rgb(${rgb}); }
        .sf-input {
          width: 100%; padding: 12px 16px; border: 1.5px solid #e5e5e5;
          border-radius: 8px; font-size: 0.9375rem; background: #fff;
          transition: border-color 0.2s; outline: none; color: #111;
          font-family: inherit;
        }
        .sf-input:focus { border-color: rgb(${rgb}); box-shadow: 0 0 0 3px rgba(${rgb}, 0.1); }
        .sf-badge {
          display: inline-block; padding: 4px 10px; border-radius: 20px;
          font-size: 0.75rem; font-weight: 600; letter-spacing: 0.02em;
        }
      `}</style>

      {/* NAV */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        padding: '0 clamp(16px, 4vw, 48px)',
      }}>
        <div style={{
          maxWidth: '1280px', margin: '0 auto',
          height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {store.logo_url ? (
              <img src={store.logo_url} alt="" style={{
                width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover',
              }} />
            ) : (
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: `linear-gradient(135deg, rgb(${rgb}), ${theme.accent || theme.primary})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: '0.875rem',
              }}>
                {store.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span style={{ fontWeight: 700, fontSize: '1.125rem', letterSpacing: '-0.02em' }}>
              {store.name}
            </span>
          </div>

          <button
            onClick={() => setShowCart(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '8px',
              background: cartCount > 0 ? `rgba(${rgb}, 0.08)` : 'transparent',
              border: `1.5px solid ${cartCount > 0 ? `rgba(${rgb}, 0.25)` : '#e5e5e5'}`,
              cursor: 'pointer', transition: 'all 0.2s',
              color: cartCount > 0 ? `rgb(${rgb})` : '#555',
              fontWeight: 600, fontSize: '0.875rem',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            {cartCount > 0 && <span>{cartCount}</span>}
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        padding: 'clamp(48px, 8vw, 96px) clamp(16px, 4vw, 48px) clamp(32px, 5vw, 64px)',
        textAlign: 'center',
        background: store.banner_url
          ? `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.2)), url(${store.banner_url}) center/cover`
          : `linear-gradient(135deg, rgba(${rgb}, 0.04) 0%, rgba(${rgb}, 0.01) 100%)`,
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, letterSpacing: '-0.03em',
            lineHeight: 1.1, margin: '0 0 16px',
            color: store.banner_url ? '#fff' : '#111',
          }}>
            {store.name}
          </h1>
          {store.description && (
            <p style={{
              fontSize: 'clamp(1rem, 2vw, 1.125rem)', lineHeight: 1.6,
              color: store.banner_url ? 'rgba(255,255,255,0.85)' : '#666',
              margin: '0 0 24px', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto',
            }}>
              {store.description}
            </p>
          )}
          {products.length > 0 && (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <span className="sf-badge" style={{
                background: `rgba(${rgb}, 0.1)`, color: `rgb(${rgb})`,
              }}>
                {products.length} {products.length === 1 ? 'Product' : 'Products'}
              </span>
              {products.some(p => p.compare_at_price && p.compare_at_price > p.price) && (
                <span className="sf-badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                  Sale Items Available
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* PRODUCTS */}
      <section style={{
        padding: '0 clamp(16px, 4vw, 48px) clamp(48px, 6vw, 80px)',
        maxWidth: '1280px', margin: '0 auto',
      }}>
        {products.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 24px',
            background: '#fff', borderRadius: '16px',
            border: '1px solid #eee',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '16px', opacity: 0.3 }}>&#9733;</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Coming Soon</h3>
            <p style={{ color: '#888', maxWidth: '320px', margin: '0 auto' }}>
              This store is getting ready. Check back soon for new products.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '24px',
          }}>
            {products.map((product, i) => (
              <div
                key={product.id}
                className="sf-card"
                onClick={() => { setSelectedProduct(product); setImageIndex(0); }}
                style={{ animationDelay: `${i * 60}ms`, animation: 'fadeUp 0.5s ease both' }}
              >
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <div style={{
                    position: 'absolute', top: '12px', left: '12px', zIndex: 2,
                    padding: '4px 10px', borderRadius: '6px',
                    background: '#ef4444', color: '#fff',
                    fontSize: '0.75rem', fontWeight: 700,
                  }}>
                    {Math.round((1 - product.price / product.compare_at_price) * 100)}% OFF
                  </div>
                )}
                <div style={{
                  aspectRatio: '1', overflow: 'hidden', background: '#f5f5f5',
                }}>
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]} alt={product.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '3rem',
                    }}>&#9633;</div>
                  )}
                </div>
                <div style={{ padding: '16px' }}>
                  <h3 style={{
                    fontSize: '0.9375rem', fontWeight: 600, marginBottom: '8px',
                    lineHeight: 1.3, letterSpacing: '-0.01em',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                    overflow: 'hidden',
                  }}>
                    {product.title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '1.125rem', fontWeight: 800, color: `rgb(${rgb})` }}>
                      ${product.price.toFixed(2)}
                    </span>
                    {product.compare_at_price && product.compare_at_price > product.price && (
                      <span style={{ fontSize: '0.8125rem', color: '#aaa', textDecoration: 'line-through' }}>
                        ${product.compare_at_price.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <button
                    className="sf-btn sf-btn-primary"
                    style={{ width: '100%', padding: '10px 16px', fontSize: '0.875rem' }}
                    onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer style={{
        padding: '32px clamp(16px, 4vw, 48px)',
        textAlign: 'center', borderTop: '1px solid #eee',
        marginTop: '48px',
      }}>
        {store.tier < 2 && (
          <p style={{ fontSize: '0.75rem', color: '#bbb', margin: 0 }}>
            Powered by <span style={{ fontWeight: 600, color: '#999' }}>bizwin.lol</span>
          </p>
        )}
      </footer>

      {/* PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }} onClick={() => setSelectedProduct(null)}>
          <div
            style={{
              background: '#fff', borderRadius: '16px', maxWidth: '560px', width: '100%',
              maxHeight: '88vh', overflowY: 'auto',
              boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
              animation: 'fadeUp 0.3s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Image */}
            {selectedProduct.images?.length > 0 && (
              <div style={{ position: 'relative' }}>
                <div style={{
                  aspectRatio: '4/3', overflow: 'hidden', background: '#f5f5f5',
                  borderRadius: '16px 16px 0 0',
                }}>
                  <img
                    src={selectedProduct.images[imageIndex] || selectedProduct.images[0]}
                    alt={selectedProduct.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                {selectedProduct.images.length > 1 && (
                  <div style={{
                    display: 'flex', gap: '6px', padding: '12px 24px',
                    overflowX: 'auto',
                  }}>
                    {selectedProduct.images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setImageIndex(i)}
                        style={{
                          width: '48px', height: '48px', borderRadius: '8px',
                          overflow: 'hidden', border: i === imageIndex ? `2px solid rgb(${rgb})` : '2px solid transparent',
                          padding: 0, cursor: 'pointer', flexShrink: 0, background: '#f5f5f5',
                        }}
                      >
                        <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Detail */}
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0, flex: 1, paddingRight: '16px' }}>
                  {selectedProduct.title}
                </h3>
                <button
                  onClick={() => setSelectedProduct(null)}
                  style={{
                    background: '#f5f5f5', border: 'none', borderRadius: '50%',
                    width: '32px', height: '32px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem', color: '#666', flexShrink: 0,
                  }}
                >&#x2715;</button>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: `rgb(${rgb})` }}>
                  ${selectedProduct.price.toFixed(2)}
                </span>
                {selectedProduct.compare_at_price && selectedProduct.compare_at_price > selectedProduct.price && (
                  <>
                    <span style={{ fontSize: '1.125rem', color: '#aaa', textDecoration: 'line-through' }}>
                      ${selectedProduct.compare_at_price.toFixed(2)}
                    </span>
                    <span className="sf-badge" style={{ background: '#fef2f2', color: '#dc2626' }}>
                      Save ${(selectedProduct.compare_at_price - selectedProduct.price).toFixed(2)}
                    </span>
                  </>
                )}
              </div>

              {selectedProduct.description && (
                <p style={{
                  fontSize: '0.9375rem', color: '#555', lineHeight: 1.7,
                  marginBottom: '24px',
                }}>
                  {selectedProduct.description}
                </p>
              )}

              <button
                className="sf-btn sf-btn-primary"
                style={{ width: '100%' }}
                onClick={() => addToCart(selectedProduct)}
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CART DRAWER */}
      {showCart && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        }} onClick={() => setShowCart(false)}>
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0,
            width: '420px', maxWidth: '92vw',
            background: '#fff',
            display: 'flex', flexDirection: 'column',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.1)',
            animation: 'fadeUp 0.25s ease',
          }} onClick={e => e.stopPropagation()}>
            {/* Cart header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid #f0f0f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Your Cart
                {cartCount > 0 && <span style={{ color: '#999', fontWeight: 500 }}> ({cartCount})</span>}
              </h3>
              <button
                onClick={() => setShowCart(false)}
                style={{
                  background: '#f5f5f5', border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.875rem', color: '#666',
                }}
              >&#x2715;</button>
            </div>

            {/* Cart items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 16px', color: '#aaa' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 16px', opacity: 0.4 }}>
                    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                  </svg>
                  <p style={{ margin: 0, fontWeight: 500 }}>Your cart is empty</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {cart.map(item => (
                    <div key={item.product.id} style={{
                      display: 'flex', gap: '14px', alignItems: 'center',
                    }}>
                      <div style={{
                        width: '64px', height: '64px', borderRadius: '10px',
                        overflow: 'hidden', background: '#f5f5f5', flexShrink: 0,
                      }}>
                        {item.product.images?.[0] ? (
                          <img src={item.product.images[0]} alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ddd' }}>&#9633;</div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.875rem', fontWeight: 600, marginBottom: '4px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{item.product.title}</div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: `rgb(${rgb})` }}>
                          ${(item.product.price * item.qty).toFixed(2)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <button
                          onClick={() => updateQty(item.product.id, item.qty - 1)}
                          style={{
                            width: '30px', height: '30px', borderRadius: '6px',
                            border: '1px solid #e5e5e5', background: '#fafafa',
                            cursor: 'pointer', fontSize: '1rem', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', color: '#555',
                          }}
                        >&minus;</button>
                        <span style={{
                          width: '32px', textAlign: 'center',
                          fontSize: '0.875rem', fontWeight: 600,
                        }}>{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.product.id, item.qty + 1)}
                          style={{
                            width: '30px', height: '30px', borderRadius: '6px',
                            border: '1px solid #e5e5e5', background: '#fafafa',
                            cursor: 'pointer', fontSize: '1rem', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', color: '#555',
                          }}
                        >+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart footer */}
            {cart.length > 0 && (
              <div style={{ padding: '20px 24px', borderTop: '1px solid #f0f0f0' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: '16px',
                }}>
                  <span style={{ fontSize: '0.9375rem', color: '#666' }}>Subtotal</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>${cartTotal.toFixed(2)}</span>
                </div>
                <button
                  className="sf-btn sf-btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => { setShowCart(false); setShowCheckout(true); }}
                >
                  Checkout &rarr;
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {showCheckout && !orderPlaced && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }} onClick={() => setShowCheckout(false)}>
          <div
            style={{
              background: '#fff', borderRadius: '16px', maxWidth: '480px', width: '100%',
              maxHeight: '88vh', overflowY: 'auto',
              boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
              padding: '32px',
              animation: 'fadeUp 0.3s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Checkout</h3>
              <button
                onClick={() => setShowCheckout(false)}
                style={{
                  background: '#f5f5f5', border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.875rem', color: '#666',
                }}
              >&#x2715;</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input className="sf-input" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '6px' }}>
                  Email
                </label>
                <input className="sf-input" type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '6px' }}>
                  Shipping Address
                </label>
                <input className="sf-input" value={address.line1} onChange={e => setAddress(a => ({ ...a, line1: e.target.value }))}
                  placeholder="Street address" style={{ marginBottom: '8px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
                  <input className="sf-input" value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))}
                    placeholder="City" />
                  <input className="sf-input" value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))}
                    placeholder="State" />
                  <input className="sf-input" value={address.zip} onChange={e => setAddress(a => ({ ...a, zip: e.target.value }))}
                    placeholder="ZIP" />
                </div>
              </div>
            </div>

            {/* Order summary */}
            <div style={{
              background: '#fafafa', borderRadius: '10px', padding: '16px',
              marginBottom: '20px',
            }}>
              {cart.map(item => (
                <div key={item.product.id} style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: '0.875rem', padding: '4px 0',
                }}>
                  <span style={{ color: '#555' }}>{item.product.title} <span style={{ color: '#aaa' }}>x{item.qty}</span></span>
                  <span style={{ fontWeight: 600 }}>${(item.product.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontWeight: 700, fontSize: '1.125rem',
                marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e5e5',
              }}>
                <span>Total</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              className="sf-btn sf-btn-primary"
              style={{ width: '100%', opacity: submitting || !customerName || !customerEmail || !address.line1 ? 0.5 : 1 }}
              onClick={placeOrder}
              disabled={submitting || !customerName || !customerEmail || !address.line1}
            >
              {submitting ? 'Placing Order...' : `Pay $${cartTotal.toFixed(2)}`}
            </button>
          </div>
        </div>
      )}

      {/* ORDER CONFIRMATION */}
      {orderPlaced && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', maxWidth: '420px', width: '100%',
            padding: '48px 32px', textAlign: 'center',
            boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
            animation: 'fadeUp 0.3s ease',
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: `rgba(${rgb}, 0.1)`, color: `rgb(${rgb})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: '1.75rem',
            }}>&#10003;</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.02em' }}>
              Order Placed
            </h3>
            <p style={{ color: '#666', marginBottom: '4px' }}>Thank you for your purchase.</p>
            <p style={{
              fontFamily: 'monospace', fontWeight: 700, fontSize: '1.125rem',
              margin: '16px 0',
              padding: '10px 16px', background: '#fafafa', borderRadius: '8px',
              display: 'inline-block',
            }}>
              {orderNumber}
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#999', marginBottom: '24px' }}>
              Confirmation sent to {customerEmail}
            </p>
            <button
              className="sf-btn sf-btn-primary"
              onClick={() => { setOrderPlaced(false); setShowCheckout(false); }}
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
