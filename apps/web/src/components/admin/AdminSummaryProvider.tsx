"use client";

import React, { createContext, useContext } from 'react';
import { AdminSummary, useAdminSummary } from './hooks/useAdminSummary';

const AdminSummaryContext = createContext<AdminSummary | null>(null);

export function AdminSummaryProvider({ children }: { children: React.ReactNode }) {
  const summary = useAdminSummary();

  return (
    <AdminSummaryContext.Provider value={summary}>
      {children}
    </AdminSummaryContext.Provider>
  );
}

export function useAdminSummaryContext() {
  const context = useContext(AdminSummaryContext);

  if (!context) {
    throw new Error('useAdminSummaryContext must be used within AdminSummaryProvider');
  }

  return context;
}