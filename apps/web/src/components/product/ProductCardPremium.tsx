"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, Minus, Plus, ShoppingCart, ShieldCheck, Truck, Star, ArrowDown } from "lucide-react";
import { Product } from "@/types";
import { formatPrice, calculateDiscount, getEffectiveProductPrice, getOriginalProductPrice } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import { useWishlistStore } from "@/store/wishlist.store";
import { Badge, Button } from "@/components/ui";
import { trackAddToCart } from "@/lib/analytics";

type Props = {
  product: Product;
};

export default function ProductCardPremium({ product }: Props) {
  const router = useRouter();
  const { addItem, updateQuantity, removeItem, getItemQuantity } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { isInWishlist, addToWishlist, removeFromWishlist, items: wishlistItems } = useWishlistStore();

  const [isAdding, setIsAdding] = React.useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = React.useState(false);
  const wishlistTimeoutRef = React.useRef<number | null>(null);

  const inWishlist = isInWishlist(product.id);
  const cartQuantity = getItemQuantity(product.id);
  const salePrice = getEffectiveProductPrice(product);
  const originalPrice = getOriginalProductPrice(product) ?? product.originalPrice;
  const discount = originalPrice ? calculateDiscount(originalPrice, salePrice) : 0;

  React.useEffect(() => {
    return () => {
      if (wishlistTimeoutRef.current) {
        clearTimeout(wishlistTimeoutRef.current);
      }
    };
  }, []);

  const imageSrc =
    product.images && product.images.length > 0
      ? typeof product.images[0] === 'string'
        ? product.images[0]
        : product.images[0]?.url || '/images/product-placeholder-premium.svg'
      : '/images/product-placeholder-premium.svg';

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAdding(true);
    trackAddToCart(product.id, product.name, salePrice);
    addItem(product, 1, isAuthenticated);
    window.setTimeout(() => setIsAdding(false), 1000);
  };

  const handleWishlistToggle = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isWishlistLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.push('/login?redirect=/products');
      return;
    }

    setIsWishlistLoading(true);

    if (wishlistTimeoutRef.current) {
      clearTimeout(wishlistTimeoutRef.current);
    }

    try {
      if (inWishlist) {
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
      wishlistTimeoutRef.current = window.setTimeout(() => {
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

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="group"
    >
      <Link href={`/product/${product.id}`} className="block h-full">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100 h-full flex flex-col transition-shadow duration-300 group-hover:shadow-xl">
          <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-50 to-white overflow-hidden">
            <Image
              src={imageSrc}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(min-width:1280px) 25vw, (min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/18 via-black/0 to-black/0" />

            <button
              onClick={handleWishlistToggle}
              onTouchEnd={handleWishlistToggle}
              disabled={isWishlistLoading}
              className={`absolute top-3 right-3 z-10 inline-flex items-center justify-center rounded-full bg-white/95 p-2.5 shadow-md transition-transform duration-200 active:scale-95 ${isWishlistLoading ? 'opacity-50' : 'hover:scale-110'}`}
              aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart
                size={18}
                className={inWishlist ? 'fill-red-500 text-red-500' : 'text-slate-400'}
              />
            </button>

            {!product.inStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
                <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg">
                  Out of stock
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col p-4 sm:p-5">
            <div className="mb-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 line-clamp-1">{product.category.name}</p>
            </div>

            <h3 className="mb-1 text-[15px] font-semibold leading-snug text-slate-900 sm:text-base">{product.name}</h3>

            <p className="mb-2 text-sm text-slate-600 line-clamp-1">{product.description || ''}</p>

            <div className="mb-1 flex items-center gap-3 flex-wrap min-w-0">
              {discount > 0 && originalPrice && (
                <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[12px] font-semibold flex-shrink-0">
                  <ArrowDown size={14} className="text-emerald-600" />
                  <span>{discount}%</span>
                </div>
              )}
              {originalPrice && (
                <span className="text-sm text-slate-400 line-through flex-shrink-0">{formatPrice(originalPrice)}</span>
              )}
              <span className="text-lg font-bold text-primary min-w-0 truncate">{formatPrice(salePrice)}</span>
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

            <div className="mt-auto">
              {cartQuantity > 0 ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
                  <button
                    onClick={handleDecrement}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-700 transition hover:bg-slate-100"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={17} />
                  </button>
                  <span className="min-w-10 flex-1 text-center text-base font-semibold text-slate-900">{cartQuantity}</span>
                  <button
                    onClick={handleIncrement}
                    disabled={!product.inStock}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Increase quantity"
                  >
                    <Plus size={17} />
                  </button>
                </div>
              ) : (
                <Button
                  onClick={handleAddToCart}
                  disabled={!product.inStock || isAdding}
                  className="w-full shadow-sm"
                  size="sm"
                >
                  {isAdding ? (
                    'Added'
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
        </div>
      </Link>
    </motion.article>
  );
}
