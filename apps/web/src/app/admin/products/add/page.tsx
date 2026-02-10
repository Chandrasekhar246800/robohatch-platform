'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';

interface Category {
  id: string;
  name: string;
  type?: string; // 'CUSTOM' or 'DEFAULT'
}

export default function AddProductPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check authentication and admin role
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

      // Load categories
      loadCategories();
    }
  }, [isAuthenticated, user, mounted, router]);

  const loadCategories = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      console.log('Loading categories from:', `${apiUrl}/api/categories`);
      
      const response = await fetch(`${apiUrl}/api/categories`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Categories response:', data);
      
      if (data.success && data.data && data.data.length > 0) {
        // Categories are already sorted by backend (type ASC, name ASC)
        setCategories(data.data);
        console.log('Loaded categories:', data.data.length);
      } else {
        // If no categories exist, show message
        console.warn('No categories found in database');
        setCategories([]);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      setError('Failed to load categories. Please refresh the page.');
      setCategories([]);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validate file types
    const validFiles = files.filter((file) => file.type.startsWith('image/'));

    if (validFiles.length !== files.length) {
      setError('Only image files are allowed');
      return;
    }

    // Limit to 10 images
    const totalImages = selectedImages.length + validFiles.length;
    if (totalImages > 10) {
      setError('Maximum 10 images allowed');
      return;
    }

    // Add new files
    setSelectedImages((prev) => [...prev, ...validFiles]);

    // Create previews
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    setError('');
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.name.trim()) {
      setError('Product name is required');
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError('Valid price is required');
      return;
    }

    if (!formData.categoryId) {
      setError('Please select a category');
      return;
    }

    if (selectedImages.length === 0) {
      setError('At least one product image is required');
      return;
    }

    setLoading(true);

    try {
      // Create FormData for multipart upload
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price);
      formDataToSend.append('categoryId', formData.categoryId);

      // Append all images
      selectedImages.forEach((image) => {
        formDataToSend.append('images', image);
      });

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/products`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formDataToSend,
        }
      );

      const data = await response.json();

      if (data.success) {
        setSuccess('Product created successfully!');
        // Reset form
        setFormData({
          name: '',
          description: '',
          price: '',
          categoryId: '',
        });
        setSelectedImages([]);
        setImagePreviews([]);

        // Redirect to admin page after 2 seconds
        setTimeout(() => {
          router.push('/admin');
        }, 2000);
      } else {
        setError(data.message || 'Failed to create product');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to create product');
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
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Add New Product
            </h1>
            <p className="text-gray-400">
              Upload product images and fill in the details
            </p>
          </div>

          {/* Form */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Product Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter product name"
                    className="bg-gray-900 border-gray-700 text-white"
                    disabled={loading}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter product description"
                    rows={4}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-gold"
                    disabled={loading}
                  />
                </div>

                {/* Price and Category Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Price <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="bg-gray-900 border-gray-700 text-white"
                      disabled={loading}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="categoryId"
                      value={formData.categoryId}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-gold"
                      disabled={loading || categories.length === 0}
                    >
                      <option value="">
                        {categories.length === 0 ? 'No categories available' : 'Select a category'}
                      </option>
                      
                      {/* Custom Categories */}
                      {categories.filter(c => c.type === 'CUSTOM').length > 0 && (
                        <optgroup label="Custom Categories">
                          {categories.filter(c => c.type === 'CUSTOM').map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      
                      {/* Default Categories */}
                      {categories.filter(c => c.type === 'DEFAULT' || !c.type).length > 0 && (
                        <optgroup label="Default Categories">
                          {categories.filter(c => c.type === 'DEFAULT' || !c.type).map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    {categories.length === 0 && (
                      <p className="mt-1 text-sm text-yellow-500">
                        No categories found. Please create categories first.
                      </p>
                    )}
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Product Images <span className="text-red-500">*</span>
                    <span className="text-gray-500 text-xs ml-2">
                      (Max 10 images, 5MB each)
                    </span>
                  </label>

                  {/* Upload Button */}
                  <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-brand-gold transition-colors">
                    <input
                      type="file"
                      id="images"
                      multiple
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      disabled={loading || selectedImages.length >= 10}
                    />
                    <label
                      htmlFor="images"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="w-12 h-12 text-gray-500 mb-4" />
                      <p className="text-white mb-2">
                        Click to upload images
                      </p>
                      <p className="text-sm text-gray-500">
                        PNG, JPG, WEBP up to 5MB
                      </p>
                    </label>
                  </div>

                  {/* Image Previews */}
                  {imagePreviews.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="relative group"
                        >
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-700"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            disabled={loading}
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {index + 1}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                {/* Success Message */}
                {success && (
                  <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-lg">
                    {success}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-brand-gold hover:bg-brand-gold/90 text-black font-semibold"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Product...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Create Product
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => router.push('/admin')}
                    disabled={loading}
                    variant="secondary"
                    className="border-gray-700 text-white hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
