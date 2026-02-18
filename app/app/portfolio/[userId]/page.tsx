'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface CompletedScenario {
  scenario_title: string;
  score: number;
  completed_at: string;
}

interface XpTimelineEntry {
  date: string;
  xp: number;
}

interface PortfolioData {
  full_name: string;
  headline: string;
  bio: string;
  level_name: string;
  total_xp: number;
  show_scores: boolean;
  show_store_stats: boolean;
  completed_scenarios: CompletedScenario[];
  xpTimeline: XpTimelineEntry[];
  store?: {
    store_name: string;
    is_published: boolean;
  };
}

function getISOWeek(dateStr: string): string {
  const d = new Date(dateStr);
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'var(--success-500)';
  if (score >= 70) return 'var(--primary-500)';
  if (score >= 50) return 'var(--warning-500)';
  return 'var(--error-500, #ef4444)';
}

export default function PublicPortfolioPage() {
  const params = useParams();
  const userId = params.userId as string;
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const loadPortfolio = async () => {
      try {
        const res = await fetch(`/api/portfolio/${userId}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Failed to load portfolio:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadPortfolio();
  }, [userId]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--surface)',
      }}>
        <div className="spinner" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--surface)', flexDirection: 'column', gap: 'var(--space-3)',
      }}>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-tertiary)' }}>404</div>
        <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Portfolio not found</div>
      </div>
    );
  }

  // Aggregate XP by ISO week for chart
  const weeklyXp: Record<string, number> = {};
  (data.xpTimeline || []).forEach((entry) => {
    const week = getISOWeek(entry.date);
    weeklyXp[week] = (weeklyXp[week] || 0) + entry.xp;
  });
  const weekKeys = Object.keys(weeklyXp).sort();
  const maxWeeklyXp = Math.max(...Object.values(weeklyXp), 1);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--surface)',
      color: 'var(--text-primary)',
    }}>
      {/* Hero */}
      <div style={{
        padding: 'var(--space-8) var(--space-6)',
        textAlign: 'center',
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary-500) 8%, transparent), color-mix(in srgb, var(--accent-500) 8%, transparent))',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>{data.full_name}</h1>
          {data.headline && (
            <p style={{ margin: 'var(--space-2) 0 0', fontSize: '1rem', color: 'var(--text-secondary)' }}>{data.headline}</p>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
            <span className="badge" style={{
              background: 'color-mix(in srgb, var(--primary-500) 15%, transparent)',
              color: 'var(--primary-500)',
              padding: '4px 12px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 700,
            }}>
              {data.level_name}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: 'var(--accent-500)',
              fontSize: '0.9375rem',
            }}>
              {data.total_xp.toLocaleString()} XP
            </span>
          </div>
          {data.bio && (
            <p style={{ margin: 'var(--space-4) 0 0', fontSize: '0.875rem', color: 'var(--text-tertiary)', lineHeight: 1.6, maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
              {data.bio}
            </p>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: 'var(--space-6)' }}>
        {/* Learning Journey */}
        {data.completed_scenarios && data.completed_scenarios.length > 0 && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Learning Journey</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {data.completed_scenarios.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  padding: 'var(--space-3)',
                  background: 'var(--surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.scenario_title}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                      {new Date(s.completed_at).toLocaleDateString()}
                    </div>
                  </div>
                  {data.show_scores && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: '120px' }}>
                      <div style={{
                        flex: 1, height: '6px', borderRadius: '3px',
                        background: 'var(--border)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${s.score}%`,
                          height: '100%',
                          borderRadius: '3px',
                          background: getScoreColor(s.score),
                        }} />
                      </div>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                        color: getScoreColor(s.score),
                        minWidth: '32px', textAlign: 'right',
                      }}>
                        {s.score}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Growth Chart */}
        {weekKeys.length > 0 && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Growth Chart</h3>
            <div style={{
              padding: 'var(--space-4)',
              background: 'var(--surface-elevated)',
              borderRadius: 'var(--radius-md)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'flex-end', gap: '4px',
                height: '160px',
              }}>
                {weekKeys.map((week) => {
                  const height = Math.max(4, (weeklyXp[week] / maxWeeklyXp) * 140);
                  return (
                    <div key={week} style={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'flex-end', height: '100%',
                    }}>
                      <div style={{
                        width: '100%', maxWidth: '32px',
                        height: `${height}px`,
                        background: 'linear-gradient(180deg, var(--primary-500), var(--accent-500))',
                        borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                      }} title={`${week}: ${weeklyXp[week]} XP`} />
                    </div>
                  );
                })}
              </div>
              <div style={{
                display: 'flex', gap: '4px', marginTop: 'var(--space-1)',
                fontSize: '0.5625rem', color: 'var(--text-tertiary)',
              }}>
                {weekKeys.map((week) => (
                  <div key={week} style={{ flex: 1, textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {week.split('-W')[1] ? `W${week.split('-W')[1]}` : week}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Store Section */}
        {data.show_store_stats && data.store && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Store</h3>
            <div style={{
              padding: 'var(--space-4)',
              background: 'var(--surface-elevated)',
              borderRadius: 'var(--radius-md)',
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
            }}>
              <div style={{
                width: '40px', height: '40px',
                background: 'linear-gradient(135deg, var(--accent-500), var(--primary-500))',
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 800, fontSize: '0.875rem',
              }}>
                {data.store.store_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{data.store.store_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  {data.store.is_published ? 'Published' : 'In Progress'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        padding: 'var(--space-6)',
        borderTop: '1px solid var(--border)',
        fontSize: '0.75rem',
        color: 'var(--text-tertiary)',
      }}>
        Powered by bizwin.lol
      </div>
    </div>
  );
}
