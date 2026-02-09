'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/lib/api-client';

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { items, total, clearCart } = useCartStore();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/auth/login?redirect=/checkout');
    }
  }, [isAuthenticated, mounted, router]);

  useEffect(() => {
    if (mounted && items.length === 0) {
      router.push('/cart');
    }
  }, [items, mounted, router]);

  const handleCreateOrder = async () => {
    setIsCreatingOrder(true);
    setError('');
    
    try {
      const response = await apiClient.createPaymentOrder();
      
      if (!response.success) {
        setError(response.message || 'Failed to create order');
        return;
      }
      
      setOrderId(response.data.order.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!upiId.trim()) {
      setError('Please enter UPI ID');
      return;
    }

    // Validate UPI ID format
    const upiRegex = /^[\w.-]+@[\w.-]+$/;
    if (!upiRegex.test(upiId)) {
      setError('Invalid UPI ID format (e.g., user@bank)');
      return;
    }

    try {
      const response = await apiClient.initiatePayment(orderId, upiId);
      
      if (!response.success) {
        setError(response.message || 'Failed to initiate payment');
        return;
      }
      
      setPaymentLink(response.data.payment.paymentLink);
      setTransactionId(response.data.payment.transactionId);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment');
    }
  };

  const handleVerifyPayment = async () => {
    setError('');
    
    try {
      const response = await apiClient.verifyPayment(transactionId);
      
      if (!response.success) {
        setError(response.message || 'Payment verification failed');
        return;
      }
      
      // Clear cart after successful payment verification
      await clearCart(isAuthenticated);
      
      // Redirect to success page
      router.push(`/order/success?orderId=${orderId}`);
    } catch (err: any) {
      setError(err.message || 'Payment verification failed');
    }
  };

  if (!mounted) {
    return null;
  }

  if (!isAuthenticated) {
    return <div className="container mx-auto px-4 py-8">Redirecting to login...</div>;
  }

  if (items.length === 0) {
    return <div className="container mx-auto px-4 py-8">Redirecting to cart...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Checkout</h1>

      {/* Order Summary */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
        <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Order Summary</h2>
        <div className="space-y-3 md:space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between items-center gap-2">
              <div>
                <p className="font-medium text-sm md:text-base">{item.product.name}</p>
                <p className="text-xs md:text-sm text-gray-600">Quantity: {item.quantity}</p>
              </div>
              <p className="font-semibold text-sm md:text-base">₹{(item.product.price * item.quantity).toFixed(2)}</p>
            </div>
          ))}
          <div className="border-t pt-3 md:pt-4 flex justify-between items-center">
            <p className="text-lg md:text-xl font-bold">Total:</p>
            <p className="text-lg md:text-xl font-bold">₹{total.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Payment Section */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Payment</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!orderId ? (
          <div>
            <p className="text-gray-600 mb-4">
              Create your order to proceed with payment
            </p>
            <button
              onClick={handleCreateOrder}
              disabled={isCreatingOrder}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isCreatingOrder ? 'Creating Order...' : 'Create Order'}
            </button>
          </div>
        ) : !transactionId ? (
          <form onSubmit={handleInitiatePayment}>
            <div className="mb-4">
              <p className="text-green-600 mb-4">Order created successfully!</p>
              <p className="text-sm text-gray-600 mb-2">Order ID: {orderId}</p>
              <label htmlFor="upiId" className="block text-sm font-medium text-gray-700 mb-2">
                UPI ID
              </label>
              <input
                type="text"
                id="upiId"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="user@bank"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter your UPI ID (e.g., 9876543210@paytm)
              </p>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
            >
              Initiate Payment
            </button>
          </form>
        ) : (
          <div>
            <p className="text-green-600 mb-4">Payment initiated successfully!</p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-600 mb-2">Transaction ID: {transactionId}</p>
              <p className="text-sm text-gray-600 mb-4">UPI ID: {upiId}</p>
              <a
                href={paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm break-all"
              >
                {paymentLink}
              </a>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Complete the payment using your UPI app, then click verify below.
            </p>
            <button
              onClick={handleVerifyPayment}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700"
            >
              I have completed the payment - Verify
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
