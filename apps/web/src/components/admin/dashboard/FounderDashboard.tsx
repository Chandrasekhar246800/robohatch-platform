"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Package, ShoppingCart, Upload, MessageSquareText, Gauge, BadgeIndianRupee, AlertCircle, Clock3, TrendingUp, LayoutList } from 'lucide-react';
import { Button, Card, CardContent, useToast } from '@/components/ui';
import { apiClient } from '@/lib/api-client';
import { formatPrice, formatDate } from '@/lib/utils';
import { useAdminSummaryContext } from '../AdminSummaryProvider';
import { AlertCard, MetricCard, QueueCard, QuickActionButton, StatusBadge, TrendCard } from './dashboard-primitives';

export default function FounderDashboard() {
  const router = useRouter();
  const summary = useAdminSummaryContext();
  const { push: pushToast } = useToast();

  const pendingOrdersItems = summary.recentOrders.slice(0, 4).map((order) => ({
    id: order.id,
    title: `Order #${order.id.slice(0, 8).toUpperCase()}`,
    detail: `${order.items?.length || 0} item(s) · ${formatDate(order.createdAt || new Date())}`,
    tone: (order.status || '').toUpperCase() === 'PENDING' ? ('danger' as const) : ('info' as const),
    actions: [
      { label: 'Paid', aria: 'mark-paid', onClick: async () => {
        pushToast({ message: 'Marking paid...', kind: 'info', duration: 2000 });
        try {
          await apiClient.updateOrderStatus(order.id, 'PAID');
          pushToast({ message: 'Marked paid', kind: 'success', duration: 2500 });
          void summary.refresh();
        } catch (e: any) {
          pushToast({ message: `Failed: ${e?.message || 'Network'}`, kind: 'error', duration: 5000 });
        }
      } },
      { label: 'Ship', aria: 'mark-shipped', onClick: async () => {
        pushToast({ message: 'Marking shipped...', kind: 'info', duration: 2000 });
        try {
          await apiClient.updateOrderStatus(order.id, 'SHIPPED');
          pushToast({ message: 'Marked shipped', kind: 'success', duration: 2500 });
          void summary.refresh();
        } catch (e: any) {
          pushToast({ message: `Failed: ${e?.message || 'Network'}`, kind: 'error', duration: 5000 });
        }
      } }
    ],
  }));

  const lowStockItems = summary.lowStockProducts.map((product) => ({
    id: product.id,
    title: product.name,
    detail: `Stock ${product.stock ?? 0} · ${product.category?.name || 'Uncategorized'}`,
    tone: (product.stock ?? 0) <= 2 ? ('danger' as const) : ('warning' as const),
  }));

  const supportItems = summary.pendingOrders > 0
    ? [{ id: 'support-1', title: 'Customer response queue', detail: 'Link from order issues and shipping follow-ups', tone: 'warning' as const }]
    : [];

  const uploadItems = summary.totalProducts > 0
    ? [{ id: 'uploads-1', title: 'Upload approvals', detail: 'Phase 2 workflow will connect the review queue', tone: 'info' as const }]
    : [];

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <section className="grid gap-4 lg:grid-cols-[1.5fr_0.95fr]">
        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-slate-950 to-slate-800 text-white overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Founder Execution Cockpit</p>
                <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">What needs attention today?</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">
                  A queue-first operating view for orders, stock, support, and revenue so the founder can move faster with fewer clicks.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button className="bg-white text-slate-950 hover:bg-slate-100" onClick={() => router.push('/admin/orders')}>
                  Review orders
                </Button>
                <Button variant="secondary" className="border-white/20 bg-white/10 text-white hover:bg-white/15" onClick={() => router.push('/admin/products/add')}>
                  Add product
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Operational pulse</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">Today&apos;s status</p>
              </div>
              <Gauge className="text-primary" />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Pending orders</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.pendingOrders}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Low stock</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.lowStockCount}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Revenue</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{formatPrice(summary.totalRevenue)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Products</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <button type="button" onClick={() => router.push('/admin/orders')} className="text-left">
          <MetricCard title="Total orders" value={String(summary.totalOrders)} helper="All tracked orders" icon={ShoppingCart} tone="info" />
        </button>

        <button type="button" onClick={() => router.push('/admin/orders?status=PENDING')} className="text-left">
          <MetricCard title="Pending orders" value={String(summary.pendingOrders)} helper="Needs founder attention" icon={AlertCircle} tone="danger" />
        </button>

        <button type="button" onClick={() => router.push('/admin/orders?filter=paid')} className="text-left">
          <MetricCard title="Revenue" value={formatPrice(summary.totalRevenue)} helper="From order stats" icon={BadgeIndianRupee} tone="success" />
        </button>

        <button type="button" onClick={() => router.push('/admin/inventory?filter=low-stock')} className="text-left">
          <MetricCard title="Low-stock SKUs" value={String(summary.lowStockCount)} helper="Reorder risk" icon={Package} tone="warning" />
        </button>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <TrendCard title="Revenue trend" value={formatPrice(summary.totalRevenue)} trend="stable" helper="Initial phase uses order totals as the signal baseline" />
        <TrendCard title="Order flow" value={String(summary.pendingOrders)} trend="queue-first" helper="Surface the work that blocks fulfillment" />
        <TrendCard title="Operational focus" value="Founder cockpit" trend="active" helper="The dashboard should shorten decision time" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-4 xl:grid-cols-2">
          <QueueCard
            title="Pending orders queue"
            count={summary.pendingOrders}
            subtitle="Orders that need review, packing, or status movement"
            items={pendingOrdersItems}
            emptyLabel="No pending orders right now. New orders will surface here automatically."
            actionLabel="Open orders"
            onAction={() => router.push('/admin/orders')}
          />

          <QueueCard
            title="Low-stock queue"
            count={summary.lowStockCount}
            subtitle="SKUs close to the reorder threshold"
            items={lowStockItems}
            emptyLabel="No low-stock products yet. Inventory risk will appear here when stock falls."
            actionLabel="Open inventory"
            onAction={() => router.push('/admin/inventory')}
          />

          <QueueCard
            title="Upload approvals"
            count={summary.totalProducts > 0 ? 1 : 0}
            subtitle="Placeholder route for phase 2 rollout"
            items={uploadItems}
            emptyLabel="Upload approval workflow will connect in phase 2."
            actionLabel="Open uploads"
            onAction={() => router.push('/admin/uploads')}
          />

          <QueueCard
            title="Support visibility"
            count={summary.pendingOrders > 0 ? 1 : 0}
            subtitle="Quick view of support-related work"
            items={supportItems}
            emptyLabel="Support inbox and ticketing are added in phase 2."
            actionLabel="Open support"
            onAction={() => router.push('/admin/support')}
          />
        </div>

        <div className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Quick actions</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">Fastest founder moves</h2>
                </div>
                <LayoutList className="text-primary" />
              </div>

              <div className="mt-4 space-y-3">
                <QuickActionButton label="Review pending orders" helper="Jump straight to the fulfillment queue" icon={ShoppingCart} onClick={() => router.push('/admin/orders')} />
                <QuickActionButton label="Add a product" helper="Launch a new SKU quickly" icon={Package} onClick={() => router.push('/admin/products/add')} />
                <QuickActionButton label="Check inventory" helper="See low-stock items and risk" icon={BarChart3} onClick={() => router.push('/admin/inventory')} />
                <QuickActionButton label="Open categories" helper="Keep catalog organization current" icon={Upload} onClick={() => router.push('/admin/categories')} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Queue notes</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">Phase 1 scope</h2>
                </div>
                <Clock3 className="text-primary" />
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>• The current CRUD routes remain untouched.</p>
                <p>• The shell and dashboard only change navigation and visibility.</p>
                <p>• Advanced CRM and analytics stay deferred for later phases.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}