"use client";

import React from 'react';
import { MessageSquareText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

export default function AdminSupportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Support</h1>
        <p className="mt-1 text-sm text-slate-500">Support visibility arrives in phase 2. This route is reserved now.</p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-8 text-center">
          <MessageSquareText className="mx-auto text-primary" size={34} />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Support queue placeholder</h2>
          <p className="mt-2 text-sm text-slate-500">
            The current system does not yet expose a support inbox. The cockpit shell keeps the route in place for the next rollout.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}