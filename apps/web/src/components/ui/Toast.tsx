"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

type ToastKind = 'success' | 'error' | 'info';

type Toast = {
  id: string;
  message: string;
  kind?: ToastKind;
  duration?: number;
};

type ToastContextValue = {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9);
    const toast: Toast = { id, ...t };
    setToasts((s) => [toast, ...s]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((s) => s.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss }}>
      {children}
      <ToastShelf toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

function ToastShelf({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timers: Array<{ id: string; timeout: number }> = [];
    toasts.forEach((t) => {
      if (!t.duration) return;
      const timeout = window.setTimeout(() => onDismiss(t.id), t.duration);
      timers.push({ id: t.id, timeout });
    });
    return () => timers.forEach((t) => clearTimeout(t.timeout));
  }, [toasts, onDismiss]);

  return (
    <div className="fixed right-4 top-4 z-50 flex max-w-sm flex-col gap-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={
            'rounded-lg border p-3 shadow-md text-sm ' +
            (t.kind === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : t.kind === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-white border-slate-200 text-slate-900')
          }
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">{t.message}</div>
            <button type="button" onClick={() => onDismiss(t.id)} className="text-slate-500 hover:text-slate-700">×</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ToastProvider;
