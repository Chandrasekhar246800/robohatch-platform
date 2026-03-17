'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Upload, Sparkles, Package, Shield, Truck } from 'lucide-react';
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
          // Pick one product per category, then fill up to 4 with remaining products
          const seenCategories = new Set<string>();
          const diverse: typeof activeProducts = [];
          for (const p of activeProducts) {
            if (!seenCategories.has(p.category.id)) {
              seenCategories.add(p.category.id);
              diverse.push(p);
              if (diverse.length === 4) break;
            }
          }
          // If fewer than 4 distinct categories, fill remainder from unused products
          if (diverse.length < 4) {
            const usedIds = new Set(diverse.map((p: any) => p.id));
            for (const p of activeProducts) {
              if (!usedIds.has(p.id)) {
                diverse.push(p);
                if (diverse.length === 4) break;
              }
            }
          }
          productsData = diverse;
        }

        if (categoriesResponse.success && categoriesResponse.data) {
          categoriesData = categoriesResponse.data.slice(0, 3); // Show top 3 categories on homepage
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

        {/* 1. Animated Hero Section */}
        <AnimatedHero />

        {/* 2. Top 3 Product Categories */}
        <section className="py-12 md:py-16 bg-gray-50">
          <div className="container-custom px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-10"
            >
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
                Shop by Category
              </h2>
              <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto px-4">
                Explore our most popular categories of precision 3D printed products
              </p>
            </motion.div>
            {loading ? (
              <CategoryGridSkeleton count={3} />
            ) : categories.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {categories.map((category, index) => (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link href={`/products?category=${category.id}`}>
                      <div className="bg-white rounded-xl shadow-md p-8 hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-100 hover:border-primary/30 text-center">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                          <Package className="text-primary" size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-gray-500 text-sm">Explore collection →</p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : null}
            <div className="text-center mt-8">
              <Link href="/products">
                <Button variant="secondary" size="lg">
                  View All Categories <ArrowRight className="ml-2" size={16} />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* 4. Featured Products */}
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
                Explore our handpicked selection of trending and bestselling 3D printed items
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

        {/* 6. How It Works */}
        <section className="py-12 md:py-20">
          <div className="container-custom px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
                How It Works
              </h2>
              <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto px-4">
                From design to doorstep in 4 simple steps
              </p>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  step: '01',
                  icon: Upload,
                  title: 'Upload Your Design',
                  desc: 'Upload your STL, 3MF, OBJ, or GCODE file — or choose from our ready-made catalogue.',
                },
                {
                  step: '02',
                  icon: Sparkles,
                  title: 'Choose Material & Color',
                  desc: 'Pick from a range of materials, colors, and finish options to match your vision.',
                },
                {
                  step: '03',
                  icon: Package,
                  title: 'We Print It',
                  desc: 'Our precision printers get to work. Every detail is checked before it leaves our facility.',
                },
                {
                  step: '04',
                  icon: Truck,
                  title: 'Delivered to Your Door',
                  desc: 'Your print is carefully packaged and shipped with tracking every step of the way.',
                },
              ].map(({ step, icon: Icon, title, desc }, index) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                  className="relative text-center"
                >
                  {index < 3 && (
                    <div className="hidden lg:block absolute top-8 left-1/2 w-full h-0.5 bg-gray-200 z-0" />
                  )}
                  <div className="relative z-10">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <Icon className="text-white" size={28} />
                    </div>
                    <div className="text-xs font-bold text-primary uppercase tracking-widest mb-2">
                      Step {step}
                    </div>
                    <h3 className="text-lg font-bold mb-2">{title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="text-center mt-12">
              <Link href="/upload-3d-file">
                <Button size="lg">
                  <Upload className="mr-2" size={20} />
                  Upload Your 3D File
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* 7. Trust Badges */}
        <section className="py-12 md:py-16 bg-gray-50">
          <div className="container-custom px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {[
                {
                  icon: Sparkles,
                  title: 'Premium Quality',
                  desc: 'High-quality materials and precision printing for exceptional results',
                },
                {
                  icon: Truck,
                  title: 'Fast Delivery',
                  desc: 'Quick turnaround times with secure packaging and real-time tracking',
                },
                {
                  icon: Shield,
                  title: '100% Satisfaction',
                  desc: 'Quality guarantee with easy returns and excellent customer support',
                },
              ].map(({ icon: Icon, title, desc }, index) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="text-white" size={32} />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold mb-2">{title}</h3>
                  <p className="text-sm md:text-base text-gray-600">{desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </AdminGuard>
  );
}
