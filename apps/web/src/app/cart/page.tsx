'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Package, ShieldCheck, Truck } from 'lucide-react';
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
  const shipping = subtotal > 999 ? 0 : 89;
  const total = subtotal + shipping;

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
        <div className="bg-gray-50 min-h-screen flex items-center justify-center py-12">
          <div className="bg-white shadow-sm rounded-lg max-w-md mx-auto p-8 text-center">
            <div className="w-32 h-32 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag size={64} className="text-primary" />
            </div>
            <h2 className="text-xl font-medium text-gray-800 mb-2">Your cart is empty!</h2>
            <p className="text-gray-600 mb-6 text-sm">
              Add items to it now.
            </p>
            <Link href="/products">
              <Button className="bg-primary hover:bg-accent text-white px-8 py-2.5">
                Shop Now
              </Button>
            </Link>
          </div>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="container-custom max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-medium mb-2">My Cart ({items.length})</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Section - Cart Items */}
            <div className="lg:col-span-2 space-y-3">
              {/* Delivery Address Info */}
              <div className="bg-white shadow-sm rounded-lg">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded flex items-center justify-center">
                      <Package className="text-primary" size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Deliver to</p>
                      <p className="text-sm text-gray-600">
                        {isAuthenticated ? 'Select delivery address at checkout' : 'Login to see delivery address'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cart Items List */}
              <div className="bg-white shadow-sm rounded-lg">
                {items.map((item, index) => {
                  const isCustomDesign = !!item.customDesign;
                  const displayName = isCustomDesign ? item.customDesign!.name : item.product!.name;
                  const displayPrice = isCustomDesign 
                    ? (item.customDesign!.estimatedPrice || 0) 
                    : item.product!.price;
                  const itemId = isCustomDesign ? item.customDesign!.id : item.product!.id;
                  
                  return (
                  <div
                    key={itemId}
                    className={`p-4 hover:bg-gray-50 transition-colors ${index !== items.length - 1 ? 'border-b border-gray-200' : ''}`}
                  >
                    <div className="flex gap-4">
                      {/* Product/Design Image */}
                      {isCustomDesign ? (
                        <div className="relative w-28 h-28 flex-shrink-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 overflow-hidden flex items-center justify-center">
                          <Package size={48} className="text-blue-400" />
                        </div>
                      ) : (
                      <Link
                        href={`/product/${item.product!.id}`}
                        className="relative w-28 h-28 flex-shrink-0 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden hover:border-primary transition-colors"
                      >
                        <Image
                          src={item.product!.images && item.product!.images.length > 0
                            ? (typeof item.product!.images[0] === 'string' 
                                ? item.product!.images[0] 
                                : (item.product!.images[0] as any)?.url || '/placeholder-product.jpg')
                            : '/placeholder-product.jpg'}
                          alt={item.product!.name}
                          fill
                          className="object-contain p-2"
                        />
                      </Link>
                      )}

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        {isCustomDesign ? (
                          <div>
                            <h3 className="text-base font-normal text-gray-800 mb-1 line-clamp-2">
                              {displayName}
                            </h3>
                            <div className="mb-2 px-2 py-1 bg-purple-50 border border-purple-200 rounded-md inline-block">
                              <p className="text-xs font-semibold text-purple-900">
                                🎨 Custom 3D Design
                              </p>
                            </div>
                            {item.customDesign!.material && (
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                <span>Material: {item.customDesign!.material}</span>
                                {item.customDesign!.color && (
                                  <>
                                    <span>•</span>
                                    <span>Color: {item.customDesign!.color}</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                        <Link href={`/product/${item.product!.id}`}>
                          <h3 className="text-base font-normal text-gray-800 hover:text-primary transition-colors mb-1 line-clamp-2">
                            {item.product!.name}
                          </h3>
                        </Link>
                        )}
                        {!isCustomDesign && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                          <span>{item.product!.category.name}</span>
                          {item.product!.weight && (
                            <>
                              <span>•</span>
                              <span>Weight: {item.product!.weight}</span>
                            </>
                          )}
                        </div>
                        )}

                        {/* Custom Personalization Details */}
                        {(item.customText || item.customImageUrl) && (
                          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
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
                                <span className="font-medium">Custom Photo:</span> ✓ Uploaded
                              </p>
                            )}
                          </div>
                        )}

                        {/* Price and Quantity */}
                        <div className="flex items-center gap-6 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-medium text-gray-900">
                              {formatPrice(displayPrice)}
                            </span>
                            {!isCustomDesign && item.product!.originalPrice && (
                              <>
                                <span className="text-sm text-gray-400 line-through">
                                  {formatPrice(item.product!.originalPrice)}
                                </span>
                                <span className="text-sm text-green-600 font-medium">
                                  {Math.round(((parseFloat(String(item.product!.originalPrice)) - parseFloat(String(item.product!.price))) / parseFloat(String(item.product!.originalPrice))) * 100)}% off
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Quantity Controls and Remove */}
                        <div className="flex items-center gap-4">
                          {/* Quantity Selector - Flipkart Style */}
                          <div className="flex items-center border border-gray-300 rounded">
                            <button
                              onClick={() =>
                                item.quantity > 1 
                                  ? updateQuantity(itemId, item.quantity - 1, isAuthenticated)
                                  : removeItem(itemId, isAuthenticated)
                              }
                              className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                            <input
                              type="text"
                              value={item.quantity}
                              readOnly
                              className="w-10 h-8 text-center border-x border-gray-300 text-sm font-medium focus:outline-none"
                            />
                            <button
                              onClick={() =>
                                updateQuantity(itemId, item.quantity + 1, isAuthenticated)
                              }
                              disabled={item.quantity >= 10}
                              className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={() => removeItem(itemId, isAuthenticated)}
                            className="text-sm font-medium text-gray-700 hover:text-red-600 transition-colors flex items-center gap-1"
                          >
                            <Trash2 size={14} />
                            REMOVE
                          </button>
                        </div>

                        {/* Delivery Info */}
                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                          <Truck size={14} className="text-primary" />
                          <span>Delivery by 3-5 business days | {shipping === 0 ? <span className="text-primary font-medium">Free shipping ✓</span> : 'Free shipping on orders above ₹999'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}

                {/* Place Order Button - Mobile Only */}
                <div className="p-4 border-t border-gray-200 lg:hidden">
                  <Button 
                    onClick={handleCheckout}
                    disabled={isProcessing || items.length === 0}
                    className="w-full bg-primary hover:bg-accent text-white font-medium py-3"
                    size="lg"
                  >
                    {isProcessing ? 'Processing...' : 'PLACE ORDER'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Section - Price Details (Sticky) */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow-sm rounded-lg sticky top-20">
                {/* Price Details Header */}
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                    Price Details
                  </h2>
                </div>

                {/* Price Breakdown */}
                <div className="p-4 space-y-3">
                  <div className="flex justify-between text-base">
                    <span className="text-gray-700">Price ({items.length} item{items.length > 1 ? 's' : ''})</span>
                    <span className="text-gray-900">{formatPrice(subtotal)}</span>
                  </div>

                  <div className="flex justify-between text-base">
                    <span className="text-gray-700">Delivery Charges</span>
                    <span className={shipping === 0 ? 'text-primary font-medium' : 'text-gray-900'}>
                      {shipping === 0 ? (
                        <span className="flex items-center gap-1">
                          <span className="line-through text-gray-400">{formatPrice(89)}</span>
                          <span>FREE</span>
                        </span>
                      ) : (
                        formatPrice(shipping)
                      )}
                    </span>
                  </div>
                  
                  {shipping > 0 && subtotal < 999 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
                      <p className="text-xs text-gray-700">
                        Add items worth {formatPrice(999 - subtotal)} more to get <span className="font-medium text-primary">FREE delivery</span>
                      </p>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-300 flex justify-between text-lg font-semibold">
                    <span className="text-gray-900">Total Amount</span>
                    <span className="text-primary">{formatPrice(total)}</span>
                  </div>

                  {subtotal > 999 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-sm text-gray-700 font-medium">
                        You will save <span className="text-primary font-semibold">{formatPrice(89)}</span> on this order
                      </p>
                    </div>
                  )}
                </div>

                {/* Place Order Button - Desktop */}
                <div className="p-4 border-t border-gray-200 hidden lg:block">
                  <Button 
                    onClick={handleCheckout}
                    disabled={isProcessing || items.length === 0}
                    className="w-full bg-primary hover:bg-accent text-white font-medium py-3"
                    size="lg"
                  >
                    {isProcessing ? 'Processing...' : 'PLACE ORDER'}
                  </Button>
                  
                  {!isAuthenticated && (
                    <p className="text-xs text-center text-gray-600 mt-3">
                      Please login to complete your purchase
                    </p>
                  )}
                </div>

                {/* Safety & Security */}
                <div className="p-4 border-t border-gray-200 bg-orange-50">
                  <div className="flex items-center gap-2 text-sm text-gray-800 mb-2">
                    <ShieldCheck size={16} className="text-primary" />
                    <span className="font-medium">Safe and Secure Payments</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    100% Payment Protection. Easy Return Policy
                  </p>
                </div>
              </div>

              {/* Continue Shopping Link */}
              <Link href="/products">
                <div className="mt-4 text-center">
                  <button className="text-primary hover:text-accent font-medium text-sm flex items-center justify-center gap-1 mx-auto transition-colors">
                    ← Continue Shopping
                  </button>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
