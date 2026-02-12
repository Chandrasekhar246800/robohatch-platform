'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy checkout page - redirects to new multi-step checkout flow
 * The new flow consists of:
 * 1. /checkout/address - Collect shipping details
 * 2. /checkout/payment - Payment method selection & Razorpay integration
 * 3. /checkout/processing - Payment verification
 * 4. /order/success - Order confirmation
 * 5. /order/failure - Payment failure handling
 */
export default function CheckoutRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new checkout flow
    router.replace('/checkout/address');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to checkout...</p>
      </div>
    </div>
  );
}

