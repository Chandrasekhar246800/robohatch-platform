"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Package, CheckCircle, Truck, XCircle, Archive } from 'lucide-react';
import { Button, Card, CardContent, Badge, useToast } from '@/components/ui';
import { apiClient } from '@/lib/api-client';
import { formatDate, formatPrice } from '@/lib/utils';

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<any | null>(null);
  const { push: pushToast } = useToast();
  const [savingLocal, setSavingLocal] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getOrder(orderId);
        setOrder(response?.data || response?.order || null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [orderId]);

  const updateStatus = async (status: string) => {
    try {
      setSaving(true);
      await apiClient.updateOrderStatus(orderId, status);
      const response = await apiClient.getOrder(orderId);
      setOrder(response?.data || response?.order || null);
    } finally {
      setSaving(false);
    }
  };

  const optimisticUpdate = async (status: string) => {
    if (!order) return;
    const prev = order;
    setOrder({ ...order, status });
    setSavingLocal(true);

    try {
      await apiClient.updateOrderStatus(orderId, status);
      pushToast({ message: `Order ${orderId.slice(0,8)} updated to ${status}`, kind: 'success', duration: 3000 });
    } catch (err: any) {
      setOrder(prev);
      pushToast({ message: `Failed to update: ${err?.message || 'Network error'}`, kind: 'error', duration: 5000 });
    } finally {
      setSavingLocal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="mr-2 animate-spin" size={18} /> Loading order...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" onClick={() => router.push('/admin/orders')}>
          <ArrowLeft size={16} className="mr-2" /> Back to orders
        </Button>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-8 text-center text-slate-500">Order not found.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="secondary" onClick={() => router.push('/admin/orders')}>
            <ArrowLeft size={16} className="mr-2" /> Back to orders
          </Button>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
          <p className="mt-1 text-sm text-slate-500">Detailed order visibility and fulfillment controls.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Mark Paid"
            onClick={() => void optimisticUpdate('PAID')}
            disabled={saving || savingLocal}
            className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700 hover:bg-emerald-100"
          >
            <CheckCircle size={16} />
          </button>

          <button
            type="button"
            title="Mark Shipped"
            onClick={() => void optimisticUpdate('SHIPPED')}
            disabled={saving || savingLocal}
            className="rounded-md bg-sky-50 px-2 py-1 text-sky-700 hover:bg-sky-100"
          >
            <Truck size={16} />
          </button>

          <button
            type="button"
            title="Mark Delivered"
            onClick={() => void optimisticUpdate('DELIVERED')}
            disabled={saving || savingLocal}
            className="rounded-md bg-blue-50 px-2 py-1 text-blue-700 hover:bg-blue-100"
          >
            <Archive size={16} />
          </button>

          <button
            type="button"
            title="Cancel"
            onClick={() => void optimisticUpdate('CANCELLED')}
            disabled={saving || savingLocal}
            className="rounded-md bg-red-50 px-2 py-1 text-red-700 hover:bg-red-100"
          >
            <XCircle size={16} />
          </button>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Order status</p>
                <Badge variant="info" className="mt-2">{order.status || 'PENDING'}</Badge>
              </div>
              <Package className="text-primary" />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Placed</p>
                <p className="mt-1 font-medium text-slate-900">{formatDate(order.createdAt || new Date())}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Customer</p>
                <p className="mt-1 font-medium text-slate-900">{order.user?.email || 'Guest'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Total</p>
                <p className="mt-1 font-medium text-slate-900">{formatPrice(order.totalAmount || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Items</p>
                <p className="mt-1 font-medium text-slate-900">{order.items?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500">Queue actions</p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>• Update status from this panel.</p>
              <p>• Use this view as the future foundation for fulfillment notes.</p>
              <p>• The order detail route is in place without altering current checkout behavior.</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {(order.items || []).map((item: any) => (
              <div key={item.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div>
                  <p className="font-semibold text-slate-900">{item.productName || 'Product'}</p>
                  <p className="mt-1 text-sm text-slate-500">Quantity: {item.quantity}</p>
                </div>
                <p className="font-medium text-slate-900">{formatPrice((item.price || 0) * (item.quantity || 1))}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}