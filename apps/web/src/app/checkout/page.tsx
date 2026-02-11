'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/lib/api-client';

// Extend Window interface for Razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { items, total, clearCart } = useCartStore();
  
  // Calculate pricing breakdown
  const subtotal = total;
  const gst = Math.round(subtotal * 0.18); // 18% GST
  const grandTotal = subtotal + gst;
  
  const [mounted, setMounted] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState('');

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

  /**
   * Step 1: Create order from cart
   * 🔒 DUPLICATE SUBMISSION PREVENTION
   */
  const handleCreateOrder = async () => {
    // 🔒 Prevent double-click
    if (isCreatingOrder || isProcessingPayment) {
      console.warn('Order creation already in progress');
      return;
    }

    setIsCreatingOrder(true);
    setError('');
    
    try {
      const response = await apiClient.createPaymentOrder();
      
      if (!response.success || !response.data) {
        setError(response.message || 'Failed to create order');
        return;
      }
      
      setOrderId(response.data.id);
      console.log('✓ Order created:', response.data.id);
      
      // Automatically initiate payment after order creation
      await handleInitiateRazorpayPayment(response.data.id);
    } catch (err: any) {
      console.error('Create order error:', err);
      setError(err.message || 'Failed to create order');
      setIsCreatingOrder(false); // Reset on error
      setIsProcessingPayment(false);
    }
  };

  /**
   * Step 2: Create Razorpay order and open checkout
   */
  const handleInitiateRazorpayPayment = async (orderIdParam: string) => {
    setIsProcessingPayment(true);
    setError('');

    try {
      // Create Razorpay order
      const response = await apiClient.createRazorpayOrder(orderIdParam);
      
      if (!response.success || !response.data) {
        setError(response.message || 'Failed to initialize payment');
        setIsProcessingPayment(false);
        setIsCreatingOrder(false); // Reset to allow retry
        return;
      }

      const razorpayOrderId = response.data.id;
      const amount = response.data.amount;
      
      console.log('✓ Razorpay order created:', razorpayOrderId);

      // Check if Razorpay script is loaded
      if (typeof window.Razorpay === 'undefined') {
        setError('Payment gateway not loaded. Please refresh the page.');
        setIsProcessingPayment(false);
        setIsCreatingOrder(false); // Reset to allow retry
        return;
      }

      // Configure Razorpay checkout options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: amount, // Amount from backend (already in paise)
        currency: 'INR',
        name: 'RoboHatch',
        description: 'Order Payment',
        order_id: razorpayOrderId,
        
        /**
         * Step 3: Handle successful payment
         * ⚠️ CRITICAL: This is called by Razorpay after successful payment
         */
        handler: async function (response: any) {
          console.log('✓ Payment successful, verifying...', response);
          
          try {
            // 🔒 REQUEST TIMEOUT: Prevent hanging UI (30 seconds)
            const verifyPromise = apiClient.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Verification timeout. Please contact support.')), 30000)
            );

            // Race between verification and timeout
            const verifyResponse = await Promise.race([
              verifyPromise,
              timeoutPromise,
            ]) as any;

            if (!verifyResponse.success) {
              setError(verifyResponse.message || 'Payment verification failed');
              setIsProcessingPayment(false);
              return;
            }

            console.log('✓ Payment verified successfully');
            
            // Clear cart after successful payment
            await clearCart(isAuthenticated);
            
            // Redirect to success page
            router.push(`/order-success?orderId=${orderIdParam}`);
          } catch (err: any) {
            console.error('Payment verification error:', err);
            setError(err.message || 'Payment verification failed');
            setIsProcessingPayment(false);
          }
        },
        
        /**
         * Handle payment modal close (user cancelled or closed)
         */
        modal: {
          ondismiss: function () {
            console.log('Payment modal closed by user');
            setIsProcessingPayment(false);
            setError('Payment cancelled. You can try again.');
            
            // Optionally mark payment as failed
            apiClient.handlePaymentFailure(orderIdParam, 'User cancelled payment');
          },
        },
        
        /**
         * Prefill customer details (optional)
         */
        prefill: {
          name: '',
          email: '',
          contact: '',
        },
        
        /**
         * Theme configuration
         */
        theme: {
          color: '#2563eb', // Blue-600
        },
      };

      // Open Razorpay checkout
      const rzp = new window.Razorpay(options);
      
      // Handle payment failure
      rzp.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error);
        setError(`Payment failed: ${response.error.description || 'Unknown error'}`);
        setIsProcessingPayment(false);
        
        // Mark payment as failed
        apiClient.handlePaymentFailure(orderIdParam, response.error.description);
      });
      
      // Open Razorpay modal
      rzp.open();
    } catch (err: any) {
      console.error('Razorpay initialization error:', err);
      setError(err.message || 'Failed to initialize payment');
      setIsProcessingPayment(false);
      setIsCreatingOrder(false); // Reset to allow retry
    }
  };

  if (!mounted) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-600">Redirecting to cart...</p>
      </div>
    );
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
              <div className="flex-1">
                <p className="font-medium text-sm md:text-base">{item.product.name}</p>
                <p className="text-xs md:text-sm text-gray-600">
                  Quantity: {item.quantity} × ₹{item.product.price.toFixed(2)}
                </p>
              </div>
              <p className="font-semibold text-sm md:text-base">
                ₹{(item.product.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
          ))}
          
          {/* Price Breakdown */}
          <div className="border-t pt-3 md:pt-4 space-y-2">
            <div className="flex justify-between text-sm md:text-base text-gray-600">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm md:text-base text-gray-600">
              <span>GST (18%)</span>
              <span>₹{gst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <p className="text-lg md:text-xl font-bold">Total:</p>
              <p className="text-lg md:text-xl font-bold text-blue-600">₹{grandTotal.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Section */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Payment</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-blue-900 mb-1">Secure Payment via Razorpay</p>
                <p className="text-sm text-blue-700">
                  Pay securely using Credit Card, Debit Card, Net Banking, UPI, or Wallets
                </p>
              </div>
            </div>
          </div>

          {orderId && (
            <div className="text-sm text-gray-600">
              <p className="mb-1">Order ID: <span className="font-mono">{orderId}</span></p>
              <p>Payment in progress...</p>
            </div>
          )}

          <button
            onClick={handleCreateOrder}
            disabled={isCreatingOrder || isProcessingPayment}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isCreatingOrder 
              ? 'Creating Order...' 
              : isProcessingPayment 
              ? 'Processing Payment...' 
              : 'Proceed to Payment'}
          </button>

          <p className="text-xs text-gray-500 text-center">
            By proceeding, you agree to our Terms & Conditions
          </p>
        </div>
      </div>

      {/* Test Mode Notice (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="font-medium text-yellow-900 mb-2">🧪 Test Mode</p>
          <p className="text-sm text-yellow-700 mb-2">Use these test card details:</p>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• Card: 4111 1111 1111 1111</li>
            <li>• Expiry: Any future date</li>
            <li>• CVV: Any 3 digits</li>
            <li>• OTP: 123456</li>
          </ul>
        </div>
      )}
    </div>
  );
}
