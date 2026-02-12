'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useCheckoutStore } from '@/store/checkout.store';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/lib/api-client';

export default function ProcessingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { 
    orderId, 
    razorpayOrderId, 
    paymentId, 
    setCurrentStep 
  } = useCheckoutStore();

  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<'verifying' | 'verified' | 'failed'>('verifying');
  const [message, setMessage] = useState('Verifying your payment...');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    setMounted(true);
    setCurrentStep('processing');
  }, [setCurrentStep]);

  // Redirect if not authenticated
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, mounted, router]);

  // Redirect if missing payment details
  useEffect(() => {
    if (mounted && (!orderId || !razorpayOrderId || !paymentId)) {
      console.error('Missing payment details:', { orderId, razorpayOrderId, paymentId });
      router.push('/cart');
    }
  }, [orderId, razorpayOrderId, paymentId, mounted, router]);

  // Verify payment on mount
  useEffect(() => {
    if (!mounted || !orderId || !razorpayOrderId || !paymentId) {
      return;
    }

    const verifyPayment = async () => {
      try {
        console.log('Verifying payment...', { orderId, razorpayOrderId, paymentId });

        const response = await apiClient.verifyPayment(orderId);

        if (response.success && response.data?.verified) {
          console.log('✓ Payment verified successfully');
          setStatus('verified');
          setMessage('Payment verified successfully!');
          
          // Start countdown
          let count = 3;
          const timer = setInterval(() => {
            count--;
            setCountdown(count);
            
            if (count === 0) {
              clearInterval(timer);
              router.push('/order/success');
            }
          }, 1000);

          return () => clearInterval(timer);
        } else {
          console.error('Payment verification failed:', response);
          setStatus('failed');
          setMessage(response.message || 'Payment verification failed');
          
          // Automatically redirect to failure page after 3 seconds
          setTimeout(() => {
            router.push('/order/failure');
          }, 3000);
        }
      } catch (error: any) {
        console.error('Payment verification error:', error);
        setStatus('failed');
        setMessage(error.message || 'An error occurred while verifying payment');
        
        // Automatically redirect to failure page after 3 seconds
        setTimeout(() => {
          router.push('/order/failure');
        }, 3000);
      }
    };

    verifyPayment();
  }, [mounted, orderId, razorpayOrderId, paymentId, router]);

  if (!mounted) {
    return null;
  }

  if (!isAuthenticated || !orderId || !razorpayOrderId || !paymentId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            {status === 'verifying' && (
              <div className="relative">
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-primary rounded-full opacity-20"></div>
                </div>
              </div>
            )}
            {status === 'verified' && (
              <div className="relative">
                <CheckCircle className="w-16 h-16 text-green-500" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full -z-10 animate-ping"></div>
                </div>
              </div>
            )}
            {status === 'failed' && (
              <div className="relative">
                <XCircle className="w-16 h-16 text-red-500" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-red-100 rounded-full -z-10 animate-ping"></div>
                </div>
              </div>
            )}
          </div>

          {/* Status Message */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {status === 'verifying' && 'Processing Payment'}
              {status === 'verified' && 'Payment Successful!'}
              {status === 'failed' && 'Verification Failed'}
            </h2>
            <p className="text-gray-600">
              {message}
            </p>
          </div>

          {/* Payment Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-mono font-medium text-gray-900 text-xs">{orderId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Payment ID:</span>
              <span className="font-mono font-medium text-gray-900 text-xs">{paymentId}</span>
            </div>
          </div>

          {/* Progress Bar */}
          {status === 'verifying' && (
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-1000 animate-pulse"
                  style={{ width: '60%' }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">
                Please wait while we verify your payment...
              </p>
            </div>
          )}

          {/* Countdown for success */}
          {status === 'verified' && (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Redirecting in <span className="font-bold text-primary">{countdown}</span> seconds...
              </p>
              <button
                onClick={() => router.push('/order/success')}
                className="mt-4 text-primary hover:underline text-sm font-medium"
              >
                Continue now →
              </button>
            </div>
          )}

          {/* Actions for failure */}
          {status === 'failed' && (
            <div className="space-y-3">
              <button
                onClick={() => router.push('/order/failure')}
                className="w-full px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-accent transition-colors"
              >
                View Details
              </button>
              <button
                onClick={() => router.push('/cart')}
                className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Back to Cart
              </button>
            </div>
          )}

          {/* Security Note */}
          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-gray-500 text-center">
              🔒 This is a secure transaction powered by Razorpay
            </p>
          </div>
        </div>

        {/* Loading animation dots */}
        {status === 'verifying' && (
          <div className="flex justify-center mt-6 gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        )}
      </div>
    </div>
  );
}
