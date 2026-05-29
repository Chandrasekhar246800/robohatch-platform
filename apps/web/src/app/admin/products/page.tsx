"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, Plus, Edit2, Trash2, Package } from 'lucide-react';
import { Button, Card, CardContent, Badge } from '@/components/ui';
import { apiClient } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';

export default function AdminProductsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getProducts();
      setProducts((response?.data || []).filter((product: any) => product.isActive !== false));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`Delete ${productName}?`)) {
      return;
    }

    try {
      setDeletingId(productId);
      const response = await apiClient.deleteProduct(productId);
      if (response?.success || response?.deactivated) {
        await loadProducts();
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Products</h1>
          <p className="mt-1 text-sm text-slate-500">Catalog management remains fully available.</p>
        </div>
        <Button onClick={() => router.push('/admin/products/add')}>
          <Plus size={16} className="mr-2" /> Add product
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="mr-2 animate-spin" size={18} /> Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-500">
              <Package className="mx-auto mb-3 text-primary" size={32} />
              No products yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {products.map((product) => (
                <div key={product.id} className="grid gap-4 px-6 py-4 lg:grid-cols-[1.2fr_0.6fr_0.6fr_0.6fr] lg:items-center">
                  <div className="flex items-center gap-3">
                    <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-slate-100">
                      {product.images?.[0]?.url ? (
                        <Image src={product.images[0].url} alt={product.name} fill className="object-cover" />
                      ) : null}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{product.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{product.category?.name || 'Uncategorized'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-slate-500">Price</p>
                    <p className="mt-1 font-semibold text-slate-900">{formatPrice(product.price || 0)}</p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-500">Stock</p>
                    <Badge variant={(product.stock ?? 0) > 0 ? 'success' : 'danger'}>{product.stock ?? 0}</Badge>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => router.push(`/admin/products/edit/${product.id}`)}>
                      <Edit2 size={16} className="mr-2" /> Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => void handleDelete(product.id, product.name)}
                      disabled={deletingId === product.id}
                    >
                      <Trash2 size={16} className="mr-2" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}