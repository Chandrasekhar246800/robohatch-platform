'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Lock, MapPin } from 'lucide-react';
import { useCartStore } from '@/store/cart.store';
import { useCheckoutStore } from '@/store/checkout.store';
import { useAuthStore } from '@/store/auth.store';
import { CheckoutSteps } from '@/components/checkout/CheckoutSteps';
import { apiClient } from '@/lib/api-client';

// Extend Window interface for Razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PaymentPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { items, getTotal, mergeLocalCartWithBackend } = useCartStore();
  const { 
    shippingAddress, 
    setOrderId, 
    setRazorpayOrderId,
    setPaymentId,
    setCurrentStep,
    orderId: existingOrderId 
  } = useCheckoutStore();

  const [mounted, setMounted] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [error, setError] = useState('');
  const [orderId, setLocalOrderId] = useState('');

  useEffect(() => {
    setMounted(true);
    setCurrentStep('payment');
    
    // Merge any local cart items with backend on mount
    if (isAuthenticated) {
      mergeLocalCartWithBackend().catch(err => {
        console.error('Failed to merge cart on payment page load:', err);
      });
    }
  }, [setCurrentStep, isAuthenticated, mergeLocalCartWithBackend]);

  // Redirect if not authenticated
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/login?redirect=/checkout/payment');
    }
  }, [isAuthenticated, mounted, router]);

  // Redirect if no items in cart
  useEffect(() => {
    if (mounted && items.length === 0) {
      router.push('/cart');
    }
  }, [items, mounted, router]);

  // Redirect if no shipping address
  useEffect(() => {
    if (mounted && !shippingAddress) {
      router.push('/checkout/address');
    }
  }, [shippingAddress, mounted, router]);

  const subtotal = getTotal();
  const grandTotal = subtotal; // No GST - business doesn't have GST number

  /**
   * Step 1: Create order from cart
   */
  const handleCreateOrder = async () => {
    if (isCreatingOrder || isProcessingPayment) {
      console.warn('Order creation already in progress');
      return;
    }

    if (!shippingAddress) {
      setError('Shipping address is required');
      return;
    }

    setIsCreatingOrder(true);
    setError('');
    
    try {
      const response = await apiClient.createPaymentOrder(shippingAddress);
      
      if (!response.success || !response.data) {
        setError(response.message || 'Failed to create order');
        setIsCreatingOrder(false);
        return;
      }
      
      const newOrderId = response.data.id;
      setLocalOrderId(newOrderId);
      setOrderId(newOrderId);
      
      console.log('✓ Order created:', newOrderId);
      
      // Automatically initiate payment
      await handleInitiateRazorpayPayment(newOrderId);
    } catch (err: any) {
      console.error('Create order error:', err);
      setError(err.message || 'Failed to create order');
      setIsCreatingOrder(false);
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
        setIsCreatingOrder(false);
        return;
      }

      const razorpayOrderId = response.data.id;
      const amount = response.data.amount;
      
      setRazorpayOrderId(razorpayOrderId);
      
      console.log('✓ Razorpay order created:', razorpayOrderId);

      // Check if Razorpay script is loaded
      if (typeof window.Razorpay === 'undefined') {
        setError('Payment gateway not loaded. Please refresh the page.');
        setIsProcessingPayment(false);
        setIsCreatingOrder(false);
        return;
      }

      // Configure Razorpay checkout options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: amount,
        currency: 'INR',
        name: 'RoboHatch',
        description: 'Order Payment',
        order_id: razorpayOrderId,
        
        /**
         * Step 3: Handle successful payment
         */
        handler: async function (response: any) {
          console.log('✓ Payment successful:', response);
          
          try {
            // Store payment details
            setPaymentId(response.razorpay_payment_id);
            
            // Redirect to processing page for verification
            router.push('/checkout/processing');
          } catch (err: any) {
            console.error('Payment handler error:', err);
            setError(err.message || 'Payment processing failed');
            setIsProcessingPayment(false);
          }
        },
        
        /**
         * Handle payment modal close
         */
        modal: {
          ondismiss: function () {
            console.log('Payment modal closed by user');
            setIsProcessingPayment(false);
            setIsCreatingOrder(false);
            setError('Payment cancelled. You can try again.');
            
            // Mark payment as failed
            apiClient.handlePaymentFailure(orderIdParam, 'User cancelled payment');
          },
        },
        
        /**
         * Prefill customer details
         */
        prefill: {
          name: shippingAddress?.fullName || '',
          email: shippingAddress?.email || '',
          contact: shippingAddress?.phone || '',
        },
        
        /**
         * Theme configuration
         */
        theme: {
          color: '#F27405', // RoboHatch primary color
        },
      };

      // Open Razorpay checkout
      const rzp = new window.Razorpay(options);
      
      // Handle payment failure
      rzp.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error);
        setError(`Payment failed: ${response.error.description || 'Unknown error'}`);
        setIsProcessingPayment(false);
        setIsCreatingOrder(false);
        
        // Mark payment as failed and redirect to failure page
        apiClient.handlePaymentFailure(orderIdParam, response.error.description);
        router.push('/order/failure');
      });
      
      // Open Razorpay modal
      rzp.open();
    } catch (err: any) {
      console.error('Razorpay initialization error:', err);
      setError(err.message || 'Failed to initialize payment');
      setIsProcessingPayment(false);
      setIsCreatingOrder(false);
    }
  };

  if (!mounted) {
    return null;
  }

  if (!isAuthenticated || items.length === 0 || !shippingAddress) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment</h1>
          <p className="text-gray-600">Review your order and complete payment</p>
        </div>

        {/* Progress Steps */}
        <CheckoutSteps currentStep="payment" />

        <div className="grid lg:grid-cols-3 gap-8 mt-12">
          {/* Payment Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address Review */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-primary mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Shipping Address</h3>
                </div>
                <button
                  onClick={() => router.push('/checkout/address')}
                  className="text-sm text-primary hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-900">{shippingAddress.fullName}</p>
                <p className="text-sm text-gray-600 mt-1">{shippingAddress.addressLine1}</p>
                {shippingAddress.addressLine2 && (
                  <p className="text-sm text-gray-600">{shippingAddress.addressLine2}</p>
                )}
                <p className="text-sm text-gray-600">
                  {shippingAddress.city}, {shippingAddress.state} - {shippingAddress.postalCode}
                </p>
                <p className="text-sm text-gray-600 mt-2">Phone: {shippingAddress.phone}</p>
                <p className="text-sm text-gray-600">Email: {shippingAddress.email}</p>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <CreditCard className="w-6 h-6 text-primary mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Payment Method</h3>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <Lock className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-2">Secure Payment via Razorpay</p>
                    <p className="text-sm text-gray-700 mb-4">
                      Pay securely using Credit Card, Debit Card, Net Banking, UPI, or Wallets. All transactions are encrypted and secure.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-700 border border-gray-200">
                        💳 Cards
                      </span>
                      <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-700 border border-gray-200">
                        📱 UPI
                      </span>
                      <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-700 border border-gray-200">
                        🏦 Net Banking
                      </span>
                      <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-700 border border-gray-200">
                        👛 Wallets
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {orderId && (
                <div className="mt-4 text-sm text-gray-600">
                  <p>Order ID: <span className="font-mono font-medium">{orderId}</span></p>
                  <p className="text-primary mt-1">Processing payment...</p>
                </div>
              )}

              <div className="mt-6 flex gap-4">
                <button
                  type="button"
                  onClick={() => router.push('/checkout/address')}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  disabled={isCreatingOrder || isProcessingPayment}
                >
                  Back
                </button>
                <button
                  onClick={handleCreateOrder}
                  disabled={isCreatingOrder || isProcessingPayment}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-accent transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isCreatingOrder 
                    ? 'Creating Order...' 
                    : isProcessingPayment 
                    ? 'Opening Payment...' 
                    : `Pay ₹${grandTotal.toFixed(2)}`}
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                By proceeding, you agree to our <a href="/terms" className="text-primary hover:underline">Terms & Conditions</a> and <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
              </p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">₹{(item.product.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal ({items.length} items)</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span className="text-green-600 font-medium">FREE</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t">
                  <span>Total</span>
                  <span className="text-primary">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800 text-center">
                  🔒 Your payment is 100% secure
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
