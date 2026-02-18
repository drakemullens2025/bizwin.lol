'use client';

import { useUser } from '@stackframe/stack';
import { useState, useEffect } from 'react';

interface Order {
  id: string;
  order_number: string;
  customer_email: string;
  customer_name: string;
  line_items: Array<{ title: string; qty: number; price: number }>;
  subtotal: number;
  shipping_cost: number;
  total: number;
  status: string;
  tracking_number?: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: 'badge-warning',
  processing: 'badge-primary',
  shipped: 'badge-accent',
  delivered: 'badge-success',
  cancelled: 'badge-secondary',
};

export default function OrdersPage() {
  const user = useUser({ or: 'redirect' });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch('/api/store', { headers: { 'x-user-id': user.id } })
      .then(r => r.json())
      .then(data => {
        if (data.store) {
          return fetch(`/api/store/orders?store_id=${data.store.id}`)
            .then(r => r.json())
            .then(orderData => setOrders(orderData.orders || []));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <div className="empty-state" style={{ minHeight: '60vh' }}><div className="spinner" /></div>;
  }

  return (
    <div>
      <div className="platform-topbar">
        <div>
          <h4 style={{ margin: 0, fontSize: '1.125rem' }}>Orders</h4>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
            {orders.length} order{orders.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="platform-content" style={{ maxWidth: '100%' }}>
        {orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">@</div>
            <div className="empty-state-title">No Orders Yet</div>
            <div className="empty-state-desc">
              When customers purchase from your store, orders will appear here.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {/* Header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '120px 1fr 120px 100px 100px',
              gap: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)',
              fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: 'var(--text-tertiary)',
            }}>
              <div>Order</div>
              <div>Customer</div>
              <div>Total</div>
              <div>Status</div>
              <div>Date</div>
            </div>

            {orders.map(order => (
              <div key={order.id} className="card card-interactive" style={{
                display: 'grid', gridTemplateColumns: '120px 1fr 120px 100px 100px',
                gap: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)',
                alignItems: 'center',
              }} onClick={() => setSelectedOrder(order)}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 600 }}>
                  {order.order_number}
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{order.customer_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{order.customer_email}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                  ${order.total.toFixed(2)}
                </div>
                <div>
                  <span className={`badge ${statusColors[order.status] || 'badge-secondary'}`} style={{ fontSize: '0.6875rem' }}>
                    {order.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                  {new Date(order.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--space-4)',
        }} onClick={() => setSelectedOrder(null)}>
          <div className="card" style={{ maxWidth: '500px', width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
              <h5 style={{ margin: 0 }}>{selectedOrder.order_number}</h5>
              <button onClick={() => setSelectedOrder(null)} className="btn btn-ghost btn-sm">X</button>
            </div>

            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div className="workspace-panel-label">Customer</div>
              <div style={{ fontSize: '0.9375rem' }}>{selectedOrder.customer_name}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{selectedOrder.customer_email}</div>
            </div>

            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div className="workspace-panel-label">Items</div>
              {(Array.isArray(selectedOrder.line_items) ? selectedOrder.line_items : []).map((item, i) => (
                <div key={i} className="flex justify-between" style={{ fontSize: '0.875rem', padding: 'var(--space-1) 0' }}>
                  <span>{item.title} x{item.qty}</span>
                  <span>${(item.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)' }}>
              <div className="flex justify-between" style={{ fontSize: '0.875rem', marginBottom: 'var(--space-1)' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Subtotal</span>
                <span>${selectedOrder.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between" style={{ fontSize: '0.875rem', marginBottom: 'var(--space-1)' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Shipping</span>
                <span>${selectedOrder.shipping_cost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between" style={{ fontSize: '1rem', fontWeight: 700, marginTop: 'var(--space-2)' }}>
                <span>Total</span>
                <span>${selectedOrder.total.toFixed(2)}</span>
              </div>
            </div>

            {selectedOrder.tracking_number && (
              <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-md)' }}>
                <div className="workspace-panel-label">Tracking</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>
                  {selectedOrder.tracking_number}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
