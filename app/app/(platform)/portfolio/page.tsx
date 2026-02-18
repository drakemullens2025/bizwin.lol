'use client';

import { useUser } from '@stackframe/stack';
import { useState, useEffect } from 'react';

interface PortfolioSettings {
  is_public: boolean;
  show_scores: boolean;
  show_store_stats: boolean;
  bio: string;
  headline: string;
}

export default function PortfolioPage() {
  const user = useUser({ or: 'redirect' });
  const [settings, setSettings] = useState<PortfolioSettings>({
    is_public: false,
    show_scores: true,
    show_store_stats: true,
    bio: '',
    headline: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadSettings = async () => {
      try {
        const res = await fetch('/api/portfolio/settings', { headers: { 'x-user-id': user.id } });
        if (res.ok) {
          const data = await res.json();
          setSettings({
            is_public: data.is_public ?? false,
            show_scores: data.show_scores ?? true,
            show_store_stats: data.show_store_stats ?? true,
            bio: data.bio ?? '',
            headline: data.headline ?? '',
          });
        }
      } catch (err) {
        console.error('Failed to load portfolio settings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/portfolio/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save portfolio settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!user || loading) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const shareableUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/portfolio/${user.id}`
    : `/portfolio/${user.id}`;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
  };

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    background: active ? 'var(--primary-500)' : 'var(--border)',
    position: 'relative',
    cursor: 'pointer',
    transition: 'background 0.2s',
    border: 'none',
    padding: 0,
    flexShrink: 0,
  });

  const toggleKnobStyle = (active: boolean): React.CSSProperties => ({
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: 'white',
    position: 'absolute',
    top: '3px',
    left: active ? '23px' : '3px',
    transition: 'left 0.2s',
  });

  return (
    <div>
      <div className="platform-topbar">
        <div>
          <h4 style={{ margin: 0, fontSize: '1.125rem' }}>My Portfolio</h4>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
            Customize your public profile
          </p>
        </div>
      </div>

      <div className="platform-content">
        <div className="card" style={{ maxWidth: '640px' }}>
          {/* Public Toggle */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border)',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Public Portfolio</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Make your portfolio visible to anyone with the link</div>
            </div>
            <button style={toggleStyle(settings.is_public)} onClick={() => setSettings({ ...settings, is_public: !settings.is_public })}>
              <div style={toggleKnobStyle(settings.is_public)} />
            </button>
          </div>

          {/* Show Scores Toggle */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border)',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Show Scores</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Display scenario scores on your portfolio</div>
            </div>
            <button style={toggleStyle(settings.show_scores)} onClick={() => setSettings({ ...settings, show_scores: !settings.show_scores })}>
              <div style={toggleKnobStyle(settings.show_scores)} />
            </button>
          </div>

          {/* Show Store Stats Toggle */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border)',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Show Store Stats</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Display store information on your portfolio</div>
            </div>
            <button style={toggleStyle(settings.show_store_stats)} onClick={() => setSettings({ ...settings, show_store_stats: !settings.show_store_stats })}>
              <div style={toggleKnobStyle(settings.show_store_stats)} />
            </button>
          </div>

          {/* Headline */}
          <div style={{ padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border)' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Headline</label>
            <input
              style={inputStyle}
              placeholder="e.g. Aspiring E-Commerce Entrepreneur"
              value={settings.headline}
              onChange={(e) => setSettings({ ...settings, headline: e.target.value })}
            />
          </div>

          {/* Bio */}
          <div style={{ padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border)' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Bio</label>
            <textarea
              style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
              placeholder="Tell visitors about yourself and your journey..."
              value={settings.bio}
              onChange={(e) => setSettings({ ...settings, bio: e.target.value })}
            />
          </div>

          {/* Preview Link */}
          {settings.is_public && (
            <div style={{ padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border)' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Shareable URL</label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              }}>
                <input style={{ ...inputStyle, flex: 1 }} value={shareableUrl} readOnly />
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => navigator.clipboard.writeText(shareableUrl)}
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div style={{ paddingTop: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            {saved && (
              <span style={{ fontSize: '0.8125rem', color: 'var(--success-500)' }}>Settings saved!</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
