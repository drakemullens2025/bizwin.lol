'use client';

import { useUser } from '@stackframe/stack';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Store {
  id: string;
  slug: string;
  store_name: string;
  description: string;
  is_published: boolean;
  is_primary: boolean;
  template_id: string | null;
  created_at: string;
  product_count?: number;
}

export default function StoresPage() {
  const user = useUser();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return;

    async function fetchStores() {
      try {
        const res = await fetch('/api/stores', {
          headers: { 'x-user-id': user!.id },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load stores');
        setStores(json.stores || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load stores');
      } finally {
        setLoading(false);
      }
    }

    fetchStores();
  }, [user]);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-8)' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-8)', maxWidth: '1200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
            My Stores
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Manage your storefronts. Create multiple stores for different niches.
          </p>
        </div>
        <Link href="/stores/new" className="btn btn-primary">
          + Create New Store
        </Link>
      </div>

      {error && (
        <div style={{
          padding: 'var(--space-4)',
          background: 'var(--error-bg, #fef2f2)',
          color: 'var(--error, #dc2626)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-4)',
        }}>
          {error}
        </div>
      )}

      {stores.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-16) var(--space-8)',
          background: 'var(--surface-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '2px dashed var(--border-primary)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-4)' }}>+</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
            No stores yet
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', maxWidth: '400px', margin: '0 auto var(--space-6)' }}>
            Create your first storefront to start selling products. Choose from professional templates to get started quickly.
          </p>
          <Link href="/stores/new" className="btn btn-primary">
            Create Your First Store
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 'var(--space-4)',
        }}>
          {stores.map((store) => (
            <Link
              key={store.id}
              href={`/store/setup?store_id=${store.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  background: 'var(--surface-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-5)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-500)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-primary)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
                      {store.store_name}
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                      /{store.slug}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    {store.is_primary && (
                      <span style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        background: 'var(--accent-100, #dbeafe)',
                        color: 'var(--accent-700, #1d4ed8)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        Primary
                      </span>
                    )}
                    <span style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: store.is_published ? '#dcfce7' : '#fef3c7',
                      color: store.is_published ? '#166534' : '#92400e',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      {store.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>

                {store.description && (
                  <p style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    marginBottom: 'var(--space-3)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {store.description}
                  </p>
                )}

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: 'var(--space-3)',
                  borderTop: '1px solid var(--border-primary)',
                  fontSize: '0.8125rem',
                  color: 'var(--text-tertiary)',
                }}>
                  <span>
                    Template: {store.template_id || 'Custom'}
                  </span>
                  <span>
                    Created {new Date(store.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
