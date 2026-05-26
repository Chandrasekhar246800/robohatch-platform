"use client";

import React from 'react';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">Actionable analytics land in phase 3.</p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-8 text-center">
          <BarChart3 className="mx-auto text-primary" size={34} />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Analytics cockpit reserved</h2>
          <p className="mt-2 text-sm text-slate-500">The future view will focus on revenue, conversion, and queue health rather than vanity metrics.</p>
        </CardContent>
      </Card>
    </div>
  );
}