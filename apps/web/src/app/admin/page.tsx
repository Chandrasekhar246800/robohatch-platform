'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Package,
  ShoppingCart,
  Users,
  Upload,
  TrendingUp,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Database,
} from 'lucide-react';
import { Button, Badge, Card, CardContent, Input, AdminDashboardSkeleton } from '@/components/ui';
import { products, mockOrders } from '@/lib/mock-data';
import { formatPrice, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/lib/api-client';

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'products' | 'orders' | 'uploads'
  >('dashboard');
  const [orders, setOrders] = useState<any[]>([]);
  const [orderStats, setOrderStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check authentication and admin role
  useEffect(() => {
    if (mounted) {
      if (!isAuthenticated) {
        // Redirect to login without redirect parameter (user logged out)
        router.push('/login');
        return;
      }
      
      if (user?.role !== 'ADMIN') {
        router.push('/');
        return;
      }

      // Load data
      loadOrders();
      loadOrderStats();
    }
  }, [isAuthenticated, user, mounted, router]);

  const loadOrders = async () => {
    try {
      const response = await apiClient.getOrders(10, 0);
      // API returns { success, data: { orders, total, limit, offset } }
      const ordersData = response?.data?.orders || response?.orders || [];
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (error) {
      console.error('Failed to load orders:', error);
      setOrders([]);
    }
  };

  const loadOrderStats = async () => {
    try {
      const response = await apiClient.getOrderStats();
      // API returns { success, data: { totalOrders, pendingOrders, completedOrders, totalSpent } }
      const stats = response?.data || response;
      setOrderStats(stats);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load stats:', error);
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await apiClient.updateOrderStatus(orderId, newStatus);
      loadOrders();
      loadOrderStats();
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  if (!mounted || !isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-600">Checking authorization...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-8 bg-gray-50 min-h-screen">
        <div className="container-custom">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">Manage products, orders, and uploads</p>
          </div>
          <AdminDashboardSkeleton />
        </div>
      </div>
    );
  }

  // Real stats from backend
  const stats = {
    totalProducts: products.length,
    totalOrders: orderStats?.totalOrders || 0,
    totalRevenue: orderStats?.totalSpent || 0,
    pendingUploads: 3,
  };

  return (
    <div className="py-8 bg-gray-50 min-h-screen">
      <div className="container-custom">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage products, orders, and uploads</p>
        </div>

        {/* Stats Cards */}
        {activeTab === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Package className="text-primary" size={24} />
                  </div>
                  <TrendingUp className="text-green-500" size={20} />
                </div>
                <h3 className="text-gray-600 text-sm mb-1">Total Products</h3>
                <p className="text-3xl font-bold">{stats.totalProducts}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="text-accent" size={24} />
                  </div>
                  <TrendingUp className="text-green-500" size={20} />
                </div>
                <h3 className="text-gray-600 text-sm mb-1">Total Orders</h3>
                <p className="text-3xl font-bold">{stats.totalOrders}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="text-green-600" size={24} />
                  </div>
                  <TrendingUp className="text-green-500" size={20} />
                </div>
                <h3 className="text-gray-600 text-sm mb-1">Total Revenue</h3>
                <p className="text-3xl font-bold">
                  {formatPrice(stats.totalRevenue)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Upload className="text-yellow-600" size={24} />
                  </div>
                  <Clock className="text-yellow-500" size={20} />
                </div>
                <h3 className="text-gray-600 text-sm mb-1">Pending Uploads</h3>
                <p className="text-3xl font-bold">{stats.pendingUploads}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 hover:text-primary'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'products'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 hover:text-primary'
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 hover:text-primary'
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveTab('uploads')}
              className={`px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'uploads'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 hover:text-primary'
              }`}
            >
              Upload Approvals
            </button>
          </div>
        </div>

        {/* Dashboard Content */}
        {activeTab === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Recent Orders */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">Recent Orders</h2>
                {loading ? (
                  <p className="text-gray-600 text-center py-4">Loading orders...</p>
                ) : orders.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">No orders yet</p>
                ) : (
                  <div className="space-y-3">
                    {(Array.isArray(orders) ? orders : []).slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">#{order.id.substring(0, 8).toUpperCase()}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatPrice(order.totalAmount)}</p>
                          <Badge variant="success" className="text-xs">
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Low Stock Products */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">Products Status</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="text-green-600" size={20} />
                      <span className="font-medium">In Stock</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">
                      {products.filter((p) => p.inStock).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <XCircle className="text-red-600" size={20} />
                      <span className="font-medium">Out of Stock</span>
                    </div>
                    <span className="text-2xl font-bold text-red-600">
                      {products.filter((p) => !p.inStock).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Clock className="text-yellow-600" size={20} />
                      <span className="font-medium">Featured</span>
                    </div>
                    <span className="text-2xl font-bold text-yellow-600">
                      {products.filter((p) => p.featured).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Products Management */}
        {activeTab === 'products' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Product Management</h2>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => router.push('/admin/seed-categories')}
                      variant="secondary"
                      className="border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-white"
                    >
                      <Database className="w-4 h-4 mr-2" />
                      Seed Categories
                    </Button>
                    <Button
                      onClick={() => router.push('/admin/categories')}
                      variant="secondary"
                      className="border-gray-300"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Manage Categories
                    </Button>
                    <Button onClick={() => router.push('/admin/products/add')}>
                      Add New Product
                    </Button>
                  </div>
                </div>

                <div className="mb-4">
                  <Input placeholder="Search products..." />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="py-3 px-2">Product</th>
                        <th className="py-3 px-2">Category</th>
                        <th className="py-3 px-2">Price</th>
                        <th className="py-3 px-2">Stock</th>
                        <th className="py-3 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.slice(0, 10).map((product) => (
                        <tr key={product.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2">
                            <div className="flex items-center space-x-3">
                              <div className="relative w-12 h-12 bg-gray-100 rounded flex-shrink-0">
                                <Image
                                  src={product.images[0]}
                                  alt={product.name}
                                  fill
                                  className="object-cover rounded"
                                />
                              </div>
                              <span className="font-medium line-clamp-1">
                                {product.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-sm text-gray-600">
                              {product.category.name}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className="font-medium">
                              {formatPrice(product.price)}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <Badge
                              variant={product.inStock ? 'success' : 'danger'}
                            >
                              {product.inStock ? 'In Stock' : 'Out of Stock'}
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex space-x-2">
                              <button className="p-2 hover:bg-gray-100 rounded">
                                <Eye size={16} />
                              </button>
                              <button className="p-2 hover:bg-gray-100 rounded">
                                <Edit size={16} />
                              </button>
                              <button className="p-2 hover:bg-red-50 text-red-600 rounded">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Orders Management */}
        {activeTab === 'orders' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-6">Order Management</h2>

                {loading ? (
                  <p className="text-gray-600 text-center py-8">Loading orders...</p>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart size={48} className="text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No orders yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="font-semibold text-lg">
                              Order #{order.id.substring(0, 8).toUpperCase()}
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(order.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="PAID">Paid</option>
                            <option value="SHIPPED">Shipped</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-2">Items:</p>
                            {order.items?.map((item: any) => (
                              <p key={item.id} className="text-sm mb-1">
                                • {item.productName || 'Product'} (x{item.quantity})
                              </p>
                            ))}
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-2">
                              Customer:
                            </p>
                            <p className="text-sm">{order.user?.email || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center mt-4 pt-4 border-t">
                          <p className="font-bold text-lg">
                            Total: {formatPrice(order.totalAmount)}
                          </p>
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => router.push(`/orders/${order.id}`)}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Upload Approvals */}
        {activeTab === 'uploads' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-6">
                  Custom Upload Approvals
                </h2>

                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Upload size={48} className="text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    No Pending Uploads
                  </h3>
                  <p className="text-gray-600">
                    Custom design uploads will appear here for review
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
