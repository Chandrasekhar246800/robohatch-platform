"use client";

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';

type OrderRecord = {
  id: string;
  status?: string;
  totalAmount?: number;
  createdAt?: string;
  user?: { email?: string };
  items?: Array<{ id: string; productName?: string; quantity?: number }>;
};

type ProductRecord = {
  id: string;
  name: string;
  stock?: number;
  price?: number;
  category?: { name?: string };
  images?: Array<{ url: string }>;
};

export type AdminSummary = {
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalProducts: number;
  lowStockCount: number;
  lowStockProducts: ProductRecord[];
  recentOrders: OrderRecord[];
  urgentActions: Array<{
    id: string;
    title: string;
    detail: string;
    tone: 'danger' | 'warning' | 'info';
  }>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const emptySummary: AdminSummary = {
  totalOrders: 0,
  pendingOrders: 0,
  totalRevenue: 0,
  totalProducts: 0,
  lowStockCount: 0,
  lowStockProducts: [],
  recentOrders: [],
  urgentActions: [],
  isLoading: true,
  error: null,
  refresh: async () => undefined,
};

export function useAdminSummary(): AdminSummary {
  const [totalOrders, setTotalOrders] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState<ProductRecord[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = async () => {
    setRefreshToken((current) => current + 1);
  };

  useEffect(() => {
    let active = true;

    const loadSummary = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [ordersResponse, statsResponse, productsResponse] = await Promise.all([
          apiClient.getOrders(12, 0),
          apiClient.getOrderStats(),
          apiClient.getProducts(),
        ]);

        if (!active) return;

        const orders = ordersResponse?.data?.orders || ordersResponse?.orders || [];
        const stats = statsResponse?.data || statsResponse || {};
        const products = productsResponse?.data || [];

        const normalizedProducts = Array.isArray(products) ? (products as ProductRecord[]) : [];
        const normalizedOrders = Array.isArray(orders) ? (orders as OrderRecord[]) : [];
        const lowStock = normalizedProducts.filter((product) => (product.stock ?? 0) <= 5);
        const pending = typeof stats.pendingOrders === 'number'
          ? stats.pendingOrders
          : normalizedOrders.filter((order) => (order.status || '').toUpperCase() === 'PENDING').length;

        setTotalOrders(typeof stats.totalOrders === 'number' ? stats.totalOrders : normalizedOrders.length);
        setPendingOrders(pending);
        setTotalRevenue(typeof stats.totalSpent === 'number' ? stats.totalSpent : 0);
        setTotalProducts(normalizedProducts.length);
        setLowStockProducts(lowStock.slice(0, 6));
        setRecentOrders(normalizedOrders.slice(0, 6));
      } catch (loadError: any) {
        if (!active) return;
        setError(loadError?.message || 'Failed to load admin summary');
        setTotalOrders(0);
        setPendingOrders(0);
        setTotalRevenue(0);
        setTotalProducts(0);
        setLowStockProducts([]);
        setRecentOrders([]);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadSummary();

    return () => {
      active = false;
    };
  }, [refreshToken]);

  const urgentActions = useMemo(() => {
    const actions: AdminSummary['urgentActions'] = [];

    if (pendingOrders > 0) {
      actions.push({
        id: 'pending-orders',
        title: 'Review pending orders',
        detail: `${pendingOrders} order${pendingOrders === 1 ? '' : 's'} waiting for fulfillment`,
        tone: 'danger',
      });
    }

    if (lowStockProducts.length > 0) {
      actions.push({
        id: 'low-stock',
        title: 'Check low-stock products',
        detail: `${lowStockProducts.length} SKU${lowStockProducts.length === 1 ? '' : 's'} near reorder threshold`,
        tone: 'warning',
      });
    }

    if (totalOrders > 0) {
      actions.push({
        id: 'orders-inflow',
        title: 'Monitor today’s order flow',
        detail: `${totalOrders} total orders and ₹${Math.round(totalRevenue).toLocaleString('en-IN')} revenue tracked`,
        tone: 'info',
      });
    }

    return actions.slice(0, 3);
  }, [pendingOrders, lowStockProducts.length, totalOrders, totalRevenue]);

  return {
    totalOrders,
    pendingOrders,
    totalRevenue,
    totalProducts,
    lowStockCount: lowStockProducts.length,
    lowStockProducts,
    recentOrders,
    urgentActions,
    isLoading,
    error,
    refresh,
  };
}

export function useEmptyAdminSummary(): AdminSummary {
  return emptySummary;
}