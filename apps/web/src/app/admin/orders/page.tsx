"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw, ShoppingCart, CheckCircle, Truck, XCircle, Archive } from 'lucide-react';
import { Button, Card, CardContent, Badge, useToast } from '@/components/ui';
import useBulkSelection from '@/components/admin/hooks/useBulkSelection';
import BulkActionToolbar from '@/components/admin/BulkActionToolbar';
import { apiClient } from '@/lib/api-client';
import { formatDate, formatPrice } from '@/lib/utils';

export default function AdminOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const { push: pushToast } = useToast();
  const { selectedMap, toggle, setAll, clear, selectedCount } = useBulkSelection([], 'orders-list');
  const [bulkLoading, setBulkLoading] = useState(false);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getOrders(20, 0);
      setOrders(response?.data?.orders || response?.orders || []);
    } finally {
      setLoading(false);
    }
  };

  const performOptimisticStatus = async (orderId: string, newStatus: string) => {
    const prev = orders.slice();
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return;

    const updated = { ...orders[idx], status: newStatus };
    const next = orders.slice();
    next[idx] = updated;
    setOrders(next);
    setSavingId(orderId);

    try {
      await apiClient.updateOrderStatus(orderId, newStatus);
      pushToast({ message: `Order ${orderId.slice(0,8)} marked ${newStatus}`, kind: 'success', duration: 3000 });
    } catch (err: any) {
      setOrders(prev);
      pushToast({ message: `Failed to update order: ${err?.message || 'Network error'}`, kind: 'error', duration: 5000 });
    } finally {
      setSavingId(null);
    }
  };

  const visibleIds = orders.map((o) => o.id);

  useEffect(() => {
    // initialize selection map for visible ids
    setAll(visibleIds, false);
  }, [visibleIds, setAll]);

  // Keyboard shortcut: Ctrl/Cmd + A selects visible rows
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setAll(visibleIds, true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visibleIds, setAll]);

  const performBulkAction = useCallback(async (ids: string[], action: string) => {
    setBulkLoading(true);
    const prev = orders.slice();
    // optimistic update
    const next = orders.map((o) => (ids.includes(o.id) ? { ...o, status: mapActionToStatus(action) } : o));
    setOrders(next);

    const successIds: string[] = [];
    const failedIds: string[] = [];

    for (const id of ids) {
      try {
        await apiClient.updateOrderStatus(id, mapActionToStatus(action));
        successIds.push(id);
      } catch (err) {
        failedIds.push(id);
      }
    }

    // rollback failed ones
    if (failedIds.length > 0) {
      const restored = prev.map((o) => (failedIds.includes(o.id) ? o : next.find((n) => n.id === o.id) || o));
      setOrders(restored);
    }

    // clear selection for succeeded
    failedIds.length === 0 ? clear() : null;
    setBulkLoading(false);

    return { successIds, failedIds };
  }, [orders, clear]);

  const mapActionToStatus = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes('paid')) return 'PAID';
    if (a.includes('shipped')) return 'SHIPPED';
    if (a.includes('delivered')) return 'DELIVERED';
    if (a.includes('cancel')) return 'CANCELLED';
    return 'PENDING';
  };

  const exportSelected = (ids: string[]) => {
    const rows = orders.filter((o) => ids.includes(o.id)).map((o) => ({ id: o.id, status: o.status, total: o.totalAmount, createdAt: o.createdAt }));
    const csv = [Object.keys(rows[0] || {}).join(','), ...rows.map((r) => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      setSavingId(orderId);
      await apiClient.updateOrderStatus(orderId, status);
      await loadOrders();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 data-testid="admin-orders-heading" className="text-3xl font-semibold text-slate-900">Orders</h1>
          <p className="mt-1 text-sm text-slate-500">Fulfillment queue and order visibility.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void loadOrders()}>
            <RefreshCw size={16} className="mr-2" /> Refresh
          </Button>
          <Button onClick={() => router.push('/admin')}>
            <ShoppingCart size={16} className="mr-2" /> Back to cockpit
          </Button>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="mr-2 animate-spin" size={18} /> Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-500">No orders yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {orders.map((order) => (
                <div key={order.id} className="grid gap-4 px-6 py-5 lg:grid-cols-[1.4fr_0.7fr_0.9fr] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input type="checkbox" checked={!!selectedMap[order.id]} onChange={(e) => toggle(order.id, e.target.checked)} className="mr-2" />
                      <p className="font-semibold text-slate-900">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                      <Badge variant="info">{order.status || 'PENDING'}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{formatDate(order.createdAt || new Date())}</p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-500">Total</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{formatPrice(order.totalAmount || 0)}</p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        title="Mark Paid"
                        onClick={() => void performOptimisticStatus(order.id, 'PAID')}
                        disabled={savingId === order.id}
                        className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700 hover:bg-emerald-100"
                      >
                        <CheckCircle size={16} />
                      </button>

                      <button
                        type="button"
                        title="Mark Shipped"
                        onClick={() => void performOptimisticStatus(order.id, 'SHIPPED')}
                        disabled={savingId === order.id}
                        className="rounded-md bg-sky-50 px-2 py-1 text-sky-700 hover:bg-sky-100"
                      >
                        <Truck size={16} />
                      </button>

                      <button
                        type="button"
                        title="Mark Delivered"
                        onClick={() => void performOptimisticStatus(order.id, 'DELIVERED')}
                        disabled={savingId === order.id}
                        className="rounded-md bg-blue-50 px-2 py-1 text-blue-700 hover:bg-blue-100"
                      >
                        <Archive size={16} />
                      </button>

                      <button
                        type="button"
                        title="Cancel"
                        onClick={() => void performOptimisticStatus(order.id, 'CANCELLED')}
                        disabled={savingId === order.id}
                        className="rounded-md bg-red-50 px-2 py-1 text-red-700 hover:bg-red-100"
                      >
                        <XCircle size={16} />
                      </button>

                      <Button variant="secondary" onClick={() => router.push(`/admin/orders/${order.id}`)}>
                        View details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <BulkActionToolbar selectedIds={Object.keys(selectedMap).filter((k) => selectedMap[k])} onBulkAction={performBulkAction} onExport={exportSelected} clearing={bulkLoading} />
    </div>
  );
}