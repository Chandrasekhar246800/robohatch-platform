'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, Minus, ShoppingBag, Package, ShieldCheck, Truck } from 'lucide-react';
import { Button } from '@/components/ui';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { formatPrice } from '@/lib/utils';

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, getTotal } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = getTotal();
  const shipping = subtotal > 999 ? 0 : 89;
  const total = subtotal + shipping;

  const handleCheckout = () => {
    if (items.length === 0) return;
    setIsProcessing(true);
    router.push('/checkout/address');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
        <div className="mx-auto max-w-md rounded-lg bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-orange-50">
            <ShoppingBag size={64} className="text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-medium text-gray-800">Your cart is empty!</h2>
          <p className="mb-6 text-sm text-gray-600">Add items to it now.</p>
          <Link href="/products">
            <Button className="bg-primary px-8 py-2.5 text-white hover:bg-accent">Shop Now</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom mx-auto max-w-7xl px-4">
        <div className="mb-6">
          <h1 className="mb-2 text-2xl font-medium">My Cart ({items.length})</h1>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <div className="rounded-lg bg-white shadow-sm">
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-orange-50">
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

            <div className="rounded-lg bg-white shadow-sm">
              {items.map((item, index) => {
                const isCustomDesign = Boolean(item.customDesign);
                const itemId = isCustomDesign ? item.customDesign!.id : item.product!.id;
                const displayName = isCustomDesign ? item.customDesign!.name : item.product!.name;
                const displayPrice = isCustomDesign ? (item.customDesign!.estimatedPrice || 0) : item.product!.price;

                return (
                  <div
                    key={itemId}
                    className={`p-4 hover:bg-gray-50 ${index !== items.length - 1 ? 'border-b border-gray-200' : ''}`}
                  >
                    <div className="flex gap-4">
                      {isCustomDesign ? (
                        <div className="flex h-28 w-28 flex-shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
                          <Package size={48} className="text-blue-400" />
                        </div>
                      ) : (
                        <Link
                          href={`/product/${item.product!.id}`}
                          className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 hover:border-primary"
                        >
                          <Image
                            src={
                              item.product!.images && item.product!.images.length > 0
                                ? typeof item.product!.images[0] === 'string'
                                  ? item.product!.images[0]
                                  : (item.product!.images[0] as any)?.url || '/placeholder-product.jpg'
                                : '/placeholder-product.jpg'
                            }
                            alt={item.product!.name}
                            fill
                            className="object-contain p-2"
                          />
                        </Link>
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className="mb-1 text-base font-normal text-gray-800 line-clamp-2">{displayName}</h3>

                        {!isCustomDesign && (
                          <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
                            <span>{item.product!.category.name}</span>
                            {item.product!.weight && (
                              <>
                                <span>•</span>
                                <span>Weight: {item.product!.weight}</span>
                              </>
                            )}
                          </div>
                        )}

                        <div className="mb-4 flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-medium text-gray-900">{formatPrice(displayPrice)}</span>
                            {!isCustomDesign && item.product!.originalPrice && (
                              <>
                                <span className="text-sm text-gray-400 line-through">{formatPrice(item.product!.originalPrice)}</span>
                                <span className="text-sm font-medium text-green-600">
                                  {Math.round(
                                    ((parseFloat(String(item.product!.originalPrice)) - parseFloat(String(item.product!.price))) /
                                      parseFloat(String(item.product!.originalPrice))) *
                                      100
                                  )}% off
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center rounded border border-gray-300">
                            <button
                              onClick={() =>
                                item.quantity > 1
                                  ? updateQuantity(itemId, item.quantity - 1, isAuthenticated)
                                  : removeItem(itemId, isAuthenticated)
                              }
                              className="flex h-8 w-8 items-center justify-center hover:bg-gray-50"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={14} />
                            </button>
                            <input
                              type="text"
                              value={item.quantity}
                              readOnly
                              className="h-8 w-10 border-x border-gray-300 text-center text-sm font-medium focus:outline-none"
                            />
                            <button
                              onClick={() => updateQuantity(itemId, item.quantity + 1, isAuthenticated)}
                              disabled={item.quantity >= 10}
                              className="flex h-8 w-8 items-center justify-center hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label="Increase quantity"
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          <button
                            onClick={() => removeItem(itemId, isAuthenticated)}
                            className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                            REMOVE
                          </button>
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                          <Truck size={14} className="text-primary" />
                          <span>
                            Delivery by 3-5 business days |{' '}
                            {shipping === 0 ? (
                              <span className="font-medium text-primary">Free shipping</span>
                            ) : (
                              'Free shipping on orders above ₹999'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="border-t border-gray-200 p-4 lg:hidden">
                <Button
                  data-testid="cart-place-order-mobile"
                  onClick={handleCheckout}
                  disabled={isProcessing || items.length === 0}
                  className="w-full bg-primary py-3 font-medium text-white hover:bg-accent"
                  size="lg"
                >
                  {isProcessing ? 'Processing...' : 'Checkout'}
                </Button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-20 rounded-lg bg-white shadow-sm">
              <div className="border-b border-gray-200 p-4">
                <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">Price Details</h2>
              </div>

              <div className="space-y-3 p-4">
                <div className="flex justify-between text-base">
                  <span className="text-gray-700">Price ({items.length} item{items.length > 1 ? 's' : ''})</span>
                  <span className="text-gray-900">{formatPrice(subtotal)}</span>
                </div>

                <div className="flex justify-between text-base">
                  <span className="text-gray-700">Delivery Charges</span>
                  <span className={shipping === 0 ? 'font-medium text-primary' : 'text-gray-900'}>
                    {shipping === 0 ? (
                      <span className="flex items-center gap-1">
                        <span className="text-gray-400 line-through">{formatPrice(89)}</span>
                        <span>FREE</span>
                      </span>
                    ) : (
                      formatPrice(shipping)
                    )}
                  </span>
                </div>

                {shipping > 0 && subtotal < 999 && (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-2">
                    <p className="text-xs text-gray-700">
                      Add items worth {formatPrice(999 - subtotal)} more to get <span className="font-medium text-primary">FREE delivery</span>
                    </p>
                  </div>
                )}

                <div className="flex justify-between border-t border-gray-300 pt-3 text-lg font-semibold">
                  <span className="text-gray-900">Total Amount</span>
                  <span className="text-primary">{formatPrice(total)}</span>
                </div>

                {subtotal > 999 && (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                    <p className="text-sm font-medium text-gray-700">
                      You will save <span className="font-semibold text-primary">{formatPrice(89)}</span> on this order
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 p-4">
                <Button
                  data-testid="cart-place-order-desktop"
                  onClick={handleCheckout}
                  disabled={isProcessing || items.length === 0}
                  className="w-full bg-primary py-3 font-medium text-white hover:bg-accent"
                  size="lg"
                >
                  {isProcessing ? 'Processing...' : 'Checkout'}
                </Button>

                {!isAuthenticated && (
                  <p className="mt-3 text-center text-xs text-gray-600">Guest checkout available. You can create an account after purchase.</p>
                )}
              </div>

              <div className="border-t border-gray-200 bg-orange-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-gray-800">
                  <ShieldCheck size={16} className="text-primary" />
                  <span className="font-medium">Safe and Secure Payments</span>
                </div>
                <p className="mb-2 text-xs text-gray-600">100% Payment Protection. Easy Return Policy</p>
                <div className="flex items-center gap-2">
                  <img src="/razorpay-badge.svg" alt="Razorpay" className="h-6" />
                  <span className="text-xs text-gray-700">Payments powered by Razorpay</span>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center">
              <Link href="/products" className="text-sm font-medium text-primary hover:text-accent transition-colors">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
