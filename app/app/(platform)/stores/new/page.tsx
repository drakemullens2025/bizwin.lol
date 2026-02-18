'use client';

import { useUser } from '@stackframe/stack';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { storeTemplates, StoreTemplate } from '@/data/store-templates';

type Step = 1 | 2 | 3 | 4;

export default function NewStorePage() {
  const user = useUser();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<StoreTemplate | null>(null);
  const [storeName, setStoreName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [themePrimary, setThemePrimary] = useState('#2563eb');
  const [themeAccent, setThemeAccent] = useState('#f59e0b');
  const [themeBg, setThemeBg] = useState('#ffffff');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 40);
  }

  function handleNameChange(name: string) {
    setStoreName(name);
    setSlug(generateSlug(name));
  }

  function selectTemplate(template: StoreTemplate) {
    setSelectedTemplate(template);
    setThemePrimary(template.theme.primary);
    setThemeAccent(template.theme.accent);
    setThemeBg(template.theme.bg);
  }

  async function handleCreate() {
    if (!user?.id) return;
    setCreating(true);
    setError('');

    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          store_name: storeName,
          slug,
          description,
          template_id: selectedTemplate?.id || null,
          theme: {
            primary: themePrimary,
            bg: themeBg,
            accent: themeAccent,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create store');

      router.push('/stores');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create store');
    } finally {
      setCreating(false);
    }
  }

  const canProceedStep2 = selectedTemplate !== null;
  const canProceedStep3 = storeName.trim().length >= 2 && slug.length >= 3;

  return (
    <div style={{ padding: 'var(--space-8)', maxWidth: '900px' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
        Create New Store
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
        Step {step} of 4
      </p>

      {/* Progress bar */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-2)',
        marginBottom: 'var(--space-8)',
      }}>
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              background: s <= step ? 'var(--accent-500)' : 'var(--border-primary)',
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>

      {error && (
        <div style={{
          padding: 'var(--space-4)',
          background: 'var(--error-bg, #fef2f2)',
          color: 'var(--error, #dc2626)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-4)',
        }}>
          {error}
        </div>
      )}

      {/* Step 1: Choose Template */}
      {step === 1 && (
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
            Choose a Template
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 'var(--space-4)',
          }}>
            {storeTemplates.map((template) => (
              <div
                key={template.id}
                onClick={() => selectTemplate(template)}
                style={{
                  padding: 'var(--space-5)',
                  border: selectedTemplate?.id === template.id
                    ? '2px solid var(--accent-500)'
                    : '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  background: selectedTemplate?.id === template.id
                    ? 'var(--surface-secondary)'
                    : 'var(--surface-primary)',
                  transition: 'all 0.15s',
                }}
              >
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
                  {template.name}
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                  {template.description}
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <div
                    title="Primary"
                    style={{
                      width: '28px', height: '28px', borderRadius: 'var(--radius-sm)',
                      background: template.theme.primary,
                      border: '1px solid var(--border-primary)',
                    }}
                  />
                  <div
                    title="Background"
                    style={{
                      width: '28px', height: '28px', borderRadius: 'var(--radius-sm)',
                      background: template.theme.bg,
                      border: '1px solid var(--border-primary)',
                    }}
                  />
                  <div
                    title="Accent"
                    style={{
                      width: '28px', height: '28px', borderRadius: 'var(--radius-sm)',
                      background: template.theme.accent,
                      border: '1px solid var(--border-primary)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-primary"
              disabled={!canProceedStep2}
              onClick={() => setStep(2)}
            >
              Next: Store Details
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Store Details */}
      {step === 2 && (
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
            Store Details
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '500px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
                Store Name
              </label>
              <input
                type="text"
                className="input"
                value={storeName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Awesome Store"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
                Slug (URL)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>bizwin.lol/s/</span>
                <input
                  type="text"
                  className="input"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="my-awesome-store"
                  style={{ flex: 1 }}
                />
              </div>
              {slug && slug.length < 3 && (
                <p style={{ fontSize: '0.75rem', color: 'var(--error, #dc2626)', marginTop: 'var(--space-1)' }}>
                  Slug must be at least 3 characters
                </p>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
                Description
              </label>
              <textarea
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell customers what your store is about..."
                rows={3}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
          </div>
          <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              className="btn btn-primary"
              disabled={!canProceedStep3}
              onClick={() => setStep(3)}
            >
              Next: Customize Theme
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Theme Customization */}
      {step === 3 && (
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
            Customize Theme
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--space-4)' }}>
            Pre-filled from the {selectedTemplate?.name || 'selected'} template. Adjust as needed.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '500px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
                Primary Color
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <input
                  type="color"
                  value={themePrimary}
                  onChange={(e) => setThemePrimary(e.target.value)}
                  style={{ width: '48px', height: '36px', border: 'none', cursor: 'pointer', background: 'none' }}
                />
                <input
                  type="text"
                  className="input"
                  value={themePrimary}
                  onChange={(e) => setThemePrimary(e.target.value)}
                  style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
                Accent Color
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <input
                  type="color"
                  value={themeAccent}
                  onChange={(e) => setThemeAccent(e.target.value)}
                  style={{ width: '48px', height: '36px', border: 'none', cursor: 'pointer', background: 'none' }}
                />
                <input
                  type="text"
                  className="input"
                  value={themeAccent}
                  onChange={(e) => setThemeAccent(e.target.value)}
                  style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
                Background Color
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <input
                  type="color"
                  value={themeBg}
                  onChange={(e) => setThemeBg(e.target.value)}
                  style={{ width: '48px', height: '36px', border: 'none', cursor: 'pointer', background: 'none' }}
                />
                <input
                  type="text"
                  className="input"
                  value={themeBg}
                  onChange={(e) => setThemeBg(e.target.value)}
                  style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}
                />
              </div>
            </div>

            {/* Preview */}
            <div style={{ marginTop: 'var(--space-2)' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
                Preview
              </label>
              <div style={{
                background: themeBg,
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-5)',
                minHeight: '120px',
              }}>
                <div style={{ color: themePrimary, fontWeight: 700, fontSize: '1.125rem', marginBottom: 'var(--space-2)' }}>
                  {storeName || 'Store Name'}
                </div>
                <div style={{
                  display: 'inline-block',
                  background: themeAccent,
                  color: '#fff',
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                }}>
                  Shop Now
                </div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-ghost" onClick={() => setStep(2)}>
              Back
            </button>
            <button className="btn btn-primary" onClick={() => setStep(4)}>
              Next: Review
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Create */}
      {step === 4 && (
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
            Review & Create
          </h2>
          <div style={{
            background: 'var(--surface-secondary)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            maxWidth: '500px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Template</span>
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{selectedTemplate?.name || 'Custom'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Store Name</span>
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{storeName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Slug</span>
              <span style={{ fontWeight: 600, fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>/{slug}</span>
            </div>
            {description && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Description</span>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', maxWidth: '250px', textAlign: 'right' }}>{description}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Theme Colors</span>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: 'var(--radius-sm)', background: themePrimary, border: '1px solid var(--border-primary)' }} title="Primary" />
                <div style={{ width: '24px', height: '24px', borderRadius: 'var(--radius-sm)', background: themeBg, border: '1px solid var(--border-primary)' }} title="Background" />
                <div style={{ width: '24px', height: '24px', borderRadius: 'var(--radius-sm)', background: themeAccent, border: '1px solid var(--border-primary)' }} title="Accent" />
              </div>
            </div>
          </div>
          <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-ghost" onClick={() => setStep(3)}>
              Back
            </button>
            <button
              className="btn btn-primary"
              disabled={creating}
              onClick={handleCreate}
            >
              {creating ? 'Creating...' : 'Create Store'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
