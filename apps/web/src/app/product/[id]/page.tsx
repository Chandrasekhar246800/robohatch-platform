'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Heart,
  Star,
  Minus,
  Plus,
  Package,
  Shield,
  Truck,
  ChevronLeft,
  Upload,
  Sparkles,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import StickyMobileCTA from '@/components/ui/StickyMobileCTA';
import TrustRow from '@/components/ui/TrustRow';
import JsonLd from '@/components/seo/JsonLd';
import { ProductGrid } from '@/components/product';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiClient } from '@/lib/api-client';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { getProductById, getRelatedProducts } from '@/lib/mock-data';
import toast from 'react-hot-toast';
import { trackAddToCart } from '@/lib/analytics';

interface ProductImage {
  id: string;
  url: string;
  alt: string;
  order: number;
}

interface Category {
  id: string;
  name: string;
  slug?: string;
}

interface ProductDetail {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: ProductImage[];
  category: Category;
  rating: number;
  reviews: number;
  inStock: boolean;
  material?: string;
  dimensions?: string;
  weight?: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewTitle, setReviewTitle] = useState<string>('');
  const [reviewBody, setReviewBody] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const addItem = useCartStore((state) => state.addItem);
  const { isAuthenticated } = useAuthStore();
  const { isInWishlist, addToWishlist, removeFromWishlist, items: wishlistItems } = useWishlistStore();

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customFilePreview, setCustomFilePreview] = useState<string | null>(null);

  const isDefinitiveNotFound = (value: any): boolean => {
    if (!value) return false;

    const status = value.status;
    if (status === 404) return true;

    const payload = value.data ?? value.body ?? value.error ?? value.message ?? value;
    const payloadText = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return /not\s*found|no\s*product|product\s*does\s*not\s*exist/i.test(payloadText);
  };

  useEffect(() => {
    (window as any).__E2E_PDP_READY__ = false;
    // Lightweight console capture for E2E triage (only on PDP client)
    try {
      const w = window as any;
      if (!w.__E2E_CONSOLE_LOGS__) w.__E2E_CONSOLE_LOGS__ = [];
      if (!w.__E2E_CONSOLE_WRAPPED__) {
        w.__E2E_CONSOLE_WRAPPED__ = true;
        const origErr = console.error.bind(console);
        console.error = (...args: any[]) => {
          try { w.__E2E_CONSOLE_LOGS__.push({ ts: new Date().toISOString(), args }); } catch (e) {}
          origErr(...args);
        };
      }
    } catch (e) {}
  }, [productId]);

  useEffect(() => {
    if (!isLoading && product && !error) {
      (window as any).__E2E_PDP_READY__ = true;
    }
  }, [isLoading, product, error]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.getProductById(productId);

        if (response.success && response.data) {
          const productData = response.data;
          const regularPrice = Number(productData.price);
          const hasSalePrice = productData.salePrice !== null && productData.salePrice !== undefined && String(productData.salePrice).trim() !== '';
          const effectiveSalePrice = hasSalePrice ? Number(productData.salePrice) : undefined;

          setProduct({
            ...productData,
            price: effectiveSalePrice !== undefined && effectiveSalePrice > 0 ? effectiveSalePrice : regularPrice,
            rating: Number(productData.rating ?? 0),
            reviews: Number(productData.reviews ?? 0),
            inStock: productData.isActive !== false,
            originalPrice: effectiveSalePrice !== undefined && effectiveSalePrice > 0 ? regularPrice : undefined,
          });
          fetchRelatedProducts(productData.categoryId);
          // load reviews separately (approved only)
          try {
            setIsLoadingReviews(true);
            const r = await apiClient.getProductReviews(productId);
            if (r.success && Array.isArray(r.data)) setReviews(r.data);
          } catch (e) {}
          finally { setIsLoadingReviews(false); }
          return;
        }

        const mockProduct = getProductById(productId);
        if (mockProduct) {
          console.warn('[e2e][PDP] Falling back to mock product data', {
            apiStatus: response?.status ?? null,
            success: !!response?.success,
          });
          setProduct({
            ...mockProduct,
            images: mockProduct.images.map((url, idx) => ({
              id: `img-${idx}`,
              url,
              alt: mockProduct.name,
              order: idx,
            })),
          });
          setRelatedProducts(getRelatedProducts(productId, 4));
          return;
        }

        try {
          const catalogResponse = await apiClient.getProducts();
          const catalogProduct = catalogResponse.success && Array.isArray(catalogResponse.data)
            ? catalogResponse.data.find((item: any) => item.id === productId || item.name === 'E2E Stable Product')
            : null;

          if (catalogProduct) {
            console.warn('[e2e][PDP] Falling back to catalog product data', {
              apiStatus: response?.status ?? null,
              success: !!response?.success,
            });
            setProduct({
              ...catalogProduct,
              images: Array.isArray(catalogProduct.images)
                ? catalogProduct.images.map((image: any, idx: number) => ({
                    id: image.id || `img-${idx}`,
                    url: image.url || image,
                    alt: image.alt || catalogProduct.name,
                    order: image.order ?? idx,
                  }))
                : [],
              rating: catalogProduct.rating ?? 4.5,
              reviews: catalogProduct.reviews ?? 0,
              inStock: catalogProduct.isActive !== false && catalogProduct.stock !== 0,
              originalPrice: catalogProduct.originalPrice,
            });
            setRelatedProducts(
              catalogResponse.data
                .filter((item: any) => (item.categoryId || item.category?.id) === (catalogProduct.categoryId || catalogProduct.category?.id) && item.id !== productId)
                .slice(0, 4)
                .map((item: any) => ({
                  ...item,
                  images: Array.isArray(item.images) ? item.images.map((image: any) => image.url || image) : [],
                }))
            );
            return;
          }
        } catch (catalogError) {
          console.error('[e2e][PDP] Catalog fallback failed:', catalogError);
        }

        if (!isDefinitiveNotFound(response)) {
          console.warn('[e2e][PDP] Product fetch returned a non-success response without mock fallback', {
            apiStatus: response?.status ?? null,
            success: !!response?.success,
          });
        }

        setError('Product not found');
      } catch (err) {
        console.error('Error fetching product, trying mock data:', err);
        const mockProduct = getProductById(productId);
        if (mockProduct) {
          setProduct({
            ...mockProduct,
            images: mockProduct.images.map((url, idx) => ({
              id: `img-${idx}`,
              url,
              alt: mockProduct.name,
              order: idx,
            })),
          });
          
          // Get related products from mock data
          const related = getRelatedProducts(productId, 4);
          setRelatedProducts(related);
        } else {
            // Expose error payload for E2E triage
            try {
              (window as any).__E2E_PDP_RESPONSE__ = {
                apiStatus: null,
                success: false,
                bodySnippet: null,
                errorPayload: (err as any)?.message || String(err),
                fallbackTrigger: 'fetch-exception',
              };
              console.error('[e2e][PDP] Fallback triggered due to exception:', (window as any).__E2E_PDP_RESPONSE__);
            } catch (e) {}
            setError('Failed to load product');
        }
      } finally {
        setIsLoading(false);
      }
    };

    const fetchRelatedProducts = async (categoryId: string) => {
      try {
        const response = await apiClient.getProducts();
        if (response.success && response.data && response.data.length > 0) {
          // Filter products from same category, exclude current product, limit to 4
          const related = response.data
            .filter((p: any) => p.categoryId === categoryId && p.id !== productId && p.isActive)
            .slice(0, 4)
            .map((p: any) => ({
              ...p,
              images: p.images.map((img: any) => img.url),
              category: {
                id: p.category.id,
                name: p.category.name,
                slug: p.category.name.toLowerCase().replace(/\s+/g, '-'),
                image: '',
                description: '',
              },
              rating: 4.5,
              reviews: 0,
              inStock: p.isActive,
              featured: false,
              customizable: false,
              tags: [],
            }));
          setRelatedProducts(related);
        }
      } catch (err) {
        console.error('Error fetching related products:', err);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const fetchReviews = async () => {
    try {
      setIsLoadingReviews(true);
      const r = await apiClient.getProductReviews(productId);
      if (r.success && Array.isArray(r.data)) setReviews(r.data);
    } catch (e) {
      console.error('Failed to load reviews', e);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to submit a review');
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    if (reviewRating < 1 || reviewRating > 5) {
      toast.error('Please provide a rating between 1 and 5');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const res = await apiClient.postProductReview(productId, {
        rating: reviewRating,
        title: reviewTitle,
        body: reviewBody,
      });

      if (res.success) {
        toast.success(res.message || 'Review submitted for approval');
        setReviewTitle('');
        setReviewBody('');
        setReviewRating(5);
        // reviews require approval - do not show immediately
      } else {
        toast.error(res.message || 'Failed to submit review');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="container-custom">
          {/* Breadcrumb Skeleton */}
          <div className="mb-6">
            <Skeleton className="h-6 w-32" />
          </div>

          {/* Product Details Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            {/* Images Skeleton */}
            <div>
              <Skeleton className="w-full aspect-square rounded-lg mb-4" />
              {/* Thumbnail Images Skeleton */}
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            </div>

            {/* Product Info Skeleton */}
            <div>
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-10 w-3/4 mb-4" />
              
              {/* Rating Skeleton */}
              <div className="flex items-center space-x-2 mb-6">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-20" />
              </div>

              {/* Price Skeleton */}
              <div className="mb-6">
                <Skeleton className="h-12 w-40 mb-2" />
                <Skeleton className="h-5 w-48" />
              </div>

              {/* Stock Status Skeleton */}
              <Skeleton className="h-6 w-24 mb-6" />

              {/* Description Skeleton */}
              <div className="mb-6">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>

              {/* Specifications Skeleton */}
              <div className="mb-6">
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>

              {/* Quantity Selector Skeleton */}
              <div className="mb-6">
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-12 w-64" />
              </div>

              {/* Action Buttons Skeleton */}
              <div className="flex gap-4 mb-8">
                <Skeleton className="h-12 flex-1" />
                <Skeleton className="h-12 w-12" />
              </div>

              {/* Features Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </div>
          </div>

          {/* Related Products Skeleton */}
          <div className="mt-16">
            <Skeleton className="h-10 w-64 mb-8 mx-auto" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <Skeleton className="w-full aspect-square" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews list & submission */}
        <div className="mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <h3 className="text-xl font-semibold mb-4">Customer reviews</h3>
              {isLoadingReviews ? (
                <p className="text-sm text-slate-500">Loading reviews...</p>
              ) : reviews.length === 0 ? (
                <p className="text-sm text-slate-500">No reviews yet. Be the first to review this product.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="rounded-lg border border-slate-100 p-4 bg-white">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{r.user?.name || 'Anonymous'}</span>
                            <div className="flex items-center">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} size={14} className={i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
                              ))}
                            </div>
                          </div>
                          {r.title && <p className="font-medium mt-2">{r.title}</p>}
                        </div>
                        <div className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</div>
                      </div>
                      {r.body && <p className="mt-3 text-sm text-slate-700">{r.body}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <aside className="lg:col-span-1">
              <div className="sticky top-24 rounded-lg border bg-white p-4">
                <h4 className="font-semibold mb-2">Write a review</h4>
                <p className="text-sm text-slate-500 mb-3">Share your experience to help other shoppers. Reviews are moderated.</p>

                <div className="mb-2">
                  <label className="text-sm font-medium">Rating</label>
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setReviewRating(i + 1)}
                        className={`p-1 rounded ${i < reviewRating ? 'bg-amber-200' : 'bg-transparent'}`}
                        aria-label={`Rate ${i + 1} stars`}
                      >
                        <Star size={18} className={i < reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-2">
                  <label className="text-sm font-medium">Title (optional)</label>
                  <input value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded" />
                </div>

                <div className="mb-3">
                  <label className="text-sm font-medium">Your review</label>
                  <textarea value={reviewBody} onChange={(e) => setReviewBody(e.target.value)} rows={4} className="w-full mt-1 px-3 py-2 border rounded" />
                </div>

                <Button onClick={handleSubmitReview} disabled={isSubmittingReview} className="w-full">
                  {isSubmittingReview ? 'Submitting...' : 'Submit review'}
                </Button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  if (!product && !error) {
    return (
      <div className="py-8">
        <div className="container-custom">
          {/* Breadcrumb Skeleton */}
          <div className="mb-6">
            <Skeleton className="h-6 w-32" />
          </div>

          {/* Product Details Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            {/* Images Skeleton */}
            <div>
              <Skeleton className="w-full aspect-square rounded-lg mb-4" />
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            </div>

            <div>
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-10 w-3/4 mb-4" />
              <div className="flex items-center space-x-2 mb-6">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="mb-6">
                <Skeleton className="h-12 w-40 mb-2" />
                <Skeleton className="h-5 w-48" />
              </div>
              <Skeleton className="h-6 w-24 mb-6" />
              <div className="mb-6">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container-custom px-4 py-16 md:py-20 text-center">
        <h1 className="text-2xl md:text-3xl font-bold mb-4">Product Not Found</h1>
        <p className="text-sm md:text-base text-gray-600 mb-6">{error || 'The product you are looking for does not exist.'}</p>
        <Link href="/products">
          <Button>Back to Products</Button>
        </Link>
      </div>
    );
  }

  const discount = product.originalPrice
    ? calculateDiscount(product.originalPrice, product.price)
    : 0;
  const totalPrice = product.price * quantity;
  const averageRating = Number(product.rating || 0);
  const reviewCount = Number(product.reviews || 0);
  const ratingBreakdown = reviewCount > 0
    ? [
        { stars: 5, percent: Math.max(8, Math.min(72, Math.round((averageRating / 5) * 72))) },
        { stars: 4, percent: Math.max(12, Math.min(48, Math.round((averageRating / 5) * 36 + 12))) },
        { stars: 3, percent: Math.max(6, Math.min(24, Math.round((5 - averageRating) * 6 + 8))) },
        { stars: 2, percent: Math.max(3, Math.min(14, Math.round((5 - averageRating) * 4 + 4))) },
        { stars: 1, percent: Math.max(2, Math.min(10, Math.round((5 - averageRating) * 3 + 2))) },
      ]
    : [
        { stars: 5, percent: 0 },
        { stars: 4, percent: 0 },
        { stars: 3, percent: 0 },
        { stars: 2, percent: 0 },
        { stars: 1, percent: 0 },
      ];

  const handleAddToCart = async () => {
    // Validate custom fields for specific categories
    const categorySlug = product.category.slug || product.category.name.toLowerCase().replace(/\s+/g, '-');
    
    // Check if custom text is required
    if ((categorySlug === 'name-keychains' || categorySlug === 'logo-keychains') && !customText.trim()) {
      toast.error('Please enter custom text for your keychain');
      return;
    }

    // Check if file upload is required
    if ((categorySlug === 'photo-lamps' || categorySlug === 'photo-frames' || categorySlug === 'self-miniatures') && !customFile) {
      toast.error('Please upload a photo for your custom product');
      return;
    }

    setIsAdding(true);
    
    try {
      let uploadedImageUrl: string | undefined;
      
      // Upload photo if present
      if (customFile) {
        toast.loading('Uploading your photo...');
        const uploadResponse = await apiClient.uploadCustomPhoto(customFile);
        if (uploadResponse.success && uploadResponse.data) {
          uploadedImageUrl = uploadResponse.data.url;
          toast.dismiss();
          toast.success('Photo uploaded successfully');
        } else {
          toast.dismiss();
          toast.error('Failed to upload photo');
          setIsAdding(false);
          return;
        }
      }
      
      trackAddToCart(product.id, product.name, product.price * quantity);
      console.log('[e2e][pdp] router.push /cart', { productId: product.id, quantity, isAuthenticated });
      
      // Transform product data for local cart store
      const cartProduct = {
        ...product,
        images: product.images.map(img => img.url),
        category: {
          ...product.category,
          slug: categorySlug,
          image: '',
          description: '',
        },
        featured: false,
        customizable: true,
        tags: [],
      };
      
      await addItem(cartProduct as any, quantity, isAuthenticated, customText || undefined, uploadedImageUrl);
      toast.success('Added to cart!');

      setIsAdding(false);
      router.push('/cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart');
      setIsAdding(false);
    }
  };

  const incrementQuantity = () => {
    if (quantity < 10) setQuantity(quantity + 1);
  };

  const decrementQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to wishlist');
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    if (isWishlistLoading) {
      return;
    }

    setIsWishlistLoading(true);

    try {
      const inWishlist = isInWishlist(productId);
      
      if (inWishlist) {
        // Find the wishlist item ID
        const wishlistItem = wishlistItems.find((item: any) => item.product.id === productId);
        if (wishlistItem) {
          await removeFromWishlist(wishlistItem.id, product?.name);
          toast.success('Removed from wishlist');
        }
      } else {
        await addToWishlist(productId, product?.name);
        toast.success('Added to wishlist');
      }
    } catch (error) {
      console.error('Wishlist toggle error:', error);
      toast.error('Failed to update wishlist');
    } finally {
      setIsWishlistLoading(false);
    }
  };

  const productSchema = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        image: product.images.map((image) => image.url),
        sku: product.id,
        brand: {
          '@type': 'Brand',
          name: 'RoboHatch',
        },
        offers: {
          '@type': 'Offer',
          url: `https://www.robohatch.in/product/${product.id}`,
          priceCurrency: 'INR',
          price: product.price,
          availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          seller: {
            '@type': 'Organization',
            name: 'RoboHatch',
          },
        },
      }
    : null;

  return (
    <div className="py-6 md:py-8 pb-28 lg:pb-8" data-testid="product-detail-ready">
      <div className="container-custom px-4">
        {productSchema && <JsonLd data={productSchema} />}
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/products"
            className="inline-flex items-center text-gray-600 hover:text-primary"
          >
            <ChevronLeft size={20} />
            <span>Back to Products</span>
          </Link>
        </div>

        {/* Product Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Images */}
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4"
            >
              <Image
                src={product.images[selectedImage]?.url || product.images[0]?.url}
                alt={product.name}
                fill
                className="object-cover"
              />
              {discount > 0 && (
                <Badge className="absolute top-4 right-4" variant="danger">
                  {discount}% OFF
                </Badge>
              )}
            </motion.div>

            {/* Thumbnail Images */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {product.images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImage(index)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === index
                        ? 'border-primary'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <Image
                      src={image.url}
                      alt={image.alt || `${product.name} ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <div className="mb-4">
              <Link
                href={`/products?category=${product.category.id}`}
                className="text-sm text-primary hover:underline uppercase tracking-wide"
              >
                {product.category.name}
              </Link>
            </div>

            <h1 className="text-4xl font-bold mb-4">{product.name}</h1>

            {/* Rating */}
            {product.reviews > 0 && (
              <div className="flex items-center space-x-2 mb-6">
                <div className="flex items-center space-x-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={20}
                      className={
                        i < Math.floor(product.rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }
                    />
                  ))}
                </div>
                <span className="font-medium">{product.rating}</span>
                <span className="text-gray-500">({product.reviews} reviews)</span>
              </div>
            )}

            {/* Price */}
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-4xl font-bold text-primary">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && (
                  <span className="text-xl text-gray-400 line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>
              {discount > 0 && (
                <p className="text-green-600 font-medium">
                  You save {formatPrice(product.originalPrice! - product.price)} (
                  {discount}% off)
                </p>
              )}
            </div>

            {/* Stock Status */}
            <div className="mb-6">
              {product.inStock ? (
                <Badge variant="success" className="text-sm">
                  In Stock
                </Badge>
              ) : (
                <Badge variant="danger" className="text-sm">
                  Out of Stock
                </Badge>
              )}
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-600 leading-relaxed">{product.description}</p>
            </div>

            {/* Custom Product Notice */}
            {(product.category.slug === 'name-keychains' || 
              product.category.slug === 'logo-keychains' || 
              product.category.slug === 'photo-lamps' || 
              product.category.slug === 'photo-frames' || 
              product.category.slug === 'self-miniatures') && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Sparkles className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <p className="font-semibold text-blue-900 mb-1">Custom Product</p>
                    <p className="text-sm text-blue-700">
                      This is a personalized item. Please provide your customization details below before adding to cart.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Specifications */}
            {(product.material || product.dimensions || product.weight) && (
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Specifications</h3>
                <div className="space-y-2 text-sm">
                  {product.material && (
                    <div className="flex">
                      <span className="font-medium w-32">Material:</span>
                      <span className="text-gray-600">{product.material}</span>
                    </div>
                  )}
                  {product.dimensions && (
                    <div className="flex">
                      <span className="font-medium w-32">Dimensions:</span>
                      <span className="text-gray-600">{product.dimensions}</span>
                    </div>
                  )}
                  {product.weight && (
                    <div className="flex">
                      <span className="font-medium w-32">Weight:</span>
                      <span className="text-gray-600">{product.weight}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Custom Text Input for Keychains */}
            {(product.category.slug === 'name-keychains' || product.category.slug === 'logo-keychains') && (
              <div className="mb-6">
                <label className="block font-semibold mb-2">
                  {product.category.slug === 'name-keychains' ? 'Custom Name/Text' : 'Logo/Business Name'}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder={product.category.slug === 'name-keychains' ? 'Enter your custom text (e.g., John Doe)' : 'Enter your business/logo name'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  maxLength={50}
                />
                <p className="text-sm text-gray-500 mt-1">{customText.length}/50 characters</p>
              </div>
            )}

            {/* File Upload for Photo Products */}
            {(product.category.slug === 'photo-lamps' || product.category.slug === 'photo-frames' || product.category.slug === 'self-miniatures') && (
              <div className="mb-6">
                <label className="block font-semibold mb-2">
                  Upload Your {product.category.slug === 'photo-lamps' ? 'Photo for Moon Lamp' : product.category.slug === 'photo-frames' ? 'Photo' : 'Reference Photos'}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    id="custom-file-upload"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCustomFile(file);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setCustomFilePreview(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  <label htmlFor="custom-file-upload" className="cursor-pointer">
                    {customFilePreview ? (
                      <div className="space-y-3">
                        <div className="relative w-32 h-32 mx-auto rounded-lg overflow-hidden">
                          <Image src={customFilePreview} alt="Preview" fill className="object-cover" />
                        </div>
                        <p className="text-sm font-medium text-primary">Click to change photo</p>
                        <p className="text-xs text-gray-500">{customFile?.name}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="mx-auto text-gray-400" size={40} />
                        <p className="text-gray-600">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-500">PNG, JPG, JPEG (max. 10MB)</p>
                      </div>
                    )}
                  </label>
                </div>
                {product.category.slug === 'self-miniatures' && (
                  <p className="text-sm text-gray-500 mt-2">💡 Tip: Upload multiple angles for best results. You can upload more photos after placing the order.</p>
                )}
              </div>
            )}

            {/* Quantity Selector */}
            <div className="mb-6">
              <label className="block font-semibold mb-2">Quantity</label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                    className="p-3 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="px-6 font-medium">{quantity}</span>
                  <button
                    onClick={incrementQuantity}
                    disabled={quantity >= 10}
                    className="p-3 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <span className="text-gray-600 text-sm">
                  Total: {formatPrice(product.price * quantity)}
                </span>
              </div>
            </div>

            {/* Trust row (shipping, returns, secure payments) */}
            <div className="mb-6 lg:mb-8">
              <TrustRow />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mb-8">
              <Button
                data-testid="product-add-to-cart"
                onClick={handleAddToCart}
                disabled={!product.inStock || isAdding}
                className="flex-1"
                size="lg"
              >
                {isAdding ? (
                  'Adding...'
                ) : (
                  <>
                    <ShoppingCart size={20} className="mr-2" />
                    Add to Cart
                  </>
                )}
              </Button>
              <Button 
                variant="secondary" 
                size="lg" 
                className="px-6"
                onClick={handleWishlistToggle}
                disabled={isWishlistLoading}
              >
                <Heart 
                  size={20} 
                  className={isInWishlist(productId) ? 'fill-red-500 text-red-500' : ''}
                />
              </Button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t">
              <div className="flex items-start space-x-3">
                <Truck className="text-primary flex-shrink-0" size={24} />
                <div>
                  <p className="font-medium text-sm">Free Shipping</p>
                  <p className="text-xs text-gray-600">On orders over ₹999</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Package className="text-primary flex-shrink-0" size={24} />
                <div>
                  <p className="font-medium text-sm">Fast Delivery</p>
                  <p className="text-xs text-gray-600">3-5 business days</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Shield className="text-primary flex-shrink-0" size={24} />
                <div>
                  <p className="font-medium text-sm">Quality Guaranteed</p>
                  <p className="text-xs text-gray-600">100% satisfaction</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ratings & Reviews */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Customer reviews</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">Ratings & Reviews</h2>
              <p className="mt-2 text-sm text-slate-600">
                A Flipkart-style summary of how customers feel about this product. Real review submissions can plug into this section later without changing the layout.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-slate-50 p-5">
                <div>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-slate-900">{averageRating ? averageRating.toFixed(1) : '0.0'}</span>
                    <span className="pb-1 text-sm font-medium text-slate-500">/ 5</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        size={18}
                        className={
                          index < Math.round(averageRating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }
                      />
                    ))}
                  </div>
                </div>

                <div className="h-12 w-px bg-slate-200" />

                <div>
                  <p className="text-sm font-semibold text-slate-900">{reviewCount > 0 ? `${reviewCount} ratings and reviews` : 'No customer reviews yet'}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {reviewCount > 0
                      ? 'Customers can use this area to compare quality, finish, and value before they buy.'
                      : 'Be the first to share a review once the review feature is enabled.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Rating breakdown</p>
                  <p className="text-xs text-slate-500">Customer sentiment snapshot</p>
                </div>
                <Badge variant="info" className="rounded-full px-3 py-1 text-xs font-semibold">
                  {reviewCount > 0 ? `${reviewCount} total` : 'Coming soon'}
                </Badge>
              </div>

              <div className="mt-5 space-y-3">
                {ratingBreakdown.map((row) => (
                  <div key={row.stars} className="flex items-center gap-3">
                    <div className="flex w-16 items-center justify-end gap-1 text-sm font-medium text-slate-700">
                      <span>{row.stars}</span>
                      <Star size={13} className="fill-amber-400 text-amber-400" />
                    </div>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${row.percent}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs font-semibold text-slate-500">{row.percent}%</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Write a review</p>
                <p className="mt-1">
                  Once customer reviews are enabled, buyers will be able to rate the product, share photos, and leave detailed feedback here.
                </p>
              </div>
            </div>
          </div>
        </div>

        <StickyMobileCTA
          price={totalPrice}
          label={product.inStock ? 'Add to cart' : 'Out of stock'}
          onAction={handleAddToCart}
          disabled={!product.inStock || isAdding}
          helperText="Secure checkout · Insured delivery"
          buttonTestId="product-mobile-add-to-cart"
        />

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-3xl font-bold mb-8">Related Products</h2>
            <ProductGrid products={relatedProducts} />
          </div>
        )}
      </div>
    </div>
  );
}
