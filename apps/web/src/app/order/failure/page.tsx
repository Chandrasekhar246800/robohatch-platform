'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { XCircle, AlertCircle, RefreshCw, ShoppingCart, Mail } from 'lucide-react';
import { useCheckoutStore } from '@/store/checkout.store';
import { useAuthStore } from '@/store/auth.store';

export default function OrderFailurePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { orderId, razorpayOrderId, shippingAddress } = useCheckoutStore();

  const [mounted, setMounted] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string>('');

  useEffect(() => {
    setMounted(true);
    
    // Try to get error details from localStorage or sessionStorage
    const storedError = sessionStorage.getItem('payment-error');
    if (storedError) {
      setErrorDetails(storedError);
      sessionStorage.removeItem('payment-error'); // Clean up
    }
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, mounted, router]);

  const handleRetryPayment = () => {
    // Navigate back to payment page
    router.push('/checkout/payment');
  };

  const handleBackToCart = () => {
    router.push('/cart');
  };

  if (!mounted) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <XCircle className="w-20 h-20 text-red-500" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 bg-red-100 rounded-full -z-10 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Failed</h1>
            <p className="text-lg text-gray-600 mb-4">
              We couldn't process your payment. Please try again.
            </p>
            {errorDetails && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-800 mb-1">Error Details</p>
                    <p className="text-sm text-red-700">{errorDetails}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Transaction Details (if available) */}
          {(orderId || razorpayOrderId) && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
              {orderId && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-mono font-medium text-gray-900 text-xs">{orderId}</span>
                </div>
              )}
              {razorpayOrderId && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-mono font-medium text-gray-900 text-xs">{razorpayOrderId}</span>
                </div>
              )}
            </div>
          )}

          {/* Common Reasons for Failure */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Common reasons for payment failure:</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Insufficient funds in your account</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Incorrect card details or OTP</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Payment declined by your bank</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Network connectivity issues</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Session timeout or payment window closed</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={handleRetryPayment}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-accent transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Retry Payment
            </button>
            <button
              onClick={handleBackToCart}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              Back to Cart
            </button>
            <Link
              href="/products"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 text-primary hover:underline font-medium transition-colors"
            >
              Continue Shopping
            </Link>
          </div>

          {/* Help Section */}
          <div className="border-t pt-6">
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Need Help?</p>
                  <p className="text-sm text-gray-700 mb-3">
                    If you continue to face issues, please contact our support team. We're here to help!
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 text-sm">
                    <a 
                      href="mailto:founder@robohatch.in" 
                      className="flex items-center gap-2 text-primary hover:underline font-medium"
                    >
                      <Mail className="w-4 h-4" />
                      founder@robohatch.in
                    </a>
                    <a 
                      href="tel:+919505551727" 
                      className="flex items-center gap-2 text-primary hover:underline font-medium"
                    >
                      📞 +91 95055 51727
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Note */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              🔒 Your data is secure. No charges were made to your account.
            </p>
          </div>
        </div>

        {/* Additional Tips */}
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">💡 Tips for successful payment:</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">1.</span>
              <span>Ensure you have sufficient balance in your account</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">2.</span>
              <span>Check your internet connection is stable</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">3.</span>
              <span>Double-check your card details before submitting</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">4.</span>
              <span>Try using a different payment method if the issue persists</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">5.</span>
              <span>Contact your bank if payments are being declined repeatedly</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
