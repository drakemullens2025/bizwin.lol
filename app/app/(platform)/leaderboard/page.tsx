'use client';

import { useUser } from '@stackframe/stack';
import { useState, useEffect } from 'react';

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  total_xp: number;
  level_name: string;
  rank: number;
}

interface Cohort {
  id: string;
  name: string;
}

export default function LeaderboardPage() {
  const user = useUser({ or: 'redirect' });
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadCohorts = async () => {
      try {
        const res = await fetch('/api/cohorts', { headers: { 'x-user-id': user.id } });
        const data = await res.json();
        const enrolled = data.enrolled || [];
        const teaching = data.teaching || [];
        setCohorts([...enrolled, ...teaching]);
      } catch (err) {
        console.error('Failed to load cohorts:', err);
      }
    };

    loadCohorts();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const loadLeaderboard = async () => {
      setLoading(true);
      try {
        const url = selectedCohort
          ? `/api/leaderboard?cohort_id=${selectedCohort}`
          : '/api/leaderboard';
        const res = await fetch(url, { headers: { 'x-user-id': user.id } });
        const data = await res.json();
        setEntries(data.leaderboard || []);
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, [user, selectedCohort]);

  if (!user) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const getRankStyle = (rank: number): React.CSSProperties => {
    if (rank === 1) return { color: '#FFD700', fontWeight: 800, fontSize: '1.125rem' };
    if (rank === 2) return { color: '#C0C0C0', fontWeight: 800, fontSize: '1.125rem' };
    if (rank === 3) return { color: '#CD7F32', fontWeight: 800, fontSize: '1.125rem' };
    return { color: 'var(--text-secondary)', fontWeight: 600 };
  };

  const getRowStyle = (entry: LeaderboardEntry): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      padding: 'var(--space-3) var(--space-4)',
      borderRadius: 'var(--radius-md)',
      marginBottom: 'var(--space-2)',
    };
    if (entry.user_id === user.id) {
      return { ...base, background: 'color-mix(in srgb, var(--primary-500) 12%, transparent)' };
    }
    if (entry.rank <= 3) {
      return { ...base, background: 'var(--surface-elevated)' };
    }
    return base;
  };

  return (
    <div>
      <div className="platform-topbar">
        <div>
          <h4 style={{ margin: 0, fontSize: '1.125rem' }}>Leaderboard</h4>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
            See how you rank against other learners
          </p>
        </div>
        <div>
          <select
            value={selectedCohort}
            onChange={(e) => setSelectedCohort(e.target.value)}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
            }}
          >
            <option value="">Global</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="platform-content">
        {loading ? (
          <div className="empty-state" style={{ minHeight: '40vh' }}>
            <div className="spinner" />
          </div>
        ) : entries.length === 0 ? (
          <div className="empty-state" style={{ minHeight: '40vh' }}>
            <div className="empty-state-icon">^</div>
            <div className="empty-state-title">No Entries Yet</div>
            <div className="empty-state-desc">Complete scenarios and earn XP to appear on the leaderboard.</div>
          </div>
        ) : (
          <div className="card">
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: 'var(--space-2) var(--space-4)',
              marginBottom: 'var(--space-2)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              <span style={{ width: '48px' }}>#</span>
              <span style={{ flex: 1 }}>Name</span>
              <span style={{ width: '100px', textAlign: 'right' }}>XP</span>
              <span style={{ width: '120px', textAlign: 'right' }}>Level</span>
            </div>

            {entries.map((entry) => (
              <div key={entry.user_id} style={getRowStyle(entry)}>
                <span style={{ width: '48px', ...getRankStyle(entry.rank) }}>
                  {entry.rank}
                </span>
                <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9375rem' }}>
                  {entry.full_name}
                  {entry.user_id === user.id && (
                    <span style={{ marginLeft: 'var(--space-2)', fontSize: '0.75rem', color: 'var(--primary-500)' }}>(You)</span>
                  )}
                </span>
                <span style={{ width: '100px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-500)' }}>
                  {entry.total_xp.toLocaleString()}
                </span>
                <span style={{ width: '120px', textAlign: 'right' }}>
                  <span className="badge" style={{
                    background: 'color-mix(in srgb, var(--primary-500) 15%, transparent)',
                    color: 'var(--primary-500)',
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                  }}>
                    {entry.level_name}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
