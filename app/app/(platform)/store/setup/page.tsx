'use client';

import { useUser } from '@stackframe/stack';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface Store {
  id: string;
  slug: string;
  store_name: string;
  description: string;
  theme: { primary: string; bg: string; accent: string };
  is_published: boolean;
  logo_url?: string;
  banner_url?: string;
}

interface StoreCritique {
  brand_score: number;
  niche_clarity: { score: number; assessment: string };
  name_critique: { score: number; memorable: boolean; professional: boolean; feedback: string };
  description_critique: { score: number; feedback: string };
  strengths: string[];
  improvements: string[];
  overall_verdict: string;
  recommendation: string;
}

export default function StoreSetupPage() {
  const user = useUser({ or: 'redirect' });
  const searchParams = useSearchParams();
  const storeIdParam = searchParams.get('store_id');
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [critiquing, setCritiquing] = useState(false);
  const [critique, setCritique] = useState<StoreCritique | null>(null);
  const [step, setStep] = useState(0);

  // Form state
  const [storeName, setStoreName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [accentColor, setAccentColor] = useState('#f59e0b');
  const [slugError, setSlugError] = useState('');

  useEffect(() => {
    if (!user) return;
    const storeUrl = storeIdParam ? `/api/store?store_id=${storeIdParam}` : '/api/store';
    fetch(storeUrl, { headers: { 'x-user-id': user.id } })
      .then(r => r.json())
      .then(data => {
        if (data.store) {
          setStore(data.store);
          setStoreName(data.store.store_name);
          setSlug(data.store.slug);
          setDescription(data.store.description || '');
          setPrimaryColor(data.store.theme?.primary || '#2563eb');
          setAccentColor(data.store.theme?.accent || '#f59e0b');
          setStep(3); // Jump to edit mode
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
  };

  const handleNameChange = (name: string) => {
    setStoreName(name);
    if (!store) {
      setSlug(generateSlug(name));
    }
  };

  const handleSlugChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(cleaned);
    setSlugError('');
    if (cleaned.length > 0 && cleaned.length < 3) {
      setSlugError('Slug must be at least 3 characters');
    }
  };

  const createStore = async () => {
    if (!user || !storeName.trim() || !slug.trim()) return;
    setSaving(true);

    try {
      const res = await fetch('/api/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-email': user.primaryEmail || '',
        },
        body: JSON.stringify({
          slug,
          store_name: storeName.trim(),
          description: description.trim(),
          theme: { primary: primaryColor, bg: '#ffffff', accent: accentColor },
        }),
      });
      const data = await res.json();
      if (data.store) {
        setStore(data.store);
        setStep(3);
      } else if (data.error) {
        setSlugError(data.error);
      }
    } catch (err) {
      console.error('Create store failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateStore = async () => {
    if (!user || !store) return;
    setSaving(true);

    try {
      const res = await fetch('/api/store', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({
          store_id: store.id,
          store_name: storeName.trim(),
          description: description.trim(),
          theme: { primary: primaryColor, bg: '#ffffff', accent: accentColor },
        }),
      });
      const data = await res.json();
      if (data.store) setStore(data.store);
    } catch (err) {
      console.error('Update store failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    if (!user || !store) return;
    setSaving(true);

    try {
      const res = await fetch('/api/store', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ store_id: store.id, is_published: !store.is_published }),
      });
      const data = await res.json();
      if (data.store) setStore(data.store);
    } catch (err) {
      console.error('Toggle publish failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const runCritique = async () => {
    setCritiquing(true);
    setCritique(null);

    try {
      const res = await fetch('/api/ai/store-critic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_name: storeName,
          description,
          products: [],
          theme: { primary: primaryColor, accent: accentColor },
        }),
      });
      const data = await res.json();
      if (data.success) setCritique(data.analysis);
    } catch (err) {
      console.error('Critique failed:', err);
    } finally {
      setCritiquing(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const steps = ['Name & URL', 'Description', 'Theme', 'Review'];

  return (
    <div>
      <div className="platform-topbar">
        <div>
          <h4 style={{ margin: 0, fontSize: '1.125rem' }}>
            {store ? 'Store Settings' : 'Create Your Store'}
          </h4>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
            {store ? (
              <a
                href={`/store/${store.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent-500)', textDecoration: 'none' }}
                onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
              >
                bizwin.lol/store/{store.slug} &#8599;
              </a>
            ) : 'Set up your branded storefront'}
          </p>
        </div>
        {store && (
          <div className="flex items-center gap-3">
            <span className={`badge ${store.is_published ? 'badge-success' : 'badge-warning'}`}>
              {store.is_published ? 'Published' : 'Draft'}
            </span>
            <button className="btn btn-outline btn-sm" onClick={togglePublish} disabled={saving}>
              {store.is_published ? 'Unpublish' : 'Publish'}
            </button>
          </div>
        )}
      </div>

      <div className="platform-content">
        {/* Step Indicator (for new stores) */}
        {!store && (
          <div className="flex items-center gap-2" style={{ marginBottom: 'var(--space-8)' }}>
            {steps.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <button
                  onClick={() => i <= step ? setStep(i) : null}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8125rem', fontWeight: 700,
                    background: i <= step ? 'var(--primary-500)' : 'var(--neutral-200)',
                    color: i <= step ? 'white' : 'var(--text-tertiary)',
                    cursor: i <= step ? 'pointer' : 'default',
                    transition: 'all var(--transition-base)',
                  }}
                >
                  {i + 1}
                </button>
                <span style={{
                  fontSize: '0.8125rem', fontWeight: i === step ? 600 : 400,
                  color: i === step ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}>
                  {label}
                </span>
                {i < steps.length - 1 && (
                  <div style={{
                    width: '40px', height: '2px', margin: '0 var(--space-2)',
                    background: i < step ? 'var(--primary-500)' : 'var(--neutral-300)',
                  }} />
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: store ? '1fr 1fr' : '1fr', gap: 'var(--space-6)', maxWidth: store ? '100%' : '640px' }}>
          {/* Form */}
          <div>
            {/* Step 0: Name & Slug */}
            {(step === 0 || store) && (
              <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                <h5 style={{ marginBottom: 'var(--space-4)' }}>Store Identity</h5>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-2)' }}>
                    Store Name
                  </label>
                  <input
                    className="input"
                    value={storeName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="My Awesome Store"
                    maxLength={60}
                  />
                </div>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-2)' }}>
                    Store URL
                  </label>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                      /store/
                    </span>
                    <input
                      className="input"
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="my-store"
                      maxLength={40}
                      disabled={!!store}
                    />
                  </div>
                  {slugError && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--error-500)', marginTop: 'var(--space-1)' }}>{slugError}</p>
                  )}
                </div>
                {!store && (
                  <button className="btn btn-primary btn-sm" onClick={() => setStep(1)} disabled={!storeName.trim() || slug.length < 3}>
                    Next
                  </button>
                )}
              </div>
            )}

            {/* Step 1: Description */}
            {(step >= 1 || store) && (
              <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                <h5 style={{ marginBottom: 'var(--space-4)' }}>Description</h5>
                <textarea
                  className="input textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell customers what your store is about. What niche do you serve? What makes you different?"
                  maxLength={500}
                  rows={4}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                  {description.length}/500
                </div>
                {!store && step === 1 && (
                  <button className="btn btn-primary btn-sm" onClick={() => setStep(2)} style={{ marginTop: 'var(--space-3)' }}>
                    Next
                  </button>
                )}
              </div>
            )}

            {/* Step 2: Theme */}
            {(step >= 2 || store) && (
              <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                <h5 style={{ marginBottom: 'var(--space-4)' }}>Theme Colors</h5>
                <div className="flex gap-6">
                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-2)' }}>
                      Primary
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        style={{ width: '48px', height: '48px', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: 'none' }}
                      />
                      <span style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                        {primaryColor}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-2)' }}>
                      Accent
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        style={{ width: '48px', height: '48px', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: 'none' }}
                      />
                      <span style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                        {accentColor}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Theme Preview */}
                <div style={{
                  marginTop: 'var(--space-4)', padding: 'var(--space-4)',
                  background: '#ffffff', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)' }}>
                    Preview
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: primaryColor }} />
                    <span style={{ fontWeight: 700, color: '#111', fontSize: '0.875rem' }}>{storeName || 'Store Name'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <div style={{ padding: '4px 12px', borderRadius: '4px', background: primaryColor, color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>
                      Shop Now
                    </div>
                    <div style={{ padding: '4px 12px', borderRadius: '4px', background: accentColor, color: '#111', fontSize: '0.75rem', fontWeight: 600 }}>
                      Sale
                    </div>
                  </div>
                </div>

                {!store && step === 2 && (
                  <button className="btn btn-primary btn-sm" onClick={() => setStep(3)} style={{ marginTop: 'var(--space-3)' }}>
                    Review
                  </button>
                )}
              </div>
            )}

            {/* Step 3: Review / Actions */}
            {(step >= 3) && (
              <div className="card">
                {!store ? (
                  <>
                    <h5 style={{ marginBottom: 'var(--space-4)' }}>Ready to Launch</h5>
                    <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.875rem' }}>
                        <strong>{storeName}</strong> at /store/{slug}
                      </div>
                      {description && (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
                          {description}
                        </div>
                      )}
                    </div>
                    <button className="btn btn-accent" onClick={createStore} disabled={saving} style={{ width: '100%' }}>
                      {saving ? 'Creating...' : 'Create Store'}
                    </button>
                  </>
                ) : (
                  <>
                    <h5 style={{ marginBottom: 'var(--space-4)' }}>Actions</h5>
                    <div className="flex flex-col gap-3">
                      <button className="btn btn-primary btn-sm" onClick={updateStore} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button className="btn btn-accent btn-sm" onClick={runCritique} disabled={critiquing}>
                        {critiquing ? 'AI Analyzing...' : 'AI Store Critique'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* AI Critique Panel (shown when store exists) */}
          {store && (
            <div>
              {critiquing ? (
                <div className="card">
                  <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                    <div className="spinner" />
                    <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-tertiary)' }}>
                      AI is evaluating your store...
                    </p>
                  </div>
                </div>
              ) : critique ? (
                <div className="card fade-in">
                  <div className="flex items-center gap-4" style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="score-ring" style={{
                      borderColor: critique.brand_score >= 70 ? 'var(--success-500)' :
                        critique.brand_score >= 40 ? 'var(--warning-500)' : 'var(--error-500)'
                    }}>
                      <span className="score-ring-value">{critique.brand_score}</span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 'var(--space-1)' }}>
                        Brand Score
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                        {critique.overall_verdict?.replace(/_/g, ' ').toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Sub-scores */}
                  <div className="score-bar-container" style={{ marginBottom: 'var(--space-4)' }}>
                    {[
                      { label: 'Store Name', score: critique.name_critique?.score },
                      { label: 'Description', score: critique.description_critique?.score },
                      { label: 'Niche Clarity', score: critique.niche_clarity?.score },
                    ].map(item => (
                      <div key={item.label} className="score-bar-row">
                        <div className="score-bar-label">{item.label}</div>
                        <div className="score-bar">
                          <div className="score-bar-fill" style={{ width: `${item.score || 0}%` }} />
                        </div>
                        <div className="score-bar-value">{item.score || 0}</div>
                      </div>
                    ))}
                  </div>

                  {critique.recommendation && (
                    <div className="coaching-note" style={{ marginBottom: 'var(--space-4)' }}>
                      {critique.recommendation}
                    </div>
                  )}

                  {critique.strengths?.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-3)' }}>
                      <div className="workspace-panel-label">Strengths</div>
                      <div className="flex flex-wrap">
                        {critique.strengths.map((s, i) => (
                          <span key={i} className="eval-tag eval-tag-strength">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {critique.improvements?.length > 0 && (
                    <div>
                      <div className="workspace-panel-label">Improvements</div>
                      <div className="flex flex-wrap">
                        {critique.improvements.map((s, i) => (
                          <span key={i} className="eval-tag eval-tag-gap">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="card">
                  <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                    <div className="empty-state-icon" style={{ fontSize: '2rem' }}>AI</div>
                    <div className="empty-state-title">Store Critique</div>
                    <div className="empty-state-desc">
                      Click &quot;AI Store Critique&quot; to get feedback on your store name, description, and branding.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
