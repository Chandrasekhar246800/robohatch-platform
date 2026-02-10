'use client';

import React, { Suspense, useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SlidersHorizontal } from 'lucide-react';
import { ProductGrid } from '@/components/product';
import { ProductGridSkeleton } from '@/components/ui';
import { Button } from '@/components/ui';
import { AdminGuard } from '@/components/guards/AdminGuard';
import { apiClient } from '@/lib/api-client';
import { products as mockProducts, categories as mockCategories } from '@/lib/mock-data';

interface Category {
  id: string;
  name: string;
  type?: string; // 'CUSTOM' or 'DEFAULT'
  slug: string;
  image: string;
  description: string;
}

interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  order: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: Category;
  rating: number;
  reviews: number;
  inStock: boolean;
  featured: boolean;
  customizable: boolean;
  material?: string;
  dimensions?: string;
  weight?: string;
  tags: string[];
  isActive?: boolean;
  createdAt?: string;
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    categoryParam || 'all'
  );
  const [sortBy, setSortBy] = useState<string>('newest');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Try to fetch from API first
        const [productsResponse, categoriesResponse] = await Promise.all([
          apiClient.getProducts(),
          apiClient.getCategories(),
        ]);

        let productsData = [];
        let categoriesData = [];

        if (productsResponse.success && productsResponse.data && productsResponse.data.length > 0) {
          productsData = productsResponse.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: Number(p.price),
            images: p.images?.map((img: any) => img.url) || [],
            category: {
              id: p.category?.id || '',
              name: p.category?.name || 'Uncategorized',
              slug: p.category?.name?.toLowerCase().replace(/\s+/g, '-') || 'uncategorized',
              image: '',
              description: '',
            },
            rating: 4.5,
            reviews: 0,
            inStock: true,
            featured: false,
            customizable: false,
            tags: [],
            isActive: p.isActive,
            createdAt: p.createdAt,
          }));
          const activeProducts = productsData.filter((p: any) => p.isActive);
          productsData = activeProducts;
        } else {
          // Fallback to mock data if API returns empty
          console.log('Using mock data for products');
          productsData = mockProducts;
        }

        if (categoriesResponse.success && categoriesResponse.data && categoriesResponse.data.length > 0) {
          categoriesData = categoriesResponse.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            type: c.type, // Include type from API
            slug: c.name.toLowerCase().replace(/\s+/g, '-'),
            image: '',
            description: '',
          }));
        } else {
          // Fallback to mock data if API returns empty
          console.log('Using mock data for categories');
          categoriesData = mockCategories;
        }

        setProducts(productsData);
        setCategories(categoriesData);
        
        // Set featured products (random 4 products for "You May Also Like")
        const shuffled = [...productsData].sort(() => 0.5 - Math.random());
        setFeaturedProducts(shuffled.slice(0, 4));
      } catch (error) {
        console.error('Failed to load products, using mock data:', error);
        // Use mock data on error
        setProducts(mockProducts);
        setCategories(mockCategories);
        const shuffled = [...mockProducts].sort(() => 0.5 - Math.random());
        setFeaturedProducts(shuffled.slice(0, 4));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => 
        p.category.id === selectedCategory || p.category.slug === selectedCategory
      );
    }

    filtered = filtered.filter(
      (p) => Number(p.price) >= priceRange[0] && Number(p.price) <= priceRange[1]
    );

    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case 'price-high':
        filtered.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
      default:
        filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    return filtered;
  }, [products, selectedCategory, sortBy, priceRange]);

  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [categoryParam]);

  return (
    <div className="py-8">
      <div className="container-custom">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">All Products</h1>
          <p className="text-gray-600">
            Discover our complete collection of premium 3D printed items
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <aside
            className={`lg:w-64 ${showFilters ? 'block' : 'hidden'} lg:block space-y-6`}
          >
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg">Filters</h2>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setPriceRange([0, 10000]);
                    setSortBy('newest');
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Clear All
                </button>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-3 text-sm uppercase text-gray-600">
                  Category
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      value="all"
                      checked={selectedCategory === 'all'}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-sm">All Products</span>
                  </label>
                  
                  {/* Custom Categories */}
                  {categories.filter(c => c.type === 'CUSTOM').length > 0 && (
                    <>
                      <div className="pt-3 pb-1">
                        <span className="text-xs font-bold text-gray-700 uppercase">Custom</span>
                      </div>
                      {categories.filter(c => c.type === 'CUSTOM').map((category) => (
                        <label key={category.id} className="flex items-center space-x-2 cursor-pointer pl-2">
                          <input
                            type="radio"
                            name="category"
                            value={category.id}
                            checked={selectedCategory === category.id}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="text-primary focus:ring-primary"
                          />
                          <span className="text-sm">{category.name}</span>
                        </label>
                      ))}
                    </>
                  )}

                  {/* Default Categories */}
                  {categories.filter(c => c.type === 'DEFAULT' || !c.type).length > 0 && (
                    <>
                      <div className="pt-3 pb-1">
                        <span className="text-xs font-bold text-gray-700 uppercase">Default</span>
                      </div>
                      {categories.filter(c => c.type === 'DEFAULT' || !c.type).map((category) => (
                        <label key={category.id} className="flex items-center space-x-2 cursor-pointer pl-2">
                          <input
                            type="radio"
                            name="category"
                            value={category.id}
                            checked={selectedCategory === category.id}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="text-primary focus:ring-primary"
                          />
                          <span className="text-sm">{category.name}</span>
                        </label>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-sm uppercase text-gray-600">
                  Price Range
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>₹{priceRange[0]}</span>
                    <span>₹{priceRange[1]}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10000"
                    step="100"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    className="w-full accent-primary"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPriceRange([0, 500])}
                      className="text-xs"
                    >
                      Under ₹500
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPriceRange([0, 2000])}
                      className="text-xs"
                    >
                      Under ₹2000
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <p className="text-gray-600">
                {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
              </p>

              <div className="flex gap-4 w-full sm:w-auto">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <SlidersHorizontal size={18} />
                  <span>Filters</span>
                </button>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary flex-1 sm:flex-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="rating">Highest Rated</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <ProductGridSkeleton count={8} />
            ) : filteredProducts.length > 0 ? (
              <ProductGrid products={filteredProducts} />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600">No products found</p>
              </div>
            )}
          </div>
        </div>

        {/* You May Also Like Section */}
        {!isLoading && featuredProducts.length > 0 && (
          <div className="container-custom mt-16 mb-8">
            <div className="border-t pt-12">
              <h2 className="text-3xl font-bold mb-8 text-center">You May Also Like</h2>
              <ProductGrid products={featuredProducts} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <AdminGuard>
      <Suspense fallback={<ProductGridSkeleton count={8} />}>
        <ProductsContent />
      </Suspense>
    </AdminGuard>
  );
}
