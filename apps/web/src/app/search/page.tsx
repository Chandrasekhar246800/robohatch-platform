'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Loader2, PackageX } from 'lucide-react';
import { ProductGrid } from '@/components/product';
import { ProductGridSkeleton } from '@/components/ui';
import { Button } from '@/components/ui';
import { AdminGuard } from '@/components/guards/AdminGuard';
import { apiClient } from '@/lib/api-client';
import { Product } from '@/types';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(query);

  useEffect(() => {
    const loadSearchResults = async () => {
      if (!query.trim()) {
        setProducts([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await apiClient.searchProducts(query);

        if (response.success && response.data) {
          const productsData = response.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: Number(p.price),
            stock: p.stock || 0,
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
            inStock: (p.stock || 0) > 0,
            featured: false,
            customizable: false,
            tags: [],
            isActive: p.isActive,
            createdAt: p.createdAt,
          }));

          setProducts(productsData);
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error('Failed to load search results:', error);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSearchResults();
  }, [query]);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  return (
    <AdminGuard>
      <div className="py-8">
        <div className="container-custom">
          {/* Page Header with Search */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">Search Results</h1>
            
            {/* Search Box */}
            <form onSubmit={handleSearch} className="max-w-2xl mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for products..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full px-4 py-3 pl-12 pr-4 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  autoFocus
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-1.5 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors font-medium text-sm"
                >
                  Search
                </button>
              </div>
            </form>

            {query && !isLoading && (
              <p className="text-gray-600">
                {products.length > 0 
                  ? `Found ${products.length} result${products.length !== 1 ? 's' : ''} for "${query}"`
                  : `No results found for "${query}"`
                }
              </p>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-gray-600">Searching products...</p>
            </div>
          )}

          {/* Empty State - No Query */}
          {!query && !isLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Search className="w-20 h-20 text-gray-300 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Start Your Search</h2>
              <p className="text-gray-600 text-center max-w-md">
                Enter keywords to find the perfect 3D printed products
              </p>
            </div>
          )}

          {/* Empty State - No Results */}
          {query && !isLoading && products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <PackageX className="w-20 h-20 text-gray-300 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Products Found</h2>
              <p className="text-gray-600 text-center max-w-md mb-6">
                We couldn't find any products matching "{query}". Try different keywords or browse our categories.
              </p>
              <div className="flex gap-4">
                <Button
                  variant="primary"
                  onClick={() => router.push('/products')}
                >
                  Browse All Products
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchInput('');
                    router.push('/search');
                  }}
                >
                  Clear Search
                </Button>
              </div>
            </div>
          )}

          {/* Results Grid */}
          {!isLoading && products.length > 0 && (
            <div>
              <ProductGrid products={products} />
              
              {/* Browse More CTA */}
              <div className="mt-12 text-center">
                <p className="text-gray-600 mb-4">
                  Can't find what you're looking for?
                </p>
                <Button
                  variant="secondary"
                  onClick={() => router.push('/products')}
                >
                  Browse All Products
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton />}>
      <SearchContent />
    </Suspense>
  );
}
