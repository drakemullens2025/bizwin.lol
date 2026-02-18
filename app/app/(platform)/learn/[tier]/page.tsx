'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { getScenariosByTier, categoryMeta, type CommerceScenario } from '@/data/commerce-scenarios';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Evaluation {
  score: number;
  score_breakdown: Record<string, number>;
  dimensions: string[];
  dimension_keys: string[];
  summary: string;
  gaps: string[];
  strengths: string[];
  growth_areas: string[];
  coaching_note: string;
}

interface CalibrationData {
  recommended_tier: number;
  recommended_difficulty: number;
  weak_categories: string[];
  strong_categories: string[];
  avg_score: number;
  ready_for_next_tier: boolean;
  total_completed: number;
  current_tier?: number;
  tier_breakdown?: Record<number, { completed: number; total: number; avg_score: number }>;
}

export default function LearnPage() {
  const params = useParams();
  const tier = parseInt(params.tier as string) || 0;
  const scenarios = getScenariosByTier(tier);

  const [selectedScenario, setSelectedScenario] = useState<CommerceScenario | null>(null);
  const [activeTab, setActiveTab] = useState<'explore' | 'approach'>('explore');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [userApproach, setUserApproach] = useState('');
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const user = useUser();

  // Generated scenarios and calibration state
  const [generatedScenarios, setGeneratedScenarios] = useState<CommerceScenario[]>([]);
  const [generating, setGenerating] = useState(false);
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const [calibrationLoading, setCalibrationLoading] = useState(false);

  const fetchCompletedIds = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch('/api/progress', {
        headers: { 'x-user-id': user.id },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.completedScenarioIds) {
          setCompletedIds(new Set(data.completedScenarioIds));
        }
      }
    } catch (err) {
      console.error('Failed to fetch completed scenarios:', err);
    }
  }, [user?.id]);

  const fetchCalibration = useCallback(async () => {
    if (!user?.id) return;
    setCalibrationLoading(true);
    try {
      const res = await fetch('/api/ai/calibrate', {
        headers: { 'x-user-id': user.id },
      });
      if (res.ok) {
        const data = await res.json();
        setCalibration(data);
      }
    } catch (err) {
      console.error('Failed to fetch calibration:', err);
    } finally {
      setCalibrationLoading(false);
    }
  }, [user?.id]);

  const fetchGeneratedScenarios = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/ai/generate-scenario?tier=${tier}`, {
        method: 'GET',
      });
      // The generate endpoint is POST only, so we fetch from stored data via a different pattern.
      // Generated scenarios are stored in state after creation. We load them from localStorage as a cache.
      const cached = localStorage.getItem(`cjv-generated-scenarios-${user.id}-${tier}`);
      if (cached) {
        try {
          setGeneratedScenarios(JSON.parse(cached));
        } catch {
          // ignore parse errors
        }
      }
    } catch {
      // Silently handle — generated scenarios are optional
    }
  }, [user?.id, tier]);

  useEffect(() => {
    fetchCompletedIds();
    fetchCalibration();
    fetchGeneratedScenarios();
  }, [fetchCompletedIds, fetchCalibration, fetchGeneratedScenarios]);

  // Combine static and generated scenarios
  const allScenarios = [...scenarios, ...generatedScenarios];

  const filteredScenarios = categoryFilter === 'all'
    ? allScenarios
    : allScenarios.filter(s => s.category === categoryFilter);

  const selectScenario = (scenario: CommerceScenario) => {
    setSelectedScenario(scenario);
    setMessages([]);
    setChatInput('');
    setUserApproach('');
    setEvaluation(null);
    setActiveTab('explore');
  };

  const generateScenario = async () => {
    if (!user?.id || generating) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-scenario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          tier,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.scenario) {
          const newScenario: CommerceScenario = data.scenario;
          const updated = [...generatedScenarios, newScenario];
          setGeneratedScenarios(updated);
          // Cache in localStorage
          localStorage.setItem(
            `cjv-generated-scenarios-${user.id}-${tier}`,
            JSON.stringify(updated)
          );
          // Auto-select the new scenario
          selectScenario(newScenario);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('Failed to generate scenario:', errData);
      }
    } catch (err) {
      console.error('Generate scenario error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || streaming || !selectedScenario) return;

    const userMsg: Message = { role: 'user', content: chatInput };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setChatInput('');
    setStreaming(true);

    const systemPrompt = `You are a business mentor using the Socratic method. The student is working on a commerce scenario.

