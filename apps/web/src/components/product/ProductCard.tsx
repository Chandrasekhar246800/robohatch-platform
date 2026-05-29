'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Star, Heart, Plus, Minus, ArrowDown, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { Product } from '@/types';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { Button, Badge } from '@/components/ui';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const router = useRouter();
  const { addItem, updateQuantity, removeItem, getItemQuantity, items } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { isInWishlist, addToWishlist, removeFromWishlist, items: wishlistItems } = useWishlistStore();
  const [isAdding, setIsAdding] = React.useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = React.useState(false);
  const wishlistTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const inWishlist = isInWishlist(product.id);
  const cartQuantity = getItemQuantity(product.id);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (wishlistTimeoutRef.current) {
        clearTimeout(wishlistTimeoutRef.current);
      }
    };
  }, []);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsAdding(true);
    addItem(product, 1, isAuthenticated);
    setTimeout(() => setIsAdding(false), 1000);
  };

  const handleWishlistToggle = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent double-clicks/taps
    if (isWishlistLoading) {
      return;
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push('/login?redirect=/products');
      return;
    }

    setIsWishlistLoading(true);

    // Clear any existing timeout
    if (wishlistTimeoutRef.current) {
      clearTimeout(wishlistTimeoutRef.current);
    }

    try {
      if (inWishlist) {
        // Find the wishlist item ID
        const wishlistItem = wishlistItems.find((item) => item.productId === product.id);
        if (wishlistItem) {
          await removeFromWishlist(wishlistItem.id, product.name);
        }
      } else {
        await addToWishlist(product.id, product.name);
      }
    } catch (error) {
      console.error('Wishlist toggle error:', error);
    } finally {
      // Add small delay to prevent rapid clicking
      wishlistTimeoutRef.current = setTimeout(() => {
        setIsWishlistLoading(false);
      }, 300);
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateQuantity(product.id, cartQuantity + 1, isAuthenticated);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartQuantity > 1) {
      updateQuantity(product.id, cartQuantity - 1, isAuthenticated);
    } else {
      removeItem(product.id, isAuthenticated);
    }
  };

  const discount = product.originalPrice
    ? calculateDiscount(product.originalPrice, product.price)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.3 }}
    >
      <Link href={`/product/${product.id}`}>
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
          {/* Image */}
          <div className="relative aspect-square bg-gray-100">
            <Image
              src={
                product.images && product.images.length > 0
                  ? typeof product.images[0] === 'string'
                    ? product.images[0]
                    : product.images[0]?.url || '/placeholder-product.jpg'
                  : '/placeholder-product.jpg'
              }
              alt={product.name}
              fill
              className="object-cover"
            />
            
            {/* Wishlist Heart Button */}
            <button
              onClick={handleWishlistToggle}
              onTouchEnd={handleWishlistToggle}
              disabled={isWishlistLoading}
              className={`absolute top-3 right-3 p-2.5 rounded-full bg-white shadow-md hover:scale-110 active:scale-95 transition-all duration-200 touch-manipulation ${
                isWishlistLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart
                size={20}
                className={`transition-all duration-200 ${
                  inWishlist
                    ? 'fill-red-500 text-red-500'
                    : 'text-gray-400 hover:text-red-500'
                }`}
              />
            </button>

            {discount > 0 && (
              <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-[12px] font-semibold">
                <ArrowDown size={14} className="text-emerald-600" />
                <span>{discount}%</span>
              </div>
            )}
            {!product.inStock && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-bold text-lg">Out of Stock</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4 flex-1 flex flex-col">
            {/* Category */}
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {product.category.name}
            </p>

            {/* Title */}
            <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 flex-1">{product.name}</h3>

            <p className="mb-2 text-sm text-gray-600 line-clamp-1">{product.description || ''}</p>

            <div className="mb-2 flex items-center gap-3">
              {discount > 0 && (
                <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[12px] font-semibold">
                  <ArrowDown size={14} className="text-emerald-600" />
                  <span>{discount}%</span>
                </div>
              )}
              {product.originalPrice && (
                <span className="text-sm text-gray-400 line-through">{formatPrice(product.originalPrice)}</span>
              )}
              <span className="text-lg font-bold text-primary">{formatPrice(product.price)}</span>
            </div>

            <div className="mb-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[12px] font-semibold text-slate-700 border border-slate-100">
                <ShieldCheck className="text-emerald-600" size={14} />
                Assured
              </span>
            </div>

            <div className="mb-3 text-sm text-slate-600 inline-flex items-center gap-2">
              <Truck size={14} className="text-slate-600" />
              <span>Delivered in 5-7 days</span>
            </div>

            {/* Add to Cart Button or Quantity Controls */}
            {cartQuantity > 0 ? (
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={handleDecrement}
                  className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus size={18} className="text-gray-700" />
                </button>
                <span className="flex-1 text-center font-semibold text-lg">
                  {cartQuantity}
                </span>
                <button
                  onClick={handleIncrement}
                  disabled={!product.inStock}
                  className="flex items-center justify-center w-10 h-10 bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Increase quantity"
                >
                  <Plus size={18} className="text-white" />
                </button>
              </div>
            ) : (
              <Button
                onClick={handleAddToCart}
                disabled={!product.inStock || isAdding}
                className="w-full"
                size="sm"
              >
                {isAdding ? (
                  'Added!'
                ) : (
                  <>
                    <ShoppingCart size={16} className="mr-2" />
                    Add to Cart
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
