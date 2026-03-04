'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Package, ArrowLeft, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';
import { OrderDetailSkeleton } from '@/components/ui';

function OrderDetailContent() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { isAuthenticated } = useAuthStore();
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, mounted, router]);

  useEffect(() => {
    if (mounted && orderId && isAuthenticated) {
      fetchOrderDetails();
    }
  }, [orderId, mounted, isAuthenticated]);

  const fetchOrderDetails = async () => {
    try {
      const response = await apiClient.getOrder(orderId);
      
      if (!response.success) {
        setError(response.message || 'Failed to fetch order details');
        return;
      }
      
      setOrder(response.data.order);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  if (!isAuthenticated) {
    return <div className="container mx-auto px-4 py-8">Redirecting to login...</div>;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <OrderDetailSkeleton />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error || 'Order not found'}
        </div>
        <Link href="/orders" className="text-blue-600 hover:underline flex items-center gap-2">
          <ArrowLeft size={20} />
          Back to Orders
        </Link>
      </div>
    );
  }

  const getStatusSteps = () => {
    const steps = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED'];
    const currentIndex = steps.indexOf(order.status);
    
    return steps.map((step, index) => ({
      name: step,
      completed: index <= currentIndex,
      current: index === currentIndex,
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/orders" className="text-blue-600 hover:underline flex items-center gap-2 mb-6">
        <ArrowLeft size={20} />
        Back to Orders
      </Link>

      <div className="max-w-4xl mx-auto">
        {/* Order Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">Order Details</h1>
              <p className="text-sm text-gray-600">Order ID: {order.id}</p>
              <p className="text-sm text-gray-600">
                Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-3xl font-bold">₹{Number(order.total).toFixed(2)}</p>
            </div>
          </div>

          {/* Order Status Timeline */}
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-700 mb-4">Order Status</p>
            <div className="flex justify-between items-center">
              {getStatusSteps().map((step, index) => (
                <div key={step.name} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        step.completed
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {step.completed ? <CheckCircle size={20} /> : <Package size={20} />}
                    </div>
                    <p
                      className={`text-xs mt-2 font-medium ${
                        step.current ? 'text-blue-600' : step.completed ? 'text-green-600' : 'text-gray-500'
                      }`}
                    >
                      {step.name}
                    </p>
                  </div>
                  {index < getStatusSteps().length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-2 ${
                        step.completed ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Items Ordered</h2>
          <div className="space-y-4">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center pb-4 border-b last:border-b-0">
                <div className="flex-1">
                  <p className="font-medium">{item.product?.name || 'Product'}</p>
                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  <p className="text-sm text-gray-600">Price: ₹{Number(item.price).toFixed(2)}</p>
                  {(item.customText || item.customImageUrl) && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-xs font-semibold text-blue-900 mb-1">
                        ✨ Personalized Product
                      </p>
                      {item.customText && (
                        <p className="text-xs text-blue-700">
                          <span className="font-medium">Custom Text:</span> {item.customText}
                        </p>
                      )}
                      {item.customImageUrl && (
                        <p className="text-xs text-blue-700 mt-1">
                          <span className="font-medium">Custom Photo:</span>{' '}
                          <a 
                            href={item.customImageUrl} 
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
                <p className="font-semibold text-lg">₹{(Number(item.price) * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span>₹{Number(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        {order.payment && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Transaction ID:</span>
                <span className="font-medium">{order.payment.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-medium">{order.payment.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Status:</span>
                <span className={`font-medium ${
                  order.payment.status === 'SUCCESS' ? 'text-green-600' : 
                  order.payment.status === 'PENDING' ? 'text-yellow-600' : 
                  'text-red-600'
                }`}>
                  {order.payment.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">₹{Number(order.payment.amount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => window.print()}
            className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300"
          >
            Print Order
          </button>
          <Link
            href="/products"
            className="flex-1 bg-blue-600 text-white text-center py-3 rounded-lg hover:bg-blue-700"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
      <OrderDetailContent />
    </Suspense>
  );
}
