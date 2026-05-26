"use client";

import React from 'react';
import { Settings2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Core settings remain unchanged in Phase 1.</p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-8 text-center">
          <Settings2 className="mx-auto text-primary" size={34} />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Settings stay lightweight</h2>
          <p className="mt-2 text-sm text-slate-500">Authentication and production configuration are preserved exactly as they work today.</p>
        </CardContent>
      </Card>
    </div>
  );
}