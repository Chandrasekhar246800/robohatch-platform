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
import { ProductGrid } from '@/components/product';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiClient } from '@/lib/api-client';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import { useCartStore } from '@/store/cart.store';
import { useAuthStore } from '@/store/auth.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { getProductById, getRelatedProducts } from '@/lib/mock-data';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.getProductById(productId);
        
        if (response.success && response.data) {
          // Transform API response to match expected format
          const productData = response.data;
          setProduct({
            ...productData,
            // Add default values for fields not in API response
            rating: 4.5,
            reviews: 0,
            inStock: productData.isActive !== false,
            originalPrice: undefined, // Can be added later if needed
          });

          // Fetch related products from the same category
          fetchRelatedProducts(productData.categoryId);
        } else {
          // Fallback to mock data
          console.log('Product not found in API, trying mock data');
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
            setError('Product not found');
          }
        }
      } catch (err) {
        console.error('Error fetching product, trying mock data:', err);
        // Fallback to mock data on error
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
      
      // Add to cart with custom data
      await apiClient.addToCart(
        product.id, 
        quantity, 
        customText || undefined, 
        uploadedImageUrl
      );
      
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
      
      addItem(cartProduct as any, quantity, isAuthenticated);
      toast.success('Added to cart!');
      
      setTimeout(() => {
        setIsAdding(false);
        router.push('/cart');
      }, 800);
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

  return (
    <div className="py-6 md:py-8">
      <div className="container-custom px-4">
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

            {/* Action Buttons */}
            <div className="flex gap-4 mb-8">
              <Button
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