SCENARIO: ${selectedScenario.title}
CONTEXT: ${selectedScenario.context}
CHALLENGE: ${selectedScenario.challenge}

Your role:
- Ask probing questions, don't give answers directly
- Surface angles the student hasn't considered
- Keep responses focused: 2-4 sentences max
- When the student is close to an insight, ask one more question to push them there
- Reference real business concepts and frameworks when relevant
- Never reveal the optimal approach directly`;

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, system_prompt: systemPrompt }),
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      setMessages([...newMessages, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages([...newMessages, { role: 'assistant', content: fullText }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setStreaming(false);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const submitEvaluation = async () => {
    if (!userApproach.trim() || evaluating || !selectedScenario) return;
    setEvaluating(true);

    try {
      const response = await fetch('/api/ai/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.id ? { 'x-user-id': user.id } : {}),
          ...(user?.primaryEmail ? { 'x-user-email': user.primaryEmail } : {}),
        },
        body: JSON.stringify({
          scenario_id: selectedScenario.id,
          user_response: userApproach,
          scenario_data: {
            context: selectedScenario.context,
            challenge: selectedScenario.challenge,
            optimalApproach: selectedScenario.optimalApproach,
            keyInsights: selectedScenario.keyInsights,
            commonMistakes: selectedScenario.commonMistakes,
            nextLevel: selectedScenario.nextLevel,
          },
          rubric_type: selectedScenario.category,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setEvaluation(data.evaluation);
        // Optimistic update: mark scenario as completed locally
        if (selectedScenario) {
          setCompletedIds(prev => new Set(prev).add(selectedScenario.id));
        }
      }
    } catch (err) {
      console.error('Evaluation error:', err);
    } finally {
      setEvaluating(false);
    }
  };

  const scoreColor = (score: number) =>
    score >= 80 ? 'var(--success-500)' :
    score >= 60 ? 'var(--primary-500)' :
    score >= 40 ? 'var(--warning-500)' : 'var(--error-500)';

  const isGenerated = (scenario: CommerceScenario) =>
    scenario.id.startsWith('CS-GEN-');

  const tierLabels: Record<number, string> = { 0: 'Foundation', 1: 'Builder', 2: 'Operator', 3: 'Scale' };

  return (
    <div>
      {/* Top Bar */}
      <div className="platform-topbar">
        <div>
          <h4 style={{ margin: 0, fontSize: '1.125rem' }}>
            Tier {tier}: {tierLabels[tier] || 'Unknown'}
          </h4>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
            {allScenarios.length} scenarios | {completedIds.size} completed
          </p>
        </div>
      </div>

      {/* Calibration Banner */}
      {calibration && !calibrationLoading && calibration.total_completed > 0 && (
        <div style={{
          padding: 'var(--space-3) var(--space-4)',
          background: calibration.ready_for_next_tier ? 'var(--success-50)' : 'var(--primary-50)',
          borderBottom: '1px solid var(--border)',
          fontSize: '0.8125rem',
        }}>
          <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
            <span style={{
              fontWeight: 700,
              color: calibration.ready_for_next_tier ? 'var(--success-600)' : 'var(--primary-600)',
            }}>
              {calibration.ready_for_next_tier
                ? `Ready for Tier ${calibration.recommended_tier}!`
                : `Recommended: Tier ${calibration.recommended_tier}, Difficulty ${calibration.recommended_difficulty}`
              }
            </span>
            <span style={{ color: 'var(--text-tertiary)' }}>|</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              Avg Score: {calibration.avg_score}/100
            </span>
            {calibration.weak_categories.length > 0 && (
              <>
                <span style={{ color: 'var(--text-tertiary)' }}>|</span>
                <span style={{ color: 'var(--warning-600)' }}>
                  Focus: {calibration.weak_categories.map(c => categoryMeta[c]?.label || c).join(', ')}
                </span>
              </>
            )}
            {calibration.strong_categories.length > 0 && (
              <>
                <span style={{ color: 'var(--text-tertiary)' }}>|</span>
                <span style={{ color: 'var(--success-600)' }}>
                  Strong: {calibration.strong_categories.map(c => categoryMeta[c]?.label || c).join(', ')}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', minHeight: 'calc(100vh - 56px)' }}>
        {/* Scenario Browser */}
        <div style={{
          borderRight: '1px solid var(--border)',
          padding: 'var(--space-4)',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 56px)',
        }}>
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 'var(--space-4)' }}>
            <button
              className={`btn btn-sm ${categoryFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setCategoryFilter('all')}
            >All</button>
            {Object.entries(categoryMeta).filter(([key]) => allScenarios.some(s => s.category === key)).map(([key, meta]) => (
              <button
                key={key}
                className={`btn btn-sm ${categoryFilter === key ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setCategoryFilter(key)}
                style={categoryFilter === key ? {} : { color: meta.color }}
              >{meta.label}</button>
            ))}
          </div>

          {/* Scenario List */}
          <div className="flex flex-col gap-2">
            {filteredScenarios.map((scenario) => (
              <div
                key={scenario.id}
                className={`scenario-card ${completedIds.has(scenario.id) ? 'scenario-completed' : ''} ${selectedScenario?.id === scenario.id ? 'active' : ''}`}
                style={{
                  padding: 'var(--space-3)',
                  borderColor: selectedScenario?.id === scenario.id ? 'var(--primary-500)' : undefined,
                }}
                onClick={() => selectScenario(scenario)}
              >
                <div className="flex items-center gap-2" style={{ marginBottom: 'var(--space-1)' }}>
                  <span style={{
                    fontSize: '0.625rem', fontWeight: 800,
                    color: categoryMeta[scenario.category]?.color,
                    fontFamily: 'var(--font-mono)',
                  }}>{scenario.id}</span>
                  <span style={{
                    fontSize: '0.625rem',
                    color: 'var(--text-tertiary)',
                  }}>{'*'.repeat(scenario.difficulty)}</span>
                  {isGenerated(scenario) && (
                    <span style={{
                      fontSize: '0.5625rem',
                      fontWeight: 700,
                      color: 'var(--accent-500)',
                      background: 'var(--accent-50)',
                      padding: '1px 5px',
                      borderRadius: 'var(--radius-sm)',
                      letterSpacing: '0.03em',
                      textTransform: 'uppercase',
                    }}>AI Generated</span>
                  )}
                  {completedIds.has(scenario.id) && <span style={{ color: 'var(--success-500)', fontSize: '0.75rem' }}>&#10003;</span>}
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{scenario.title}</div>
              </div>
            ))}
          </div>

          {/* Generate Personalized Scenario Button */}
          <button
            className="btn btn-accent"
            onClick={generateScenario}
            disabled={generating || !user?.id}
            style={{
              width: '100%',
              marginTop: 'var(--space-4)',
              fontSize: '0.8125rem',
            }}
          >
            {generating ? 'Generating...' : 'Generate Personalized Scenario'}
          </button>
          <p style={{
            fontSize: '0.6875rem',
            color: 'var(--text-tertiary)',
            textAlign: 'center',
            marginTop: 'var(--space-2)',
          }}>
            AI creates a scenario tailored to your store and skill gaps
          </p>
        </div>

        {/* Main Workspace */}
        <div style={{ padding: 'var(--space-4)', overflowY: 'auto', maxHeight: 'calc(100vh - 56px)' }}>
          {!selectedScenario ? (
            <div className="empty-state" style={{ minHeight: '60vh' }}>
              <div className="empty-state-icon">&gt;</div>
              <div className="empty-state-title">Select a Scenario</div>
              <div className="empty-state-desc">
                Choose a scenario from the sidebar to begin. Each scenario is a real business challenge with AI coaching.
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: '800px' }}>
              {/* Scenario Header */}
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-2)' }}>
                  <span className="badge" style={{
                    background: categoryMeta[selectedScenario.category]?.color + '20',
                    color: categoryMeta[selectedScenario.category]?.color,
                  }}>{categoryMeta[selectedScenario.category]?.label}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    Difficulty: {'*'.repeat(selectedScenario.difficulty)}
                  </span>
                  {isGenerated(selectedScenario) && (
                    <span style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      color: 'var(--accent-500)',
                      background: 'var(--accent-50)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                    }}>AI Generated</span>
                  )}
                </div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>{selectedScenario.title}</h3>
              </div>

              {/* Context */}
              <div className="workspace-panel" style={{ marginBottom: 'var(--space-4)', borderLeft: '3px solid var(--primary-500)' }}>
                <div className="workspace-panel-label">Context</div>
                <p style={{ marginBottom: 0, fontSize: '0.9375rem', lineHeight: 1.7 }}>{selectedScenario.context}</p>
              </div>

              {/* Challenge */}
              <div className="workspace-panel" style={{ marginBottom: 'var(--space-4)', borderLeft: '3px solid var(--accent-500)' }}>
                <div className="workspace-panel-label">Challenge</div>
                <p style={{ marginBottom: 0, fontSize: '0.9375rem', lineHeight: 1.7 }}>{selectedScenario.challenge}</p>
              </div>

              {/* Tabs */}
              <div className="tab-bar" style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', marginBottom: 0 }}>
                <button className={`tab-btn ${activeTab === 'explore' ? 'active' : ''}`} onClick={() => setActiveTab('explore')}>
                  Explore (AI Mentor)
                </button>
                <button className={`tab-btn ${activeTab === 'approach' ? 'active' : ''}`} onClick={() => setActiveTab('approach')}>
                  Your Approach
                </button>
              </div>

              {/* Explore Tab */}
              {activeTab === 'explore' && (
                <div className="workspace-panel" style={{ borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', borderTop: 'none' }}>
                  <div style={{ minHeight: '300px', maxHeight: '400px', overflowY: 'auto', marginBottom: 'var(--space-4)' }}>
                    {messages.length === 0 ? (
                      <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        <p style={{ marginBottom: 'var(--space-2)' }}>Chat with your AI business mentor about this scenario.</p>
                        <p style={{ fontSize: '0.8125rem' }}>They won&apos;t give answers — they&apos;ll help you think.</p>
                      </div>
                    ) : (
                      messages.map((msg, i) => (
                        <div key={i} style={{
                          padding: 'var(--space-3)',
                          marginBottom: 'var(--space-2)',
                          background: msg.role === 'user' ? 'var(--primary-50)' : 'transparent',
                          borderRadius: 'var(--radius-md)',
                        }}>
                          <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 'var(--space-1)' }}>
                            {msg.role === 'user' ? 'You' : 'AI Mentor'}
                          </div>
                          <div style={{ fontSize: '0.9375rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="flex gap-3">
                    <input
                      type="text"
                      className="input"
                      placeholder="Ask your mentor a question..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      disabled={streaming}
                    />
                    <button className="btn btn-primary" onClick={sendMessage} disabled={streaming || !chatInput.trim()}>
                      {streaming ? '...' : 'Send'}
                    </button>
                  </div>
                </div>
              )}

              {/* Approach Tab */}
              {activeTab === 'approach' && !evaluation && (
                <div className="workspace-panel" style={{ borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', borderTop: 'none' }}>
                  <textarea
                    className="input textarea"
                    placeholder="Write your approach to this challenge. Be specific — explain your reasoning, your framework, and your action steps."
                    value={userApproach}
                    onChange={(e) => setUserApproach(e.target.value)}
                    style={{ minHeight: '250px', marginBottom: 'var(--space-4)' }}
                    disabled={evaluating}
                  />
                  <button
                    className="btn btn-accent"
                    onClick={submitEvaluation}
                    disabled={evaluating || userApproach.trim().length < 50}
                    style={{ width: '100%' }}
                  >
                    {evaluating ? 'AI is evaluating...' : 'Submit for AI Evaluation'}
                  </button>
                  {userApproach.trim().length > 0 && userApproach.trim().length < 50 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)', textAlign: 'center' }}>
                      Write at least 50 characters for a meaningful evaluation
                    </p>
                  )}
                </div>
              )}

              {/* Evaluation Results */}
              {evaluation && (
                <div className="workspace-panel fade-in" style={{
                  borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
                  borderTop: 'none',
                  borderLeft: '3px solid var(--accent-500)',
                  background: 'var(--accent-50)',
                }}>
                  <div className="workspace-panel-label">AI Evaluation</div>

                  {/* Score */}
                  <div className="flex items-center gap-4" style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="score-ring" style={{ borderColor: scoreColor(evaluation.score) }}>
                      <span className="score-ring-value" style={{ color: scoreColor(evaluation.score) }}>
                        {evaluation.score}
                      </span>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: 0 }}>{evaluation.summary}</p>
                    </div>
                  </div>

                  {/* Score Breakdown */}
                  <div className="score-bar-container" style={{ marginBottom: 'var(--space-4)' }}>
                    {evaluation.dimensions?.map((dim, i) => {
                      const key = evaluation.dimension_keys?.[i];
                      const val = key ? evaluation.score_breakdown[key] || 0 : 0;
                      return (
                        <div key={dim} className="score-bar-row">
                          <span className="score-bar-label">{dim}</span>
                          <div className="score-bar">
                            <div className="score-bar-fill" style={{ width: `${(val / 25) * 100}%` }} />
                          </div>
                          <span className="score-bar-value">{val}/25</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Strengths */}
                  {evaluation.strengths?.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-3)' }}>
                      <div className="workspace-panel-label">Strengths</div>
                      <div className="flex flex-wrap">
                        {evaluation.strengths.map((s, i) => (
                          <span key={i} className="eval-tag eval-tag-strength">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Gaps */}
                  {evaluation.gaps?.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-3)' }}>
                      <div className="workspace-panel-label">Knowledge Gaps</div>
                      <div className="flex flex-wrap">
                        {evaluation.gaps.map((g, i) => (
                          <span key={i} className="eval-tag eval-tag-gap">{g}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Growth Areas */}
                  {evaluation.growth_areas?.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-3)' }}>
                      <div className="workspace-panel-label">Growth Areas</div>
                      <div className="flex flex-wrap">
                        {evaluation.growth_areas.map((g, i) => (
                          <span key={i} className="eval-tag eval-tag-growth">{g}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Coaching Note */}
                  {evaluation.coaching_note && (
                    <div className="coaching-note" style={{ marginTop: 'var(--space-4)' }}>
                      <strong style={{ color: 'var(--accent-500)' }}>Coach:</strong> {evaluation.coaching_note}
                    </div>
                  )}

                  {/* Try Again */}
                  <button
                    className="btn btn-secondary"
                    onClick={() => { setEvaluation(null); setUserApproach(''); }}
                    style={{ marginTop: 'var(--space-4)', width: '100%' }}
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
