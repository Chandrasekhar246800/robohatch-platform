'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Package, Mail, ShoppingBag, Download } from 'lucide-react';
import { useCheckoutStore } from '@/store/checkout.store';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';
import { CheckoutSteps } from '@/components/checkout/CheckoutSteps';

export default function OrderSuccessPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { orderId, paymentId, razorpayOrderId, shippingAddress, setCurrentStep } = useCheckoutStore();
  const { clearCart } = useCartStore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentStep('complete');
  }, [setCurrentStep]);

  // Clear cart on successful order
  useEffect(() => {
    if (mounted && orderId) {
      clearCart();
    }
  }, [mounted, orderId, clearCart]);

  // Redirect if not authenticated
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, mounted, router]);

  // Redirect if no order details
  useEffect(() => {
    if (mounted && !orderId) {
      router.push('/');
    }
  }, [orderId, mounted, router]);

  const handlePrintInvoice = () => {
    window.print();
  };

  if (!mounted) {
    return null;
  }

  if (!isAuthenticated || !orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <CheckCircle2 className="w-20 h-20 text-green-500" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 bg-green-100 rounded-full -z-10 animate-pulse"></div>
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-lg text-gray-600">
            Thank you for your purchase. Your order has been successfully placed.
          </p>
        </div>

        {/* Progress Steps */}
        <CheckoutSteps currentStep="complete" />

        {/* Order Details Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mt-12">
          {/* Order Summary */}
          <div className="mb-8 pb-8 border-b">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-600">Order ID</p>
                    <p className="font-mono font-semibold text-gray-900">{orderId}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-600">Payment ID</p>
                    <p className="font-mono font-semibold text-gray-900 text-sm">{paymentId}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-600">Confirmation Email</p>
                    <p className="font-medium text-gray-900">{shippingAddress?.email || user?.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-600">Order Status</p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      ✓ Confirmed
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          {shippingAddress && (
            <div className="mb-8 pb-8 border-b">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Shipping Address</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-semibold text-gray-900">{shippingAddress.fullName}</p>
                <p className="text-gray-700 mt-2">{shippingAddress.streetAddress}</p>
                <p className="text-gray-700">
                  {shippingAddress.city}, {shippingAddress.state} - {shippingAddress.pincode}
                </p>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">Phone: <span className="font-medium text-gray-900">{shippingAddress.phone}</span></p>
                  <p className="text-sm text-gray-600">Email: <span className="font-medium text-gray-900">{shippingAddress.email}</span></p>
                </div>
              </div>
            </div>
          )}

          {/* What's Next */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">What happens next?</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Order Confirmation</p>
                  <p className="text-sm text-gray-600">You'll receive a confirmation email shortly at {shippingAddress?.email || user?.email}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Order Processing</p>
                  <p className="text-sm text-gray-600">We'll prepare your order for shipment within 1-2 business days</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Shipping Updates</p>
                  <p className="text-sm text-gray-600">Track your order status and get shipping updates via email</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Delivery</p>
                  <p className="text-sm text-gray-600">Your order will be delivered to your address within 5-7 business days</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handlePrintInvoice}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border-2 border-primary text-primary rounded-lg font-semibold hover:bg-orange-50 transition-colors"
            >
              <Download className="w-5 h-5" />
              Download Invoice
            </button>
            <Link
              href="/products"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-accent transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              Continue Shopping
            </Link>
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-8 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6">
          <div className="text-center">
            <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-sm text-gray-700 mb-4">
              If you have any questions about your order, please don't hesitate to contact us.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              <a href="mailto:founder@robohatch.in" className="flex items-center gap-2 text-primary hover:underline font-medium">
                <Mail className="w-4 h-4" />
                founder@robohatch.in
              </a>
              <a href="tel:+919505551727" className="flex items-center gap-2 text-primary hover:underline font-medium">
                📞 +91 95055 51727
              </a>
            </div>
          </div>
        </div>

        {/* Print-only section */}
        <div className="hidden print:block mt-8 p-6 border-t-2 border-gray-300">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">RoboHatch</h2>
            <p className="text-sm text-gray-600">Invoice / Order Confirmation</p>
          </div>
          <div className="text-sm text-gray-600">
            <p>Order ID: {orderId}</p>
            <p>Payment ID: {paymentId}</p>
            <p>Date: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
