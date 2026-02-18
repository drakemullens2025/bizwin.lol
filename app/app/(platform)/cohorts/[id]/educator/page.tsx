'use client';

import { useUser } from '@stackframe/stack';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface CohortData {
  id: string;
  name: string;
  description: string;
  instructor_id: string;
  invite_code: string;
  memberCount: number;
  avgXp: number;
  avgScore: number;
  members: Array<{
    user_id: string;
    role: string;
    joined_at: string;
  }>;
}

interface MemberData {
  user_id: string;
  full_name: string;
  email: string;
  total_xp: number;
  current_level: number;
  levelInfo: {
    level: number;
    name: string;
    xpToNext: number;
    progress: number;
  };
}

interface Alert {
  user_id: string;
  full_name: string;
  alert_type: string;
  detail: string;
  last_active: string | null;
}

interface StudentScenario {
  scenario_id: string;
  score: number;
  completed_at: string;
}

interface CurriculumConfig {
  enabled_tiers: number[];
  required_scenarios: string[];
}

interface StudentDetail {
  user_id: string;
  full_name: string;
  email: string;
  scenarios: StudentScenario[];
  xp: { total_xp: number; level_name: string };
  store: { store_name: string; product_count: number; order_count: number; total_revenue: number } | null;
}

export default function EducatorDashboardPage() {
  const user = useUser({ or: 'redirect' });
  const params = useParams();
  const cohortId = params.id as string;

  const [cohort, setCohort] = useState<CohortData | null>(null);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [curriculum, setCurriculum] = useState<CurriculumConfig>({ enabled_tiers: [0, 1, 2, 3], required_scenarios: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'alerts' | 'settings'>('overview');
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<Record<string, StudentDetail>>({});
  const [sortField, setSortField] = useState<'full_name' | 'total_xp' | 'current_level'>('total_xp');
  const [sortAsc, setSortAsc] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [bulkEmails, setBulkEmails] = useState('');
  const [savingCurriculum, setSavingCurriculum] = useState(false);

  const headers: Record<string, string> = user ? { 'x-user-id': user.id } : {};

  useEffect(() => {
    if (!user || !cohortId) return;

    const loadData = async () => {
      try {
        const [cohortRes, membersRes, alertsRes, curriculumRes] = await Promise.all([
          fetch(`/api/cohorts/${cohortId}`, { headers }).then(r => r.json()),
          fetch(`/api/cohorts/${cohortId}/members`, { headers }).then(r => r.json()),
          fetch(`/api/cohorts/${cohortId}/alerts`, { headers }).then(r => r.json()),
          fetch(`/api/cohorts/${cohortId}/curriculum`, { headers }).then(r => r.json()).catch(() => ({ curriculum_config: { enabled_tiers: [0, 1, 2, 3], required_scenarios: [] } })),
        ]);

        setCohort(cohortRes.cohort || cohortRes);
        setMembers(membersRes.members || []);
        setAlerts(alertsRes.alerts || []);
        setCurriculum(curriculumRes.curriculum_config || { enabled_tiers: [0, 1, 2, 3], required_scenarios: [] });
      } catch (err) {
        console.error('Failed to load educator dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, cohortId]);

  const loadStudentDetail = useCallback(async (studentId: string) => {
    if (studentDetails[studentId]) return;
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/students/${studentId}`, { headers });
      const data = await res.json();
      if (data.student) {
        setStudentDetails(prev => ({ ...prev, [studentId]: data.student }));
      }
    } catch (err) {
      console.error('Failed to load student detail:', err);
    }
  }, [cohortId, studentDetails, headers]);

  const handleExpandStudent = (studentId: string) => {
    if (expandedStudent === studentId) {
      setExpandedStudent(null);
    } else {
      setExpandedStudent(studentId);
      loadStudentDetail(studentId);
    }
  };

  const handleSort = (field: 'full_name' | 'total_xp' | 'current_level') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'full_name');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/export`, { headers });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cohort-export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleToggleTier = async (tier: number) => {
    const newTiers = curriculum.enabled_tiers.includes(tier)
      ? curriculum.enabled_tiers.filter(t => t !== tier)
      : [...curriculum.enabled_tiers, tier].sort();

    setSavingCurriculum(true);
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/curriculum`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled_tiers: newTiers }),
      });
      const data = await res.json();
      if (data.curriculum_config) {
        setCurriculum(data.curriculum_config);
      }
    } catch (err) {
      console.error('Failed to update curriculum:', err);
    } finally {
      setSavingCurriculum(false);
    }
  };

  const sortedMembers = [...members].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    if (sortField === 'full_name') {
      return dir * a.full_name.localeCompare(b.full_name);
    }
    return dir * ((a[sortField] || 0) - (b[sortField] || 0));
  });

  // Compute overview stats
  const completionRate = members.length > 0
    ? Math.round((members.filter(m => (m.total_xp || 0) > 0).length / members.length) * 100)
    : 0;

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

  const tabStyle = (tab: string): React.CSSProperties => ({
    padding: 'var(--space-2) var(--space-4)',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    borderBottomColor: activeTab === tab ? 'var(--primary-500)' : 'transparent',
    color: activeTab === tab ? 'var(--primary-500)' : 'var(--text-tertiary)',
  });

  const alertBadgeColor = (type: string) => {
    switch (type) {
      case 'struggling': return { bg: 'color-mix(in srgb, var(--error-500) 15%, transparent)', color: 'var(--error-500)' };
      case 'inactive': return { bg: 'color-mix(in srgb, var(--warning-500) 15%, transparent)', color: 'var(--warning-500)' };
      case 'no_progress': return { bg: 'color-mix(in srgb, var(--text-tertiary) 15%, transparent)', color: 'var(--text-secondary)' };
      default: return { bg: 'var(--surface-elevated)', color: 'var(--text-secondary)' };
    }
  };

  const sortIndicator = (field: string) => {
    if (sortField !== field) return '';
    return sortAsc ? ' ^' : ' v';
  };

  return (
    <div>
      <div className="platform-topbar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Link href="/cohorts" style={{ color: 'var(--text-tertiary)', textDecoration: 'none', fontSize: '0.875rem' }}>Cohorts</Link>
            <span style={{ color: 'var(--text-tertiary)' }}>/</span>
            <Link href={`/cohorts/${cohortId}`} style={{ color: 'var(--text-tertiary)', textDecoration: 'none', fontSize: '0.875rem' }}>{cohort.name}</Link>
            <span style={{ color: 'var(--text-tertiary)' }}>/</span>
            <h4 style={{ margin: 0, fontSize: '1.125rem' }}>Educator Dashboard</h4>
          </div>
        </div>
      </div>

      <div className="platform-content">
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 'var(--space-4)' }}>
          <button style={tabStyle('overview')} onClick={() => setActiveTab('overview')}>Overview</button>
          <button style={tabStyle('students')} onClick={() => setActiveTab('students')}>Students</button>
          <button style={tabStyle('alerts')} onClick={() => setActiveTab('alerts')}>
            Alerts{alerts.length > 0 ? ` (${alerts.length})` : ''}
          </button>
          <button style={tabStyle('settings')} onClick={() => setActiveTab('settings')}>Settings</button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <div className="stat-strip" style={{ marginBottom: 'var(--space-6)' }}>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--primary-500)', fontSize: '2rem' }}>{cohort.memberCount || members.length}</div>
                <div className="stat-label">Members</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--accent-500)', fontSize: '2rem' }}>{Math.round(cohort.avgXp || 0).toLocaleString()}</div>
                <div className="stat-label">Avg XP</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--warning-500)', fontSize: '2rem' }}>{Math.round(cohort.avgScore || 0)}</div>
                <div className="stat-label">Avg Score</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--success-500)', fontSize: '2rem' }}>{completionRate}%</div>
                <div className="stat-label">Active Rate</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="card">
                <h5 style={{ marginBottom: 'var(--space-3)' }}>Activity Summary</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Total Members</span>
                    <span style={{ fontWeight: 700 }}>{members.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Active (has XP)</span>
                    <span style={{ fontWeight: 700 }}>{members.filter(m => m.total_xp > 0).length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Alerts</span>
                    <span style={{ fontWeight: 700, color: alerts.length > 0 ? 'var(--error-500)' : 'var(--text-primary)' }}>{alerts.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Enabled Tiers</span>
                    <span style={{ fontWeight: 700 }}>{curriculum.enabled_tiers.join(', ')}</span>
                  </div>
                </div>
              </div>

              <div className="card">
                <h5 style={{ marginBottom: 'var(--space-3)' }}>Quick Actions</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <button className="btn btn-outline btn-sm" onClick={handleExport} disabled={exporting}>
                    {exporting ? 'Exporting...' : 'Export CSV'}
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('alerts')}>
                    View Alerts ({alerts.length})
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('settings')}>
                    Curriculum Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="card">
            <div style={{
              display: 'flex', alignItems: 'center',
              padding: 'var(--space-2) var(--space-4)',
              marginBottom: 'var(--space-2)',
              fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              <span
                style={{ flex: 1, cursor: 'pointer' }}
                onClick={() => handleSort('full_name')}
              >
                Name{sortIndicator('full_name')}
              </span>
              <span
                style={{ width: '80px', textAlign: 'right', cursor: 'pointer' }}
                onClick={() => handleSort('total_xp')}
              >
                XP{sortIndicator('total_xp')}
              </span>
              <span
                style={{ width: '80px', textAlign: 'right', cursor: 'pointer' }}
                onClick={() => handleSort('current_level')}
              >
                Level{sortIndicator('current_level')}
              </span>
              <span style={{ width: '100px', textAlign: 'right' }}>Last Active</span>
            </div>

            {sortedMembers.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                <div className="empty-state-desc">No students in this cohort yet.</div>
              </div>
            ) : (
              sortedMembers.map((m) => {
                const detail = studentDetails[m.user_id];
                const isExpanded = expandedStudent === m.user_id;

                return (
                  <div key={m.user_id}>
                    <div
                      onClick={() => handleExpandStudent(m.user_id)}
                      style={{
                        display: 'flex', alignItems: 'center',
                        padding: 'var(--space-3) var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-1)',
                        cursor: 'pointer',
                        background: isExpanded ? 'color-mix(in srgb, var(--primary-500) 8%, transparent)' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                    >
                      <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9375rem' }}>
                        {m.full_name}
                        <span style={{ marginLeft: 'var(--space-2)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          {m.email}
                        </span>
                      </span>
                      <span style={{ width: '80px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-500)' }}>
                        {(m.total_xp || 0).toLocaleString()}
                      </span>
                      <span style={{ width: '80px', textAlign: 'right' }}>
                        <span style={{
                          background: 'color-mix(in srgb, var(--primary-500) 15%, transparent)',
                          color: 'var(--primary-500)',
                          fontSize: '0.6875rem',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                        }}>
                          {m.levelInfo?.name || `Lv${m.current_level}`}
                        </span>
                      </span>
                      <span style={{ width: '100px', textAlign: 'right', fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                        {isExpanded ? '[-]' : '[+]'}
                      </span>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div style={{
                        padding: 'var(--space-4)',
                        marginLeft: 'var(--space-4)',
                        marginRight: 'var(--space-4)',
                        marginBottom: 'var(--space-3)',
                        background: 'var(--surface-elevated)',
                        borderRadius: 'var(--radius-md)',
                      }}>
                        {!detail ? (
                          <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-tertiary)' }}>Loading...</div>
                        ) : (
                          <div>
                            {/* Store info */}
                            {detail.store && (
                              <div style={{ marginBottom: 'var(--space-3)', fontSize: '0.875rem' }}>
                                <strong>Store:</strong> {detail.store.store_name} — {detail.store.product_count} products, {detail.store.order_count} orders, ${detail.store.total_revenue.toFixed(2)} revenue
                              </div>
                            )}

                            {/* Scenario scores */}
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)', textTransform: 'uppercase' }}>
                              Scenario Scores ({detail.scenarios.length})
                            </div>
                            {detail.scenarios.length === 0 ? (
                              <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }}>No completed scenarios</div>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                                {detail.scenarios.map((s) => {
                                  const color = s.score >= 80 ? 'var(--success-500)' : s.score >= 50 ? 'var(--warning-500)' : 'var(--error-500)';
                                  return (
                                    <div key={s.scenario_id} style={{
                                      padding: 'var(--space-1) var(--space-2)',
                                      background: 'var(--surface)',
                                      borderRadius: 'var(--radius-sm)',
                                      fontSize: '0.8125rem',
                                      borderLeft: `3px solid ${color}`,
                                    }}>
                                      <span style={{ color: 'var(--text-secondary)' }}>{s.scenario_id}</span>
                                      <span style={{ marginLeft: 'var(--space-2)', fontWeight: 700, color }}>{s.score}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div>
            {alerts.length === 0 ? (
              <div className="card">
                <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                  <div className="empty-state-title">No alerts</div>
                  <div className="empty-state-desc">All students are on track.</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {alerts.map((alert, idx) => {
                  const badge = alertBadgeColor(alert.alert_type);
                  return (
                    <div key={`${alert.user_id}-${alert.alert_type}-${idx}`} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{alert.full_name}</span>
                          <span style={{
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: badge.bg,
                            color: badge.color,
                            textTransform: 'uppercase',
                          }}>
                            {alert.alert_type.replace('_', ' ')}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{alert.detail}</div>
                        {alert.last_active && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                            Last active: {new Date(alert.last_active).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-2 gap-6">
            {/* Curriculum toggles */}
            <div className="card">
              <h5 style={{ marginBottom: 'var(--space-4)' }}>Curriculum Tiers</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {[0, 1, 2, 3].map(tier => {
                  const tierNames = ['Foundation', 'Growth', 'Operations', 'Scaling'];
                  const isEnabled = curriculum.enabled_tiers.includes(tier);
                  return (
                    <div key={tier} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Tier {tier}: {tierNames[tier]}</div>
                      </div>
                      <button
                        className={`btn btn-sm ${isEnabled ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => handleToggleTier(tier)}
                        disabled={savingCurriculum}
                        style={{ minWidth: '80px' }}
                      >
                        {isEnabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Export */}
            <div className="card">
              <h5 style={{ marginBottom: 'var(--space-4)' }}>Export Data</h5>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                Download a CSV with all student data including names, XP, levels, scores, store info, and revenue.
              </p>
              <button className="btn btn-primary btn-sm" onClick={handleExport} disabled={exporting} style={{ width: '100%' }}>
                {exporting ? 'Exporting...' : 'Download CSV Export'}
              </button>
            </div>

            {/* Bulk invite */}
            <div className="card" style={{ gridColumn: 'span 2' }}>
              <h5 style={{ marginBottom: 'var(--space-4)' }}>Bulk Invite</h5>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                Share the invite code with students: <strong style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>{cohort.invite_code || 'N/A'}</strong>
              </p>
              <textarea
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                placeholder="Enter email addresses, one per line (feature coming soon)"
                rows={4}
                style={{
                  width: '100%',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  fontFamily: 'var(--font-mono)',
                  resize: 'vertical',
                  marginBottom: 'var(--space-3)',
                }}
              />
              <button className="btn btn-outline btn-sm" disabled>
                Send Invites (Coming Soon)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
