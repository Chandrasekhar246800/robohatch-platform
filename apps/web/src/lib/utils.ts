import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Product } from '@/types';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format price to currency
 */
export function formatPrice(price: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Check whether a sale price is valid and usable.
 */
export function hasSalePrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * Resolve the effective display price for a product.
 */
export function getEffectiveProductPrice(product: Pick<Product, 'price' | 'salePrice'>): number {
  return hasSalePrice(product.salePrice) ? product.salePrice : product.price;
}

/**
 * Resolve the original/list price for a product when a sale exists.
 */
export function getOriginalProductPrice(product: Pick<Product, 'price' | 'salePrice'>): number | undefined {
  return hasSalePrice(product.salePrice) ? product.price : undefined;
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

/**
 * Generate placeholder image URL
 */
export function getPlaceholderImage(width: number = 400, height: number = 400, text?: string): string {
  const displayText = text ? encodeURIComponent(text) : 'Product';
  return `https://placehold.co/${width}x${height}/F27405/white?text=${displayText}`;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Calculate discount percentage
 */
export function calculateDiscount(originalPrice: number, salePrice: number): number {
  if (originalPrice <= 0 || salePrice < 0) {
    return 0;
  }

  return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
}

/**
 * Truncate text
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Sleep utility for demos
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
