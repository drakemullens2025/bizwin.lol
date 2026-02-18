'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@stackframe/stack';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: '~' },
  { section: 'LEARN' },
  { label: 'Tier 0: Foundation', href: '/learn/0', icon: '>' },
  { label: 'Tier 1: Builder', href: '/learn/1', icon: '#' },
  { label: 'Tier 2: Operator', href: '/learn/2', icon: '!' },
  { label: 'Tier 3: Scale', href: '/learn/3', icon: '*' },
  { section: 'COMMERCE' },
  { label: 'Catalog', href: '/catalog', icon: '?' },
  { label: 'Stores', href: '/stores', icon: '+' },
  { label: 'Products', href: '/store/products', icon: '=' },
  { label: 'Orders', href: '/store/orders', icon: '@' },
  { label: 'Intelligence', href: '/intelligence', icon: '%' },
  { label: 'Analytics', href: '/analytics', icon: '|' },
  { section: 'COMPETE' },
  { label: 'Leaderboard', href: '/leaderboard', icon: '^' },
  { label: 'Challenges', href: '/challenges', icon: '!' },
  { section: 'COMMUNITY' },
  { label: 'Portfolio', href: '/portfolio', icon: '@' },
  { label: 'Cohorts', href: '/cohorts', icon: '&' },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user === null) {
      router.push('/handler/sign-in');
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="platform-layout">
      {/* Sidebar */}
      <aside className="platform-sidebar">
        <div className="platform-sidebar-header">
          <img src="/roboticon.jpg" alt="bizwin.lol" style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)' }} />
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>bizwin.lol</span>
        </div>

        <nav className="platform-sidebar-nav">
          {navItems.map((item, i) => {
            if ('section' in item) {
              return <div key={i} className="sidebar-section-label">{item.section}</div>;
            }
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href!}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', width: '20px', textAlign: 'center' }}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="platform-sidebar-footer">
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)' }}>
            {user.displayName || user.primaryEmail}
          </div>
          <button
            onClick={() => user.signOut()}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="platform-main">
        {children}
      </main>
    </div>
  );
}
