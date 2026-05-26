"use client";

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, Badge } from '@/components/ui';
import { apiClient } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';

export default function AdminInventoryPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getProducts();
        setProducts(response?.data || []);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const lowStock = products.filter((product) => (product.stock ?? 0) <= 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Inventory</h1>
        <p className="mt-1 text-sm text-slate-500">Low-stock visibility and reorder risk.</p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="mr-2 animate-spin" size={18} /> Loading inventory...
            </div>
          ) : lowStock.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-500">No low-stock items detected.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {lowStock.map((product) => (
                <div key={product.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div>
                    <p className="font-semibold text-slate-900">{product.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{product.category?.name || 'Uncategorized'}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={(product.stock ?? 0) <= 2 ? 'danger' : 'warning'}>
                      {product.stock ?? 0} in stock
                    </Badge>
                    <p className="mt-2 text-sm text-slate-500">{formatPrice(product.price || 0)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
        <div className="flex items-center gap-2 font-semibold text-slate-700">
          <AlertTriangle size={16} className="text-yellow-600" />
          Reorder automation and stock alerts will come in the next phase.
        </div>
      </div>
    </div>
  );
}