"use client";

import React from 'react';
import { Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

export default function AdminCustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Customers</h1>
        <p className="mt-1 text-sm text-slate-500">Customer intelligence is reserved for phase 2.</p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-8 text-center">
          <Users className="mx-auto text-primary" size={34} />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Customer profiles coming next</h2>
          <p className="mt-2 text-sm text-slate-500">This route is in place so the admin shell can scale without reshaping the route map later.</p>
        </CardContent>
      </Card>
    </div>
  );
}