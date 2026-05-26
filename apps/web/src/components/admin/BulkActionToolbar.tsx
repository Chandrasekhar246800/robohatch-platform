"use client";

import React from 'react';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui';

type Props = {
  selectedIds: string[];
  onBulkAction: (ids: string[], action: string) => Promise<{ successIds: string[]; failedIds: string[] }>;
  onExport?: (ids: string[]) => void;
  clearing?: boolean;
};

export default function BulkActionToolbar({ selectedIds, onBulkAction, onExport, clearing }: Props) {
  const { push } = useToast();
  const disabled = selectedIds.length === 0 || clearing;

  const run = async (action: string, confirmMessage?: string) => {
    if (disabled) return;
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    push({ message: `${action} started for ${selectedIds.length} orders`, kind: 'info', duration: 2000 });
    try {
      const result = await onBulkAction(selectedIds, action);
      if (result.failedIds.length === 0) {
        push({ message: `${action} completed for ${result.successIds.length} orders`, kind: 'success', duration: 3500 });
      } else {
        push({ message: `${action} partially completed: ${result.successIds.length} succeeded, ${result.failedIds.length} failed`, kind: 'error', duration: 6000 });
      }
    } catch (e: any) {
      push({ message: `${action} failed: ${e?.message || 'Network error'}`, kind: 'error', duration: 6000 });
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-40 w-[min(96%,900px)] -translate-x-1/2 rounded-lg bg-white/95 p-3 shadow-lg sm:static sm:translate-x-0 sm:flex sm:items-center sm:gap-3">
      <div className="flex-1 text-sm text-slate-700">{selectedIds.length} selected</div>
      <div className="flex gap-2">
        <Button onClick={() => run('Mark Paid') } disabled={disabled}>Mark Paid</Button>
        <Button onClick={() => run('Mark Shipped') } disabled={disabled}>Mark Shipped</Button>
        <Button onClick={() => run('Mark Delivered') } disabled={disabled}>Mark Delivered</Button>
        <Button variant="danger" onClick={() => run('Cancel Orders', 'Cancel selected orders? This cannot be undone.') } disabled={disabled}>Cancel</Button>
        <Button variant="secondary" onClick={() => onExport?.(selectedIds)} disabled={disabled}>Export</Button>
      </div>
    </div>
  );
}
