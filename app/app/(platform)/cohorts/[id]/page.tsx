'use client';

import { useUser } from '@stackframe/stack';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface CohortDetail {
  id: string;
  name: string;
  description: string;
  member_count: number;
  avg_xp: number;
  avg_score: number;
  invite_code: string;
  is_instructor: boolean;
}

interface Member {
  user_id: string;
  full_name: string;
  total_xp: number;
  level_name: string;
  scenarios_completed: number;
}

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  total_xp: number;
  rank: number;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  target_value: number;
  current_value: number;
  xp_reward: number;
  ends_at: string;
  completed_at: string | null;
}

export default function CohortDetailPage() {
  const user = useUser({ or: 'redirect' });
  const params = useParams();
  const cohortId = params.id as string;

  const [cohort, setCohort] = useState<CohortDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'leaderboard' | 'challenges'>('members');

  useEffect(() => {
    if (!user || !cohortId) return;

    const loadData = async () => {
      try {
        const headers = { 'x-user-id': user.id };
        const [cohortRes, membersRes, leaderboardRes, challengesRes] = await Promise.all([
          fetch(`/api/cohorts/${cohortId}`, { headers }).then(r => r.json()),
          fetch(`/api/cohorts/${cohortId}/members`, { headers }).then(r => r.json()),
          fetch(`/api/cohorts/${cohortId}/leaderboard`, { headers }).then(r => r.json()),
          fetch(`/api/challenges?cohort_id=${cohortId}`, { headers }).then(r => r.json()).catch(() => ({ challenges: [] })),
        ]);

        setCohort(cohortRes);
        setMembers(membersRes.members || []);
        setLeaderboard(leaderboardRes.leaderboard || []);
        setChallenges(challengesRes.challenges || []);
      } catch (err) {
        console.error('Failed to load cohort detail:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, cohortId]);

  const handleCopyCode = () => {
    if (cohort?.invite_code) {
      navigator.clipboard.writeText(cohort.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!user || loading) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!cohort) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <div className="empty-state-title">Cohort not found</div>
      </div>
    );
  }

  const now = new Date();
  const activeChallenges = challenges.filter((c) => !c.completed_at && new Date(c.ends_at) > now);

  const tabStyle = (tab: string): React.CSSProperties => ({
    padding: 'var(--space-2) var(--space-4)',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    borderBottom: activeTab === tab ? '2px solid var(--primary-500)' : '2px solid transparent',
    color: activeTab === tab ? 'var(--primary-500)' : 'var(--text-tertiary)',
    background: 'none',
    border: 'none',
    borderBottomWidth: '2px',
    borderBottomStyle: 'solid',
    borderBottomColor: activeTab === tab ? 'var(--primary-500)' : 'transparent',
  });

  return (
    <div>
      <div className="platform-topbar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Link href="/cohorts" style={{ color: 'var(--text-tertiary)', textDecoration: 'none', fontSize: '0.875rem' }}>Cohorts</Link>
            <span style={{ color: 'var(--text-tertiary)' }}>/</span>
            <h4 style={{ margin: 0, fontSize: '1.125rem' }}>{cohort.name}</h4>
          </div>
          {cohort.description && (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{cohort.description}</p>
          )}
        </div>
      </div>

      <div className="platform-content">
        {/* Stats Strip */}
        <div className="stat-strip" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--primary-500)', fontSize: '2rem' }}>{cohort.member_count}</div>
            <div className="stat-label">Members</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--accent-500)', fontSize: '2rem' }}>{Math.round(cohort.avg_xp || 0).toLocaleString()}</div>
            <div className="stat-label">Avg XP</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--warning-500)', fontSize: '2rem' }}>{Math.round(cohort.avg_score || 0)}</div>
            <div className="stat-label">Avg Score</div>
          </div>
        </div>

        {/* Instructor Tools */}
        {cohort.is_instructor && (
          <div className="card" style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ flex: 1 }}>
              {cohort.invite_code && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 'var(--space-1)' }}>Invite Code</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                    {cohort.invite_code}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {cohort.invite_code && (
                <button className="btn btn-outline btn-sm" onClick={handleCopyCode}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              )}
              <Link href={`/cohorts/${cohortId}/educator`} className="btn btn-primary btn-sm">
                Educator Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 'var(--space-4)' }}>
          <button style={tabStyle('members')} onClick={() => setActiveTab('members')}>Members</button>
          <button style={tabStyle('leaderboard')} onClick={() => setActiveTab('leaderboard')}>Leaderboard</button>
          <button style={tabStyle('challenges')} onClick={() => setActiveTab('challenges')}>Challenges</button>
        </div>

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="card">
            <div style={{
              display: 'flex', alignItems: 'center',
              padding: 'var(--space-2) var(--space-4)',
              marginBottom: 'var(--space-2)',
              fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              <span style={{ flex: 1 }}>Name</span>
              <span style={{ width: '80px', textAlign: 'right' }}>XP</span>
              <span style={{ width: '100px', textAlign: 'right' }}>Level</span>
              <span style={{ width: '100px', textAlign: 'right' }}>Scenarios</span>
            </div>
            {members.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                <div className="empty-state-desc">No members yet.</div>
              </div>
            ) : (
              members.map((m) => (
                <div key={m.user_id} style={{
                  display: 'flex', alignItems: 'center',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--space-1)',
                  background: m.user_id === user.id ? 'color-mix(in srgb, var(--primary-500) 8%, transparent)' : 'transparent',
                }}>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9375rem' }}>
                    {m.full_name}
                    {m.user_id === user.id && <span style={{ marginLeft: 'var(--space-2)', fontSize: '0.75rem', color: 'var(--primary-500)' }}>(You)</span>}
                  </span>
                  <span style={{ width: '80px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-500)' }}>
                    {m.total_xp.toLocaleString()}
                  </span>
                  <span style={{ width: '100px', textAlign: 'right' }}>
                    <span className="badge" style={{
                      background: 'color-mix(in srgb, var(--primary-500) 15%, transparent)',
                      color: 'var(--primary-500)',
                      fontSize: '0.6875rem',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      {m.level_name}
                    </span>
                  </span>
                  <span style={{ width: '100px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {m.scenarios_completed}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="card">
            {leaderboard.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                <div className="empty-state-desc">No leaderboard data yet.</div>
              </div>
            ) : (
              leaderboard.map((entry) => (
                <div key={entry.user_id} style={{
                  display: 'flex', alignItems: 'center',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--space-1)',
                  background: entry.user_id === user.id ? 'color-mix(in srgb, var(--primary-500) 8%, transparent)' : (entry.rank <= 3 ? 'var(--surface-elevated)' : 'transparent'),
                }}>
                  <span style={{
                    width: '40px',
                    fontWeight: entry.rank <= 3 ? 800 : 600,
                    color: entry.rank === 1 ? '#FFD700' : entry.rank === 2 ? '#C0C0C0' : entry.rank === 3 ? '#CD7F32' : 'var(--text-secondary)',
                    fontSize: entry.rank <= 3 ? '1.125rem' : '0.875rem',
                  }}>
                    {entry.rank}
                  </span>
                  <span style={{ flex: 1, fontWeight: 600 }}>
                    {entry.full_name}
                    {entry.user_id === user.id && <span style={{ marginLeft: 'var(--space-2)', fontSize: '0.75rem', color: 'var(--primary-500)' }}>(You)</span>}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-500)' }}>
                    {entry.total_xp.toLocaleString()} XP
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Challenges Tab */}
        {activeTab === 'challenges' && (
          <div>
            {cohort.is_instructor && (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <Link href={`/challenges`} className="btn btn-primary btn-sm">
                  Create Challenge
                </Link>
              </div>
            )}
            {activeChallenges.length === 0 ? (
              <div className="card">
                <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                  <div className="empty-state-desc">No active challenges for this cohort.</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {activeChallenges.map((c) => {
                  const pct = c.target_value > 0 ? Math.min(100, Math.round((c.current_value / c.target_value) * 100)) : 0;
                  const diff = new Date(c.ends_at).getTime() - now.getTime();
                  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                  const timeLeft = days > 0 ? `${days}d ${hours}h left` : `${hours}h left`;

                  return (
                    <div key={c.id} className="card">
                      <h5 style={{ margin: 0, fontSize: '1rem', marginBottom: 'var(--space-2)' }}>{c.title}</h5>
                      <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }}>{c.description}</p>
                      <div style={{ marginBottom: 'var(--space-2)' }}>
                        <div className="flex justify-between" style={{ fontSize: '0.75rem', marginBottom: 'var(--space-1)' }}>
                          <span>{c.current_value} / {c.target_value}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="progress">
                          <div className="progress-bar" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="flex justify-between" style={{ fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--text-tertiary)' }}>{timeLeft}</span>
                        <span style={{ color: 'var(--warning-500)', fontWeight: 700 }}>+{c.xp_reward} XP</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
