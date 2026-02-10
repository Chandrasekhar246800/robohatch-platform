'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Database, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';

export default function SeedCategoriesPage() {
  const router = useRouter();
  const { user, isAuthenticated, token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  // Check authentication and admin role
  React.useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [isAuthenticated, user, router]);

  const handleSeedCategories = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/seed-categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data);
      } else {
        setError(data.message || 'Failed to seed categories');
      }
    } catch (err: any) {
      console.error('Seed error:', err);
      setError(err.message || 'Failed to connect to API');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container-custom max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-md p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-8 h-8 text-brand-gold" />
            <h1 className="text-3xl font-bold">Seed Categories</h1>
          </div>

          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              This tool will populate your production database with the default categories.
              It's safe to run multiple times - if categories already exist, it will skip the seeding.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-900 mb-2">Categories to be created:</h3>
              <div className="text-sm text-blue-800">
                <p className="font-medium mt-2">Custom Categories (5):</p>
                <ul className="list-disc list-inside ml-2">
                  <li>Keychains (Custom)</li>
                  <li>Logo Keychains</li>
                  <li>Moon Lamps</li>
                  <li>Photo Frames</li>
                  <li>Self Miniatures</li>
                </ul>
                
                <p className="font-medium mt-3">Default Categories (9):</p>
                <ul className="list-disc list-inside ml-2">
                  <li>Keychains</li>
                  <li>Lamps</li>
                  <li>Flower Pots & Vases</li>
                  <li>Devotional Idols</li>
                  <li>Temple Models</li>
                  <li>Anime Things</li>
                  <li>Mobile Accessories</li>
                  <li>Desk Accessories</li>
                  <li>Fidget Toys</li>
                </ul>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSeedCategories}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Seeding Categories...
              </>
            ) : (
              <>
                <Database className="w-5 h-5 mr-2" />
                Seed Categories Now
              </>
            )}
          </Button>

          {/* Success Result */}
          {result && result.success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 mb-2">{result.message}</h3>
                  {result.data && (
                    <div className="text-sm text-green-800">
                      <p>Total: {result.data.total || result.data.existingCount} categories</p>
                      {result.data.custom !== undefined && (
                        <>
                          <p>Custom: {result.data.custom}</p>
                          <p>Default: {result.data.default}</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-1">Error</h3>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </motion.div>
          )}

          <div className="mt-6 pt-6 border-t">
            <Button
              variant="ghost"
              onClick={() => router.push('/admin')}
              className="w-full"
            >
              Back to Admin Dashboard
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
