'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { formatPrice } from '@/lib/utils';
import { AdminGuard } from '@/components/guards/AdminGuard';

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, getTotal, clearCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = getTotal();
  const shipping = subtotal > 999 ? 0 : 50;
  const tax = Math.round(subtotal * 0.18); // 18% GST
  const total = subtotal + shipping + tax;

  const handleCheckout = () => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      router.push('/login?redirect=/checkout');
      return;
    }

    if (items.length === 0) {
      return;
    }

    setIsProcessing(true);
    // Navigate to checkout
    router.push('/checkout');
  };

  if (items.length === 0) {
    return (
      <AdminGuard>
        <div className="container-custom py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag size={48} className="text-gray-400" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
            <p className="text-gray-600 mb-8">
              Start shopping to add items to your cart
            </p>
            <Link href="/products">
              <Button size="lg">
                Browse Products
                <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
          </motion.div>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="py-6 md:py-8">
      <div className="container-custom px-4">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold mb-2">Shopping Cart</h1>
          <p className="text-gray-600">{items.length} item(s) in your cart</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <motion.div
                key={item.product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="bg-white rounded-lg shadow-md p-3 md:p-4 flex flex-col sm:flex-row gap-3 md:gap-4"
              >
                {/* Product Image */}
                <Link
                  href={`/product/${item.product.id}`}
                  className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden"
                >
                  <Image
                    src={item.product.images && item.product.images.length > 0
                      ? (typeof item.product.images[0] === 'string' 
                          ? item.product.images[0] 
                          : (item.product.images[0] as any)?.url || '/placeholder-product.jpg')
                      : '/placeholder-product.jpg'}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                  />
                </Link>

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${item.product.id}`}>
                    <h3 className="text-sm md:text-base font-semibold mb-1 hover:text-primary transition-colors line-clamp-2 md:line-clamp-1">
                      {item.product.name}
                    </h3>
                  </Link>
                  <p className="text-xs md:text-sm text-gray-500 mb-2">
                    {item.product.category.name}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity - 1, isAuthenticated)
                        }
                        disabled={item.quantity <= 1}
                        className="p-1.5 sm:p-2 rounded hover:bg-gray-100 disabled:opacity-50 touch-manipulation"
                      >
                        <Minus size={14} className="sm:w-4 sm:h-4" />
                      </button>
                      <span className="w-8 sm:w-10 text-center font-medium text-sm sm:text-base">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity + 1, isAuthenticated)
                        }
                        disabled={item.quantity >= 10}
                        className="p-1.5 sm:p-2 rounded hover:bg-gray-100 disabled:opacity-50 touch-manipulation">
                        <Plus size={14} className="sm:w-4 sm:h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="text-right">
                        <p className="text-base sm:text-lg font-bold text-primary">
                          {formatPrice(item.product.price * item.quantity)}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {formatPrice(item.product.price)} each
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.product.id, isAuthenticated)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors touch-manipulation"
                        aria-label="Remove item"
                      >
                        <Trash2 size={16} className="sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Clear Cart Button */}
            <Button variant="ghost" onClick={() => clearCart(isAuthenticated)} className="w-full">
              <Trash2 size={18} className="mr-2" />
              Clear Cart
            </Button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6 lg:sticky lg:top-24">
              <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6">Order Summary</h2>

              <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                <div className="flex justify-between text-sm md:text-base text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>
                    {shipping === 0 ? (
                      <span className="text-green-600 font-medium">FREE</span>
                    ) : (
                      formatPrice(shipping)
                    )}
                  </span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-gray-500">
                    Add {formatPrice(999 - subtotal)} more for free shipping
                  </p>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Tax (GST 18%)</span>
                  <span>{formatPrice(tax)}</span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(total)}</span>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleCheckout}
                disabled={isProcessing || items.length === 0}
                className="w-full mb-4" 
                size="lg"
              >
                {isProcessing ? 'Processing...' : isAuthenticated ? 'Proceed to Checkout' : 'Login to Checkout'}
                <ArrowRight className="ml-2" size={20} />
              </Button>

              <Link href="/products">
                <Button variant="secondary" className="w-full">
                  Continue Shopping
                </Button>
              </Link>

              {/* Auth Notice */}
              {!isAuthenticated && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 text-center">
                    Please log in to complete your purchase
                  </p>
                </div>
              )}

              {/* Security Badge */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Secure Checkout</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </AdminGuard>
  );
}
