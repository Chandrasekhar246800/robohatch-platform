'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Upload, Sparkles, Package, Shield } from 'lucide-react';
import { Button } from '@/components/ui';
import { ProductGrid } from '@/components/product';
import { CategoryCard } from '@/components/product';
import { AnimatedHero } from '@/components/hero/AnimatedHero';
import { AdminGuard } from '@/components/guards/AdminGuard';
import { apiClient } from '@/lib/api-client';
import { ProductGridSkeleton, CategoryGridSkeleton } from '@/components/ui';
import { Product, Category } from '@/types';

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsResponse, categoriesResponse] = await Promise.all([
          apiClient.getProducts(),
          apiClient.getCategories(),
        ]);

        let productsData = [];
        let categoriesData = [];

        if (productsResponse.success && productsResponse.data) {
          // Get first 6 active products as featured
          const activeProducts = productsResponse.data
            .filter((p: any) => p.isActive)
            .map((p: any) => ({
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
          productsData = activeProducts.slice(0, 6);
        }

        if (categoriesResponse.success && categoriesResponse.data) {
          categoriesData = categoriesResponse.data.slice(0, 6); // Show first 6 categories
        }

        setFeaturedProducts(productsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Failed to load data:', error);
        // Show empty state on error, no fallback to mock data
        setFeaturedProducts([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <AdminGuard>
      <div>
      {/* Animated Hero Section */}
      <AnimatedHero />

      {/* Features Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container-custom px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="text-white" size={32} />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2">Premium Quality</h3>
              <p className="text-sm md:text-base text-gray-600">
                High-quality materials and precision printing for exceptional results
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="text-white" size={32} />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2">Fast Delivery</h3>
              <p className="text-sm md:text-base text-gray-600">
                Quick turnaround times with secure packaging and tracking
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="text-white" size={32} />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2">100% Satisfaction</h3>
              <p className="text-sm md:text-base text-gray-600">
                Quality guarantee with easy returns and excellent customer support
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 md:py-16">
        <div className="container-custom px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
              Featured Products
            </h2>
            <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto px-4">
              Explore our handpicked selection of trending and bestselling 3D printed
              items
            </p>
          </motion.div>
          {loading ? (
            <ProductGridSkeleton count={6} />
          ) : featuredProducts.length > 0 ? (
            <ProductGrid products={featuredProducts} />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">No products available yet</p>
            </div>
          )}
          <div className="text-center mt-12">
            <Link href="/products">
              <Button size="lg" variant="secondary">
                View All Products
                <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container-custom px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
              Browse Product Categories
            </h2>
            <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto px-4">
              Explore our ready-to-order 3D printed products across various categories
            </p>
          </motion.div>
          {loading ? (
            <CategoryGridSkeleton count={6} />
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link href={`/products?category=${category.id}`}>
                    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
                      <h3 className="text-xl font-bold mb-2">{category.name}</h3>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">No categories available</p>
            </div>
          )}
        </div>
      </section>

      {/* Upload 3D File CTA */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-primary to-accent">
        <div className="container-custom px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-white"
          >
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
              <Upload className="text-primary" size={40} />
            </div>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 px-4">
              Have Your Own 3D Model?
            </h2>
            <p className="text-base md:text-xl mb-6 md:mb-8 opacity-90 max-w-2xl mx-auto px-4">
              Upload your 3D files (STL, 3MF, OBJ, GCODE) and we'll bring them to life with precision printing. Perfect for custom designs, prototypes, or personal projects.
            </p>
            <Link href="/upload-3d-file">
              <Button
                size="lg"
                variant="secondary"
                className="bg-white text-primary hover:bg-gray-100"
              >
                <Upload className="mr-2" size={20} />
                Upload Your 3D File
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
    </AdminGuard>
  );
}
