"use client";

import React from 'react';
import { Megaphone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

export default function AdminMarketingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Marketing</h1>
        <p className="mt-1 text-sm text-slate-500">Campaign controls are deferred until the operations core is stable.</p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-8 text-center">
          <Megaphone className="mx-auto text-primary" size={34} />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Marketing workspace reserved</h2>
          <p className="mt-2 text-sm text-slate-500">This keeps the roadmap clean while the team ships the high-ROI cockpit core first.</p>
        </CardContent>
      </Card>
    </div>
  );
}