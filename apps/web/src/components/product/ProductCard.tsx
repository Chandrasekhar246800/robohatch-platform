'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Star, Heart } from 'lucide-react';
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
  const addItem = useCartStore((state) => state.addItem);
  const { isAuthenticated } = useAuthStore();
  const { isInWishlist, addToWishlist, removeFromWishlist, items } = useWishlistStore();
  const [isAdding, setIsAdding] = React.useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = React.useState(false);

  const inWishlist = isInWishlist(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsAdding(true);
    addItem(product, 1, isAuthenticated);
    setTimeout(() => setIsAdding(false), 1000);
  };

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push('/login?redirect=/products');
      return;
    }

    setIsWishlistLoading(true);

    try {
      if (inWishlist) {
        // Find the wishlist item ID
        const wishlistItem = items.find((item) => item.productId === product.id);
        if (wishlistItem) {
          await removeFromWishlist(wishlistItem.id, product.name);
        }
      } else {
        await addToWishlist(product.id, product.name);
      }
    } finally {
      setIsWishlistLoading(false);
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
            {/* Wishlist Heart Button */}
            <button
              onClick={handleWishlistToggle}
              disabled={isWishlistLoading}
              className={`absolute top-3 left-3 p-2 rounded-full bg-white shadow-md hover:scale-110 transition-all duration-200 ${
                isWishlistLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
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
              <Badge className="absolute top-3 right-3" variant="danger">
                {discount}% OFF
              </Badge>
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
            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 flex-1">
              {product.name}
            </h3>

            {/* Rating */}
            <div className="flex items-center space-x-1 mb-3">
              <Star size={16} className="fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium text-gray-900">
                {product.rating}
              </span>
              <span className="text-sm text-gray-500">({product.reviews})</span>
            </div>

            {/* Price */}
            <div className="mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold text-primary">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && (
                  <span className="text-sm text-gray-400 line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>
            </div>

            {/* Add to Cart Button */}
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
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
