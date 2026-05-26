"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, Shield, Bell, RefreshCw, LayoutDashboard, Package, ShoppingCart, Users, Upload, MessageSquare, BarChart3, Settings2, FolderTree } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { AdminSummaryProvider, useAdminSummaryContext } from './AdminSummaryProvider';
import { AlertCard, QueueSummaryBadge } from './dashboard/dashboard-primitives';

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  countKey?: 'pendingOrders' | 'lowStockCount';
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingCart, countKey: 'pendingOrders' },
  { label: 'Customers', href: '/admin/customers', icon: Users },
  { label: 'Products', href: '/admin/products', icon: Package },
  { label: 'Uploads', href: '/admin/uploads', icon: Upload },
  { label: 'Support', href: '/admin/support', icon: MessageSquare },
  { label: 'Inventory', href: '/admin/inventory', icon: FolderTree, countKey: 'lowStockCount' },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Categories', href: '/admin/categories', icon: FolderTree },
  { label: 'Settings', href: '/admin/settings', icon: Settings2 },
];

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated, logout } = useAuthStore();
  const summary = useAdminSummaryContext();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/login?redirect=/admin');
      return;
    }

    if (user?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [router, _hasHydrated, isAuthenticated, user?.role]);

  useEffect(() => {
    const saved = window.localStorage.getItem('robohatch-admin-sidebar-collapsed');
    if (saved) {
      setCollapsed(saved === '1');
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('robohatch-admin-sidebar-collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  const routeLabel = useMemo(() => {
    const item = NAV_ITEMS.find((nav) => nav.href === pathname || (nav.href !== '/admin' && pathname?.startsWith(nav.href)));
    return item?.label || 'Founder Cockpit';
  }, [pathname]);

  if (!_hasHydrated || !isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <Shield className="mx-auto text-primary" size={36} />
          <p className="mt-4 text-sm text-slate-600">Checking authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 flex h-full w-72 flex-col border-r border-slate-200 bg-slate-950 text-white transition-transform duration-300 lg:static lg:translate-x-0',
            collapsed ? 'lg:w-20' : 'lg:w-72',
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">RoboHatch</div>
              <div className={cn('mt-1 text-lg font-semibold', collapsed ? 'lg:hidden' : 'lg:block')}>Founder Cockpit</div>
            </div>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden"
              aria-label="Close navigation"
            >
              <Menu size={18} className="rotate-90" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname === item.href || pathname?.startsWith(`${item.href}/`);

                const count = item.countKey ? summary[item.countKey] : null;

                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => {
                      router.push(item.href);
                      setMobileSidebarOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition',
                      active ? 'bg-white text-slate-950 shadow-lg' : 'text-white/75 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <item.icon size={18} className={cn(active ? 'text-primary' : 'text-white/60')} />
                    <span className={cn('flex-1 truncate', collapsed && 'lg:hidden')}>{item.label}</span>
                    {typeof count === 'number' && count > 0 ? (
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', active ? 'bg-primary/10 text-primary' : 'bg-white/10 text-white')}>
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>

            <div className={cn('mt-6 rounded-2xl border border-white/10 bg-white/5 p-4', collapsed && 'lg:hidden')}>
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">Today</p>
              <div className="mt-3 space-y-2 text-sm text-white/85">
                <div className="flex items-center justify-between">
                  <span>Pending orders</span>
                  <QueueSummaryBadge label={String(summary.pendingOrders)} />
                </div>
                <div className="flex items-center justify-between">
                  <span>Low stock</span>
                  <QueueSummaryBadge label={String(summary.lowStockCount)} />
                </div>
                <div className="flex items-center justify-between">
                  <span>Revenue</span>
                  <QueueSummaryBadge label={`₹${Math.round(summary.totalRevenue).toLocaleString('en-IN')}`} />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 p-4">
            <Button variant="secondary" className="w-full justify-center border-white/15 bg-white/10 text-white hover:bg-white/15" onClick={() => router.push('/admin/products/add')}>
              Add Product
            </Button>
            <Button variant="ghost" className="mt-2 w-full justify-center text-white/70 hover:bg-white/10 hover:text-white" onClick={logout}>
              Sign Out
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen((state) => !state)}
                className="rounded-xl border border-slate-200 p-2 text-slate-700 lg:hidden"
                aria-label="Toggle navigation"
              >
                <Menu size={18} />
              </button>

              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{routeLabel}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span>{user?.name || user?.email || 'Admin'}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">Operational cockpit</span>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-2">
                <Button variant="secondary" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={() => router.push('/admin/orders')}>
                  Open orders
                </Button>
                <Button variant="secondary" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={() => router.push('/admin/products/add')}>
                  Quick add
                </Button>
                <button type="button" onClick={summary.refresh} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="Refresh summary">
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 sm:px-6 lg:px-8">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-medium text-slate-700 shadow-sm">
                  <Bell size={12} className="text-primary" /> {summary.pendingOrders} pending orders
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-medium text-slate-700 shadow-sm">
                  <Package size={12} className="text-primary" /> {summary.lowStockCount} low-stock items
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-medium text-slate-700 shadow-sm">
                  <ShoppingCart size={12} className="text-primary" /> {summary.totalOrders} total orders
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
              {summary.error && (
                <AlertCard
                  tone="danger"
                  title="Admin summary failed to load"
                  detail={summary.error}
                  action="Existing admin routes remain available"
                />
              )}

              <AdminAlertStrip />
              {children}
            </div>
          </main>
        </div>
      </div>

      {mobileSidebarOpen ? <div className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setMobileSidebarOpen(false)} /> : null}
    </div>
  );
}

function AdminAlertStrip() {
  const summary = useAdminSummaryContext();

  if (summary.urgentActions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
            <Shield size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">No urgent actions right now</p>
            <p className="text-sm text-slate-500">The founder cockpit is active. New operational queues will surface automatically.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {summary.urgentActions.map((action) => (
        <AlertCard
          key={action.id}
          title={action.title}
          detail={action.detail}
          tone={action.tone}
          action="Open the relevant queue from the sidebar"
        />
      ))}
    </div>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminSummaryProvider>
      <AdminShellInner>{children}</AdminShellInner>
    </AdminSummaryProvider>
  );
}