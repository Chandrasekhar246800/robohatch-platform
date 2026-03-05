'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, Calendar, CreditCard, Truck, ChevronRight, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/lib/api-client';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    price: number;
  };
}

interface Payment {
  id: string;
  status: string;
  method: string;
  transactionId: string | null;
}

interface Order {
  id: string;
  subtotal?: number;
  shippingCost?: number;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
  payment?: Payment;
}

type OrderStatus = 
  | 'CREATED' 
  | 'PAID' 
  | 'PROCESSING' 
  | 'SHIPPED' 
  | 'OUT_FOR_DELIVERY' 
  | 'DELIVERED' 
  | 'CANCELLED' 
  | 'REFUNDED';

const getStatusBadgeStyles = (status: string): string => {
  const statusMap: Record<OrderStatus, string> = {
    CREATED: 'bg-gray-100 text-gray-800 border-gray-300',
    PAID: 'bg-blue-100 text-blue-800 border-blue-300',
    PROCESSING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    SHIPPED: 'bg-purple-100 text-purple-800 border-purple-300',
    OUT_FOR_DELIVERY: 'bg-orange-100 text-orange-800 border-orange-300',
    DELIVERED: 'bg-green-100 text-green-800 border-green-300',
    CANCELLED: 'bg-red-100 text-red-800 border-red-300',
    REFUNDED: 'bg-red-100 text-red-800 border-red-300',
  };

  return statusMap[status as OrderStatus] || 'bg-gray-100 text-gray-800 border-gray-300';
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Client-side auth check (backup for middleware)
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/login?redirect=/account/orders');
    }
  }, [isAuthenticated, mounted, router]);

  // Fetch orders
  useEffect(() => {
    if (mounted && isAuthenticated) {
      fetchOrders();
    }
  }, [mounted, isAuthenticated]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await apiClient.getOrders(50, 0);
      
      if (response.success && response.data) {
        setOrders(response.data);
      } else {
        setError(response.message || 'Failed to fetch orders');
      }
    } catch (err: any) {
      console.error('Fetch orders error:', err);
      setError('Unable to load orders. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
          <p className="text-gray-600">
            View and track all your orders in one place
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Error Loading Orders</h3>
              <p className="text-red-700 text-sm">{error}</p>
              <button
                onClick={fetchOrders}
                className="mt-3 text-sm text-red-800 hover:text-red-900 underline font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && orders.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Orders Yet
            </h3>
            <p className="text-gray-600 mb-6">
              You haven't placed any orders. Start shopping to see your orders here.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-accent transition-colors"
            >
              Browse Products
              <ChevronRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        )}

        {/* Orders List */}
        {!loading && !error && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                {/* Order Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 pb-4 border-b">
                  <div className="flex items-start gap-4">
                    <Package className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">
                          Order #{order.id.slice(0, 8).toUpperCase()}
                        </h3>
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusBadgeStyles(
                            order.status
                          )}`}
                        >
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold text-primary">
                      ₹{order.total.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Order Details */}
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {/* Items */}
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Truck className="w-4 h-4" />
                      <span>Items ({order.items?.length || 0})</span>
                    </div>
                    <div className="space-y-1">
                      {order.items?.slice(0, 3).map((item) => (
                        <p key={item.id} className="text-sm text-gray-600">
                          {item.quantity}x {item.product.name}
                        </p>
                      ))}
                      {order.items && order.items.length > 3 && (
                        <p className="text-sm text-gray-500 italic">
                          +{order.items.length - 3} more items
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <CreditCard className="w-4 h-4" />
                      <span>Payment</span>
                    </div>
                    {order.payment ? (
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">
                          Status:{' '}
                          <span
                            className={`font-medium ${
                              order.payment.status === 'COMPLETED'
                                ? 'text-green-600'
                                : order.payment.status === 'PENDING'
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}
                          >
                            {order.payment.status}
                          </span>
                        </p>
                        <p className="text-sm text-gray-600">
                          Method: {order.payment.method || 'Online'}
                        </p>
                        {order.payment.transactionId && (
                          <p className="text-xs text-gray-500 font-mono">
                            ID: {order.payment.transactionId.slice(0, 16)}...
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No payment info</p>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-4 border-t">
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="inline-flex items-center text-primary hover:text-accent font-medium text-sm transition-colors"
                  >
                    View Order Details
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Help Section */}
        {!loading && orders.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-sm text-gray-700 mb-3">
              If you have any questions about your orders, feel free to contact our support team.
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <a
                href="mailto:founder@robohatch.in"
                className="text-primary hover:underline font-medium"
              >
                founder@robohatch.in
              </a>
              <span className="text-gray-400">•</span>
              <a
                href="tel:+919505551727"
                className="text-primary hover:underline font-medium"
              >
                +91 95055 51727
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
