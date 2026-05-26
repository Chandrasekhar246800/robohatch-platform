"use client";

import React from 'react';
import { Upload } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

export default function AdminUploadsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Uploads</h1>
        <p className="mt-1 text-sm text-slate-500">Upload approvals will connect in phase 2.</p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-8 text-center">
          <Upload className="mx-auto text-primary" size={34} />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Upload approval queue not yet active</h2>
          <p className="mt-2 text-sm text-slate-500">The cockpit reserves this lane for creator upload review without changing production behavior today.</p>
        </CardContent>
      </Card>
    </div>
  );
}