'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Category } from '@/types';

interface CategoryCardProps {
  category: Category;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/products?category=${category.slug}`}>
        <div className="relative h-48 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 group">
          <Image
            src={category.image || '/placeholder-category.jpg'}
            alt={category.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white font-bold text-xl mb-1">{category.name}</h3>
            <p className="text-white/80 text-sm">{category.description || ''}</p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
