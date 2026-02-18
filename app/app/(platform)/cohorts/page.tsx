'use client';

import { useUser } from '@stackframe/stack';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Cohort {
  id: string;
  name: string;
  description: string;
  member_count: number;
  invite_code?: string;
}

export default function CohortsPage() {
  const user = useUser({ or: 'redirect' });
  const [enrolled, setEnrolled] = useState<Cohort[]>([]);
  const [teaching, setTeaching] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const loadCohorts = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/cohorts', { headers: { 'x-user-id': user.id } });
      const data = await res.json();
      setEnrolled(data.enrolled || []);
      setTeaching(data.teaching || []);
    } catch (err) {
      console.error('Failed to load cohorts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCohorts();
  }, [user]);

  const handleJoin = async () => {
    if (!user || !joinCode.trim()) return;
    setJoining(true);
    setJoinError('');
    try {
      const res = await fetch('/api/cohorts/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ invite_code: joinCode.trim() }),
      });
      if (res.ok) {
        setJoinCode('');
        await loadCohorts();
      } else {
        const data = await res.json();
        setJoinError(data.error || 'Failed to join cohort');
      }
    } catch (err) {
      setJoinError('Failed to join cohort');
    } finally {
      setJoining(false);
    }
  };

  const handleCreate = async () => {
    if (!user || !createName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/cohorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ name: createName.trim(), description: createDesc.trim() }),
      });
      if (res.ok) {
        setCreateName('');
        setCreateDesc('');
        setShowCreate(false);
        await loadCohorts();
      }
    } catch (err) {
      console.error('Failed to create cohort:', err);
    } finally {
      setCreating(false);
    }
  };

  if (!user || loading) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

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
          <h4 style={{ margin: 0, fontSize: '1.125rem' }}>Cohorts</h4>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
            Join or create learning cohorts
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}>
          Create Cohort
        </button>
      </div>

      <div className="platform-content">
        {/* Join Form */}
        <div className="card" style={{ marginBottom: 'var(--space-6)', maxWidth: '480px' }}>
          <h5 style={{ marginBottom: 'var(--space-3)' }}>Join a Cohort</h5>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Enter invite code..."
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
            <button className="btn btn-accent btn-sm" onClick={handleJoin} disabled={joining || !joinCode.trim()}>
              {joining ? 'Joining...' : 'Join'}
            </button>
          </div>
          {joinError && (
            <div style={{ marginTop: 'var(--space-2)', fontSize: '0.75rem', color: 'var(--error-500, #ef4444)' }}>{joinError}</div>
          )}
        </div>

        {/* Create Form */}
        {showCreate && (
          <div className="card" style={{ marginBottom: 'var(--space-6)', maxWidth: '480px' }}>
            <h5 style={{ marginBottom: 'var(--space-3)' }}>Create Cohort</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Name</label>
                <input style={inputStyle} value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Cohort name..." />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Description</label>
                <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} placeholder="Optional description..." />
              </div>
              <div className="flex gap-3">
                <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={creating || !createName.trim()}>
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* My Cohorts */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h5 style={{ marginBottom: 'var(--space-4)', color: 'var(--text-secondary)' }}>My Cohorts</h5>
          {enrolled.length === 0 ? (
            <div className="card">
              <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                <div className="empty-state-icon">&amp;</div>
                <div className="empty-state-title">No Cohorts Yet</div>
                <div className="empty-state-desc">Join a cohort with an invite code or create your own.</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {enrolled.map((c) => (
                <Link key={c.id} href={`/cohorts/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="card" style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}>
                    <h5 style={{ margin: 0, fontSize: '1rem', marginBottom: 'var(--space-1)' }}>{c.name}</h5>
                    {c.description && (
                      <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)' }}>{c.description}</p>
                    )}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {c.member_count} member{c.member_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Teaching */}
        {teaching.length > 0 && (
          <div>
            <h5 style={{ marginBottom: 'var(--space-4)', color: 'var(--text-secondary)' }}>Teaching</h5>
            <div className="grid grid-cols-2 gap-4">
              {teaching.map((c) => (
                <Link key={c.id} href={`/cohorts/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="card" style={{ cursor: 'pointer' }}>
                    <h5 style={{ margin: 0, fontSize: '1rem', marginBottom: 'var(--space-1)' }}>{c.name}</h5>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-2)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        {c.member_count} member{c.member_count !== 1 ? 's' : ''}
                      </span>
                      {c.invite_code && (
                        <span className="badge" style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.6875rem',
                          background: 'var(--surface-elevated)',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                        }}>
                          {c.invite_code}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
