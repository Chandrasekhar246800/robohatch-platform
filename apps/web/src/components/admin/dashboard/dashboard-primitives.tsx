"use client";

import React from 'react';
import { ArrowUpRight, AlertTriangle, Clock3, Gauge, Sparkles, ShoppingCart, Package, MessageSquareMore } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge, Button, Card, CardContent } from '@/components/ui';
import { cn, formatPrice, formatDate } from '@/lib/utils';

type Tone = 'danger' | 'warning' | 'info' | 'success';

export function StatusBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const styles: Record<Tone, string> = {
    danger: 'bg-red-100 text-red-700',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
  };

  return <Badge variant="default" className={cn('border-0', styles[tone])}>{children}</Badge>;
}

export function MetricCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = 'info',
}: {
  title: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  const toneStyles: Record<Tone, string> = {
    danger: 'bg-red-50 text-red-600',
    warning: 'bg-yellow-50 text-yellow-700',
    info: 'bg-blue-50 text-blue-600',
    success: 'bg-green-50 text-green-600',
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{helper}</p>
          </div>
          <div className={cn('rounded-2xl p-3', toneStyles[tone])}>
            <Icon size={18} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TrendCard({
  title,
  value,
  trend,
  helper,
}: {
  title: string;
  value: string;
  trend: string;
  helper: string;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <ArrowUpRight size={12} /> {trend}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">{helper}</p>
      </CardContent>
    </Card>
  );
}

export function AlertCard({
  title,
  detail,
  tone = 'warning',
  action,
}: {
  title: string;
  detail: string;
  tone?: Tone;
  action?: string;
}) {
  const toneStyles: Record<Tone, string> = {
    danger: 'border-red-200 bg-red-50',
    warning: 'border-yellow-200 bg-yellow-50',
    info: 'border-blue-200 bg-blue-50',
    success: 'border-green-200 bg-green-50',
  };

  return (
    <div className={cn('rounded-2xl border p-4', toneStyles[tone])}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={cn('mt-0.5', tone === 'danger' ? 'text-red-600' : tone === 'info' ? 'text-blue-600' : tone === 'success' ? 'text-green-600' : 'text-yellow-600')} size={18} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm text-slate-600">{detail}</p>
          {action && <p className="mt-2 text-xs font-medium text-slate-700">{action}</p>}
        </div>
      </div>
    </div>
  );
}

export function QueueCard({
  title,
  count,
  subtitle,
  items,
  emptyLabel,
  actionLabel,
  onAction,
}: {
  title: string;
  count: number;
  subtitle: string;
  items: Array<{ id: string; title: string; detail: string; tone?: Tone; actions?: Array<{ label: string; aria?: string; onClick?: () => void }> }>;
  emptyLabel: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card className="border-slate-200 shadow-sm h-full">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">{count} items</h3>
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-2">
            <Clock3 className="text-slate-500" size={18} />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {items.length > 0 ? items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-600">{item.detail}</p>
                </div>
                <div className="flex items-center gap-2">
                  {item.actions?.map((a, i) => (
                    <button key={i} type="button" onClick={a.onClick} aria-label={a.aria} className="rounded-md bg-white/60 px-2 py-1 text-sm text-slate-700 hover:bg-white">
                      {a.label}
                    </button>
                  ))}
                  {item.tone ? <StatusBadge tone={item.tone}>{item.tone}</StatusBadge> : null}
                </div>
              </div>
            </div>
          )) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
              {emptyLabel}
            </div>
          )}
        </div>

        {actionLabel && onAction && (
          <Button variant="secondary" className="mt-4 w-full" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function QuickActionButton({
  label,
  helper,
  icon: Icon,
  onClick,
}: {
  label: string;
  helper: string;
  icon: LucideIcon;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-primary/30 hover:shadow-md"
    >
      <div className="rounded-2xl bg-primary/10 p-3 text-primary">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="mt-1 text-xs text-slate-500">{helper}</p>
      </div>
      <Sparkles size={16} className="text-slate-300" />
    </button>
  );
}

export function formatMetricPrice(value: number) {
  return formatPrice(value);
}

export function formatOrderDate(date?: string) {
  return date ? formatDate(date) : 'Today';
}

export function QueueSummaryBadge({ label }: { label: string }) {
  return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{label}</span>;
}
