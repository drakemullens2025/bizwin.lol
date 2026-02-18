'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useUser } from '@stackframe/stack';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const user = useUser();
  const pitchRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const scrollToPitch = () => {
    pitchRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ background: 'hsl(220, 25%, 4%)' }}>
      {/* ========== HERO — FULL VIEWPORT ========== */}
      <section style={{
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Background image */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/robots2.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          backgroundRepeat: 'no-repeat',
        }} />

        {/* Top gradient — just enough for nav readability */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '180px',
          background: 'linear-gradient(to bottom, hsla(220, 25%, 4%, 0.85), transparent)',
          zIndex: 2,
        }} />

        {/* Bottom gradient — text area, leaves center robots visible */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: '45%',
          background: 'linear-gradient(to top, hsla(220, 25%, 4%, 0.95) 20%, hsla(220, 25%, 4%, 0.6) 60%, transparent)',
          zIndex: 2,
        }} />

        {/* Nav — minimal, floating */}
        <nav style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.25rem 2rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img
              src="/roboticon.jpg"
              alt="bizwin.lol"
              style={{ width: 36, height: 36, borderRadius: '8px' }}
            />
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '1.25rem',
              color: 'white',
              letterSpacing: '-0.02em',
            }}>bizwin.lol</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {user ? (
              <Link href="/dashboard" className="btn btn-accent btn-sm">Dashboard</Link>
            ) : (
              <Link href="/handler/sign-in" className="btn btn-accent btn-sm">Get Started</Link>
            )}
          </div>
        </nav>

        {/* Hero content — bottom area */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          marginTop: 'auto',
          padding: '0 2rem 6rem',
          maxWidth: '720px',
        }}>
          <div className={mounted ? 'fade-in' : ''} style={{ opacity: mounted ? 1 : 0 }}>
            <h1 style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.05,
              marginBottom: '1rem',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.03em',
            }}>
              Build the business.<br />
              <span style={{ color: 'hsl(165, 80%, 50%)' }}>AI coaches every move.</span>
            </h1>
            <p style={{
              fontSize: '1.125rem',
              color: 'hsla(210, 30%, 95%, 0.7)',
              lineHeight: 1.6,
              marginBottom: '1.75rem',
              maxWidth: '540px',
            }}>
              Real products. Real store. Real orders. 400K+ SKUs from CJ Dropshipping, AI that evaluates every decision, and a scoring engine that turns hustle into credentials.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link
                href={user ? '/dashboard' : '/handler/sign-in'}
                className="btn btn-accent"
                style={{ fontSize: '1rem', padding: '0.875rem 2rem' }}
              >
                Start Building — Free
              </Link>
              <button
                onClick={scrollToPitch}
                className="btn btn-outline"
                style={{
                  fontSize: '1rem',
                  padding: '0.875rem 2rem',
                  color: 'hsla(210, 30%, 95%, 0.6)',
                  borderColor: 'hsla(210, 30%, 95%, 0.2)',
                }}
              >
                See the Pitch
              </button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <button
          onClick={scrollToPitch}
          aria-label="Scroll down"
          style={{
            position: 'absolute',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            animation: 'bounce 2s ease-in-out infinite',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="hsla(165, 80%, 50%, 0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </section>

      {/* ========== THE PITCH ========== */}
      <div ref={pitchRef} />

      {/* Transition line */}
      <div style={{
        height: '1px',
        background: 'linear-gradient(90deg, transparent, hsl(165, 80%, 50%, 0.3), transparent)',
      }} />

      {/* Pitch Section 1: The Problem */}
      <section style={{ padding: '6rem 2rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            color: 'hsl(165, 80%, 50%)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '1.5rem',
          }}>
            THE PROBLEM
          </p>
          <h2 style={{
            fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
            fontWeight: 800,
            color: 'white',
            lineHeight: 1.15,
            marginBottom: '2rem',
          }}>
            Business education is broken.<br />
            <span style={{ color: 'var(--text-tertiary)' }}>Courses teach theory. Markets reward execution.</span>
          </h2>
          <p style={{
            fontSize: '1.125rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.8,
            marginBottom: '1rem',
          }}>
            MBA programs charge $150K to teach case studies from 2004. YouTube gurus sell &ldquo;dropshipping secrets&rdquo; that are just screenshots of Shopify dashboards. Bootcamps hand you a certificate and wish you luck.
          </p>
          <p style={{
            fontSize: '1.125rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.8,
          }}>
            Nobody teaches you to run a business <em>by actually running one</em> — with real inventory, real pricing decisions, real fulfillment, and a coach that never sleeps.
          </p>
        </div>
      </section>

      {/* Pitch Section 2: The Solution */}
      <section style={{
        padding: '6rem 2rem',
        borderTop: '1px solid hsla(220, 15%, 20%, 0.5)',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            color: 'hsl(165, 80%, 50%)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '1.5rem',
          }}>
            THE PLAY
          </p>
          <h2 style={{
            fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
            fontWeight: 800,
            color: 'white',
            lineHeight: 1.15,
            marginBottom: '2.5rem',
          }}>
            Your store is your classroom.<br />
            Every decision is graded.
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
          }}>
            {[
              {
                num: '01',
                title: '400K+ real products',
                desc: 'CJ Dropshipping\'s entire catalog. You pick what to sell, set your price, design the store. No simulations — this is live inventory.',
              },
              {
                num: '02',
                title: 'AI evaluates everything',
                desc: 'Price a product wrong? AI tells you why. Store design weak? AI rips it apart and coaches you through the fix. Every action scored across 4 dimensions.',
              },
              {
                num: '03',
                title: '60+ business scenarios',
                desc: 'Tiered challenges from Foundation to Scale. Plus AI generates personalized scenarios based on your store, your weaknesses, your niche.',
              },
              {
                num: '04',
                title: 'Compete & credential',
                desc: 'XP system, leaderboards, weekly challenges. Your portfolio of evaluated decisions becomes proof you can operate — not just theorize.',
              },
            ].map((item) => (
              <div key={item.num} style={{ padding: '1.5rem 0' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.875rem',
                  color: 'hsl(165, 80%, 50%)',
                  fontWeight: 700,
                }}>{item.num}</span>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'white',
                  margin: '0.5rem 0 0.75rem',
                }}>{item.title}</h3>
                <p style={{
                  fontSize: '0.9375rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                  marginBottom: 0,
                }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pitch Section 3: The Tiers */}
      <section style={{
        padding: '6rem 2rem',
        borderTop: '1px solid hsla(220, 15%, 20%, 0.5)',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            color: 'hsl(165, 80%, 50%)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '1.5rem',
          }}>
            PROGRESSION
          </p>
          <h2 style={{
            fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
            fontWeight: 800,
            color: 'white',
            lineHeight: 1.15,
            marginBottom: '2.5rem',
          }}>
            Four tiers. Zero fluff.
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {[
              { tier: 'TIER 0', name: 'Foundation', color: 'hsl(165, 80%, 50%)', tag: 'FREE', desc: 'Market analysis, product research, business math. Browse the full catalog. AI product advisor.' },
              { tier: 'TIER 1', name: 'Builder', color: 'hsl(220, 90%, 60%)', tag: '$19/mo', desc: 'Launch your store. Price products, design your brand, get AI critiques on every decision.' },
              { tier: 'TIER 2', name: 'Operator', color: 'hsl(38, 92%, 55%)', tag: '$39/mo', desc: 'Real orders, real fulfillment. Customer ops, marketing scenarios, supply chain intelligence.' },
              { tier: 'TIER 3', name: 'Scale', color: 'hsl(0, 0%, 70%)', tag: '$79/mo', desc: 'Multi-store. Automation. Advanced analytics. You\'re not learning anymore — you\'re operating.' },
            ].map((t) => (
              <div key={t.tier} style={{
                display: 'flex',
                gap: '1.5rem',
                alignItems: 'flex-start',
                padding: '1.5rem',
                border: '1px solid hsla(220, 15%, 20%, 0.5)',
                borderRadius: '12px',
                background: 'hsla(220, 20%, 11%, 0.5)',
              }}>
                <div style={{ flexShrink: 0, width: '72px' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6875rem',
                    fontWeight: 800,
                    color: t.color,
                    letterSpacing: '0.1em',
                  }}>{t.tier}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'white', marginBottom: 0 }}>{t.name}</h4>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      color: t.color,
                      fontWeight: 600,
                    }}>{t.tag}</span>
                  </div>
                  <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 0 }}>{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pitch Section 4: For Educators */}
      <section style={{
        padding: '6rem 2rem',
        borderTop: '1px solid hsla(220, 15%, 20%, 0.5)',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            color: 'hsl(165, 80%, 50%)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '1.5rem',
          }}>
            FOR EDUCATORS
          </p>
          <h2 style={{
            fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
            fontWeight: 800,
            color: 'white',
            lineHeight: 1.15,
            marginBottom: '1.5rem',
          }}>
            Classrooms that run like startups.
          </h2>
          <p style={{
            fontSize: '1.125rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.8,
            marginBottom: '2rem',
          }}>
            Create cohorts, set curriculum requirements, track every student&apos;s store and scenario performance in real time. Struggling student alerts. CSV exports. AI-evaluated work you don&apos;t have to grade yourself.
          </p>
          <div style={{
            display: 'flex',
            gap: '2rem',
            flexWrap: 'wrap',
          }}>
            {['Cohort management', 'Curriculum config', 'Student drill-down', 'Auto-graded scenarios', 'Performance alerts', 'CSV exports'].map((f) => (
              <span key={f} style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                padding: '0.5rem 1rem',
                border: '1px solid hsla(220, 15%, 20%, 0.5)',
                borderRadius: '999px',
              }}>{f}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{
        padding: '8rem 2rem',
        textAlign: 'center',
        borderTop: '1px solid hsla(220, 15%, 20%, 0.5)',
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 800,
            color: 'white',
            lineHeight: 1.1,
            marginBottom: '1.5rem',
          }}>
            Stop studying business.<br />
            <span style={{ color: 'hsl(165, 80%, 50%)' }}>Start running one.</span>
          </h2>
          <p style={{
            fontSize: '1.0625rem',
            color: 'var(--text-secondary)',
            marginBottom: '2rem',
          }}>
            Tier 0 is free. No credit card. Browse 400K products and prove you can operate.
          </p>
          <Link
            href={user ? '/dashboard' : '/handler/sign-in'}
            className="btn btn-accent"
            style={{ fontSize: '1.125rem', padding: '1rem 2.5rem' }}
          >
            Start Building — Free
          </Link>
        </div>
      </section>

      {/* Footer — minimal */}
      <footer style={{
        padding: '2rem',
        textAlign: 'center',
        borderTop: '1px solid hsla(220, 15%, 20%, 0.3)',
      }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginBottom: 0 }}>
          &copy; 2026 bizwin.lol. The store is the classroom.
        </p>
      </footer>
    </div>
  );
}
