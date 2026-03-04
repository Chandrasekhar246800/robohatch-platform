'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Package, 
  Calendar, 
  CreditCard, 
  Truck, 
  MapPin,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/lib/api-client';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  customText?: string;
  customImageUrl?: string;
  product: {
    id: string;
    name: string;
    price: number;
    description: string | null;
  };
}

interface Payment {
  id: string;
  status: string;
  method: string;
  transactionId: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
}

interface ShippingAddress {
  fullName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface Order {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payment?: Payment;
  shippingAddress?: ShippingAddress;
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

const getStatusProgress = (status: string): number => {
  const progressMap: Record<OrderStatus, number> = {
    CREATED: 10,
    PAID: 25,
    PROCESSING: 40,
    SHIPPED: 60,
    OUT_FOR_DELIVERY: 80,
    DELIVERED: 100,
    CANCELLED: 0,
    REFUNDED: 0,
  };

  return progressMap[status as OrderStatus] || 0;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function OrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;
  
  const { isAuthenticated } = useAuthStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Client-side auth check
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/login?redirect=/account/orders');
    }
  }, [isAuthenticated, mounted, router]);

  // Fetch order details
  useEffect(() => {
    if (mounted && isAuthenticated && orderId) {
      fetchOrderDetails();
    }
  }, [mounted, isAuthenticated, orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Use httpOnly cookies for authentication
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        setOrder(data.data);
      } else {
        setError(data.message || 'Failed to fetch order details');
      }
    } catch (err: any) {
      console.error('Fetch order details error:', err);
      setError('Unable to load order details. Please try again later.');
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
        {/* Back Button */}
        <Link
          href="/account/orders"
          className="inline-flex items-center text-gray-600 hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to My Orders
        </Link>

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
              <h3 className="font-semibold text-red-900 mb-1">Error Loading Order</h3>
              <p className="text-red-700 text-sm">{error}</p>
              <button
                onClick={fetchOrderDetails}
                className="mt-3 text-sm text-red-800 hover:text-red-900 underline font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Order Details */}
        {!loading && !error && order && (
          <div className="space-y-6">
            {/* Order Header */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Order #{order.id.slice(0, 8).toUpperCase()}
                  </h1>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Placed on {formatDate(order.createdAt)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-start md:items-end gap-2">
                  <span
                    className={`px-4 py-2 text-sm font-medium rounded-full border ${getStatusBadgeStyles(
                      order.status
                    )}`}
                  >
                    {order.status.replace(/_/g, ' ')}
                  </span>
                  <p className="text-2xl font-bold text-primary">
                    ₹{order.total.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              {!['CANCELLED', 'REFUNDED'].includes(order.status) && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                    <span>Order Progress</span>
                    <span>{getStatusProgress(order.status)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${getStatusProgress(order.status)}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Status Message */}
              {order.status === 'DELIVERED' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-green-900 text-sm">Order Delivered</h3>
                    <p className="text-green-700 text-sm">
                      Your order has been successfully delivered. We hope you enjoy your purchase!
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Order Items */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-gray-900">Order Items</h2>
                </div>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between gap-4 pb-4 border-b last:border-b-0">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.product.name}</h3>
                        {item.product.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {item.product.description}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 mt-1">Qty: {item.quantity}</p>
                        {((item as any).customText || (item as any).customImageUrl) && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-xs font-semibold text-blue-900 mb-1">
                              ✨ Personalized Product
                            </p>
                            {(item as any).customText && (
                              <p className="text-xs text-blue-700">
                                <span className="font-medium">Custom Text:</span> {(item as any).customText}
                              </p>
                            )}
                            {(item as any).customImageUrl && (
                              <p className="text-xs text-blue-700 mt-1">
                                <span className="font-medium">Custom Photo:</span>{' '}
                                <a 
                                  href={(item as any).customImageUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="underline hover:text-blue-900"
                                >
                                  View Image
                                </a>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">₹{item.price} each</p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Total */}
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">Total</span>
                      <span className="text-xl font-bold text-primary">
                        ₹{order.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              {order.shippingAddress && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold text-gray-900">Shipping Address</h2>
                  </div>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p className="font-medium text-gray-900">{order.shippingAddress.fullName}</p>
                    <p>{order.shippingAddress.addressLine1}</p>
                    {order.shippingAddress.addressLine2 && (
                      <p>{order.shippingAddress.addressLine2}</p>
                    )}
                    <p>
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                    </p>
                    <p>{order.shippingAddress.country}</p>
                    <div className="pt-3 mt-3 border-t space-y-1">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span>{order.shippingAddress.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span>{order.shippingAddress.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Information */}
              {order.payment && (
                <div className="bg-white rounded-lg shadow-md p-6 md:col-span-2">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold text-gray-900">Payment Information</h2>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Payment Status</p>
                      <p
                        className={`font-semibold ${
                          order.payment.status === 'COMPLETED'
                            ? 'text-green-600'
                            : order.payment.status === 'PENDING'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {order.payment.status}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Payment Method</p>
                      <p className="font-semibold text-gray-900">
                        {order.payment.method || 'Online Payment'}
                      </p>
                    </div>
                    {order.payment.razorpayPaymentId && (
                      <div>
                        <p className="text-gray-600 mb-1">Payment ID</p>
                        <p className="font-mono text-xs text-gray-900 break-all">
                          {order.payment.razorpayPaymentId}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Help Section */}
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Need Help with this Order?</h3>
              <p className="text-sm text-gray-700 mb-3">
                If you have any questions or concerns about this order, our support team is here to help.
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
          </div>
        )}
      </div>
    </div>
  );
}
