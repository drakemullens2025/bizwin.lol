'use client';

import { useUser } from '@stackframe/stack';
import { useState, useEffect } from 'react';

interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  target_value: number;
  current_value: number;
  xp_reward: number;
  scope: string;
  cohort_id: string | null;
  starts_at: string;
  ends_at: string;
  completed_at: string | null;
}

interface Cohort {
  id: string;
  name: string;
}

interface UserProfile {
  is_admin: boolean;
}

export default function ChallengesPage() {
  const user = useUser({ or: 'redirect' });
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    challenge_type: 'complete_scenarios',
    target_value: 1,
    xp_reward: 100,
    scope: 'global',
    cohort_id: '',
    starts_at: '',
    ends_at: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const [challengesRes, profileRes, cohortsRes] = await Promise.all([
          fetch('/api/challenges', { headers: { 'x-user-id': user.id } }).then(r => r.json()),
          fetch('/api/profile', { headers: { 'x-user-id': user.id } }).then(r => r.json()).catch(() => ({ is_admin: false })),
          fetch('/api/cohorts', { headers: { 'x-user-id': user.id } }).then(r => r.json()).catch(() => ({ enrolled: [], teaching: [] })),
        ]);

        setChallenges(challengesRes.challenges || []);
        setIsAdmin(profileRes.is_admin || false);
        const teaching = cohortsRes.teaching || [];
        const enrolled = cohortsRes.enrolled || [];
        setCohorts([...teaching, ...enrolled]);
      } catch (err) {
        console.error('Failed to load challenges:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handleCreate = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { ...formData };
      if (body.scope !== 'cohort') delete body.cohort_id;
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setChallenges((prev) => [data.challenge, ...prev]);
        setShowModal(false);
        setFormData({
          title: '', description: '', challenge_type: 'complete_scenarios',
          target_value: 1, xp_reward: 100, scope: 'global', cohort_id: '', starts_at: '', ends_at: '',
        });
      }
    } catch (err) {
      console.error('Failed to create challenge:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || loading) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const now = new Date();
  const active = challenges.filter((c) => !c.completed_at && new Date(c.ends_at) > now);
  const completed = challenges.filter((c) => !!c.completed_at);

  const getTimeRemaining = (endsAt: string): string => {
    const diff = new Date(endsAt).getTime() - now.getTime();
    if (diff <= 0) return 'Ended';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  const typeLabels: Record<string, string> = {
    complete_scenarios: 'Scenarios',
    achieve_score: 'Score',
    list_products: 'Products',
    earn_revenue: 'Revenue',
    earn_xp: 'XP',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
  };

  return (
    <div>
      <div className="platform-topbar">
        <div>
          <h4 style={{ margin: 0, fontSize: '1.125rem' }}>Challenges</h4>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
            Complete challenges to earn bonus XP
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            Create Challenge
          </button>
        )}
      </div>

      <div className="platform-content">
        {/* Active Challenges */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h5 style={{ marginBottom: 'var(--space-4)', color: 'var(--text-secondary)' }}>Active Challenges</h5>
          {active.length === 0 ? (
            <div className="card">
              <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                <div className="empty-state-icon">!</div>
                <div className="empty-state-title">No Active Challenges</div>
                <div className="empty-state-desc">Check back later for new challenges.</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {active.map((c) => {
                const pct = c.target_value > 0 ? Math.min(100, Math.round((c.current_value / c.target_value) * 100)) : 0;
                return (
                  <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h5 style={{ margin: 0, fontSize: '1rem' }}>{c.title}</h5>
                      <span className="badge" style={{
                        background: 'color-mix(in srgb, var(--accent-500) 15%, transparent)',
                        color: 'var(--accent-500)',
                        fontSize: '0.6875rem',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                        whiteSpace: 'nowrap',
                      }}>
                        {typeLabels[c.challenge_type] || c.challenge_type}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{c.description}</p>

                    <div>
                      <div className="flex justify-between" style={{ marginBottom: 'var(--space-1)', fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{c.current_value} / {c.target_value}</span>
                        <span style={{ color: 'var(--text-tertiary)' }}>{pct}%</span>
                      </div>
                      <div className="progress">
                        <div className="progress-bar" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>{getTimeRemaining(c.ends_at)}</span>
                      <span className="badge" style={{
                        background: 'color-mix(in srgb, var(--warning-500) 15%, transparent)',
                        color: 'var(--warning-500)',
                        fontSize: '0.6875rem',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                      }}>
                        +{c.xp_reward} XP
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Completed Challenges */}
        {completed.length > 0 && (
          <div>
            <h5 style={{ marginBottom: 'var(--space-4)', color: 'var(--text-secondary)' }}>Completed</h5>
            <div className="card">
              {completed.map((c) => (
                <div key={c.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: 'var(--space-3) 0',
                  borderBottom: '1px solid var(--border)',
                  gap: 'var(--space-3)',
                }}>
                  <span style={{ color: 'var(--success-500)', fontSize: '1.25rem', fontWeight: 700 }}>
                    &#10003;
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{c.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      Completed {c.completed_at ? new Date(c.completed_at).toLocaleDateString() : ''}
                    </div>
                  </div>
                  <span className="badge" style={{
                    background: 'color-mix(in srgb, var(--success-500) 15%, transparent)',
                    color: 'var(--success-500)',
                    fontSize: '0.6875rem',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                  }}>
                    +{c.xp_reward} XP
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Challenge Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)',
        }} onClick={() => setShowModal(false)}>
          <div className="card" style={{
            width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto',
          }} onClick={(e) => e.stopPropagation()}>
            <h5 style={{ marginBottom: 'var(--space-4)' }}>Create Challenge</h5>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Title</label>
                <input style={inputStyle} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Description</label>
                <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Challenge Type</label>
                <select style={inputStyle} value={formData.challenge_type} onChange={(e) => setFormData({ ...formData, challenge_type: e.target.value })}>
                  <option value="complete_scenarios">Complete Scenarios</option>
                  <option value="achieve_score">Achieve Score</option>
                  <option value="list_products">List Products</option>
                  <option value="earn_revenue">Earn Revenue</option>
                  <option value="earn_xp">Earn XP</option>
                </select>
              </div>
              <div className="flex gap-3">
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Target Value</label>
                  <input type="number" style={inputStyle} value={formData.target_value} onChange={(e) => setFormData({ ...formData, target_value: Number(e.target.value) })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>XP Reward</label>
                  <input type="number" style={inputStyle} value={formData.xp_reward} onChange={(e) => setFormData({ ...formData, xp_reward: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Scope</label>
                <select style={inputStyle} value={formData.scope} onChange={(e) => setFormData({ ...formData, scope: e.target.value })}>
                  <option value="global">Global</option>
                  <option value="cohort">Cohort</option>
                </select>
              </div>
              {formData.scope === 'cohort' && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Cohort</label>
                  <select style={inputStyle} value={formData.cohort_id} onChange={(e) => setFormData({ ...formData, cohort_id: e.target.value })}>
                    <option value="">Select cohort...</option>
                    {cohorts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3">
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Starts At</label>
                  <input type="datetime-local" style={inputStyle} value={formData.starts_at} onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Ends At</label>
                  <input type="datetime-local" style={inputStyle} value={formData.ends_at} onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })} />
                </div>
              </div>

              <div className="flex gap-3" style={{ marginTop: 'var(--space-2)' }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} disabled={submitting || !formData.title} onClick={handleCreate}>
                  {submitting ? 'Creating...' : 'Create Challenge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
