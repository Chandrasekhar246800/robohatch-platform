'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingBag, ShoppingCart, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { Product } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { useCartStore } from '@/store/cart.store';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function WishlistPage() {
  const { isAuthenticated } = useAuthStore();
  const { items, count, isLoading, fetchWishlist, removeFromWishlist, clearWishlist } = useWishlistStore();
  const { addItem } = useCartStore();
  const router = useRouter();
  const [addingToCart, setAddingToCart] = React.useState<string | null>(null);
  const [removingItem, setRemovingItem] = React.useState<string | null>(null);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/wishlist');
    }
  }, [isAuthenticated, router]);

  // Fetch wishlist on mount
  React.useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist(isAuthenticated);
    }
  }, [isAuthenticated, fetchWishlist]);

  const handleAddToCart = async (wishlistItem: any) => {
    setAddingToCart(wishlistItem.id);
    try {
      const product: Product = {
        id: wishlistItem.product.id,
        name: wishlistItem.product.name,
        price: parseFloat(wishlistItem.product.price),
        originalPrice: parseFloat(wishlistItem.product.price),
        stock: wishlistItem.product.stock || 0,
        inStock: wishlistItem.product.stock > 0 && wishlistItem.product.isActive,
        category: wishlistItem.product.category || { id: '', name: 'Uncategorized' },
        description: wishlistItem.product.description || '',
        images: wishlistItem.product.image ? [wishlistItem.product.image] : [],
        rating: 0,
        reviews: 0,
        featured: false,
        customizable: false,
        tags: [],
        isActive: wishlistItem.product.isActive || false,
        createdAt: new Date().toISOString(),
      };

      addItem(product, 1, isAuthenticated);
      
      // Optional: Remove from wishlist after adding to cart
      // await removeFromWishlist(wishlistItem.id, wishlistItem.product.name);
      
      toast.success(`${wishlistItem.product.name} added to cart`, {
        icon: '🛒',
        duration: 2000,
      });
    } catch (error) {
      console.error('Add to cart error:', error);
    } finally {
      setAddingToCart(null);
    }
  };

  const handleRemove = async (wishlistItem: any) => {
    setRemovingItem(wishlistItem.id);
    try {
      await removeFromWishlist(wishlistItem.id, wishlistItem.product.name);
    } finally {
      setRemovingItem(null);
    }
  };

  const handleClearWishlist = async () => {
    if (window.confirm('Are you sure you want to clear your entire wishlist?')) {
      await clearWishlist();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-gray-600">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Wishlist</h1>
            <p className="text-gray-600">
              {isLoading ? 'Loading...' : `${count} ${count === 1 ? 'item' : 'items'}`}
            </p>
          </div>
          {items.length > 0 && (
            <Button
              variant="ghost"
              onClick={handleClearWishlist}
              disabled={isLoading}
            >
              <Trash2 size={16} className="mr-2" />
              Clear Wishlist
            </Button>
          )}
        </div>

        {/* Loading State */}
        {isLoading && items.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Loader2 size={48} className="animate-spin text-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading your wishlist...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && items.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart size={48} className="text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Your wishlist is empty
              </h2>
              <p className="text-gray-600 mb-8">
                Add products to your wishlist by clicking the heart icon on product pages.
              </p>
              <Link href="/products">
                <Button size="lg" className="px-8">
                  <ShoppingBag size={20} className="mr-2" />
                  Browse Products
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Wishlist Grid */}
        {items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col"
              >
                {/* Product Image */}
                <Link href={`/product/${item.product.id}`}>
                  <div className="relative aspect-square bg-gray-100 group cursor-pointer">
                    <Image
                      src={item.product.image || '/placeholder-product.jpg'}
                      alt={item.product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {(!item.product.isActive || item.product.stock === 0) && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">Out of Stock</span>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Product Details */}
                <div className="p-4 flex-1 flex flex-col">
                  {/* Category */}
                  {item.product.category && (
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      {item.product.category.name}
                    </p>
                  )}

                  {/* Product Name */}
                  <Link href={`/product/${item.product.id}`}>
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-primary cursor-pointer flex-1">
                      {item.product.name}
                    </h3>
                  </Link>

                  {/* Price */}
                  <div className="mb-4">
                    <span className="text-xl font-bold text-primary">
                      {formatPrice(parseFloat(item.product.price))}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleAddToCart(item)}
                      disabled={
                        !item.product.isActive ||
                        item.product.stock === 0 ||
                        addingToCart === item.id
                      }
                      className="w-full"
                      size="sm"
                    >
                      {addingToCart === item.id ? (
                        <>
                          <Loader2 size={16} className="mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={16} className="mr-2" />
                          Add to Cart
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => handleRemove(item)}
                      disabled={removingItem === item.id}
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                      size="sm"
                    >
                      {removingItem === item.id ? (
                        <>
                          <Loader2 size={16} className="mr-2 animate-spin" />
                          Removing...
                        </>
                      ) : (
                        <>
                          <Trash2 size={16} className="mr-2" />
                          Remove
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
