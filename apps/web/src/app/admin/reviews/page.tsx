"use client";

import React from 'react';
import { Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

export default function AdminReviewsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Reviews</h1>
        <p className="mt-1 text-sm text-slate-500">Review and reputation workflows are deferred for now.</p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-8 text-center">
          <Star className="mx-auto text-primary" size={34} />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Reviews module reserved</h2>
          <p className="mt-2 text-sm text-slate-500">No production behavior changes yet. The route is ready for later rollout.</p>
        </CardContent>
      </Card>
    </div>
  );
}