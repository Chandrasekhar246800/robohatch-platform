'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Trash2, Loader2, Tag, Edit2, Check, X } from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';

interface Category {
  id: string;
  name: string;
  isDefault?: boolean;
}

export default function CategoriesManagementPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      if (user?.role !== 'ADMIN') {
        router.push('/');
        return;
      }

      loadCategories();
    }
  }, [isAuthenticated, user, mounted, router]);

  const loadCategories = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/categories`
      );
      const data = await response.json();
      if (data.success) {
        setCategories(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      setError('Failed to load categories');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setError('Category name is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/categories`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Send httpOnly cookies
          body: JSON.stringify({ name: newCategoryName.trim() }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setSuccess('Category created successfully!');
        setNewCategoryName('');
        loadCategories();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to create category');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/categories/${categoryId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (data.success) {
        setSuccess('Category deleted successfully!');
        loadCategories();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to delete category');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleUpdateCategory = async (categoryId: string) => {
    if (!editingName.trim()) {
      setError('Category name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/categories/${categoryId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ name: editingName.trim() }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setSuccess('Category updated successfully!');
        setEditingId(null);
        setEditingName('');
        loadCategories();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to update category');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Category Management
              </h1>
              <p className="text-gray-400">
                Manage product categories (default and custom)
              </p>
            </div>
            <Button
              onClick={() => router.push('/admin')}
              variant="secondary"
              className="border-gray-700 text-white hover:bg-gray-800"
            >
              Back to Admin
            </Button>
          </div>

          {/* Create New Category */}
          <Card className="bg-gray-800 border-gray-700 mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Plus className="w-5 h-5 mr-2" />
                Create New Category
              </h2>
              <form onSubmit={handleCreateCategory} className="flex gap-4">
                <Input
                  value={newCategoryName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name (e.g., Decor, Toys, Accessories)"
                  className="flex-1 bg-gray-900 border-gray-700 text-white"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  disabled={loading || !newCategoryName.trim()}
                  className="bg-brand-gold hover:bg-brand-gold/90 text-black font-semibold"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Messages */}
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {/* Categories List */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Tag className="w-5 h-5 mr-2" />
                All Categories ({categories.length})
              </h2>

              {categories.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No categories yet. Create your first category above.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {categories.map((category, index) => (
                    <motion.div
                      key={category.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700 hover:border-brand-gold/50 transition-colors"
                    >
                      {editingId === category.id ? (
                        <>
                          <Input
                            value={editingName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingName(e.target.value)}
                            className="flex-1 bg-gray-800 border-gray-600 text-white mr-4"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateCategory(category.id)}
                              disabled={loading}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={cancelEditing}
                              disabled={loading}
                              variant="secondary"
                              className="border-gray-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-8 h-8 bg-brand-gold/20 rounded-lg flex items-center justify-center">
                              <Tag className="w-4 h-4 text-brand-gold" />
                            </div>
                            <span className="text-white font-medium">
                              {category.name}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => startEditing(category)}
                              disabled={loading}
                              variant="secondary"
                              className="border-gray-700 text-white hover:bg-gray-800"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id)}
                              disabled={loading}
                              variant="secondary"
                              className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg">
            <p className="text-blue-400 text-sm">
              <strong>💡 Tip:</strong> Categories help organize your products. Create categories like "Keychains", "Figurines", "Custom Orders", etc. You can edit or delete categories that have no products assigned.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
