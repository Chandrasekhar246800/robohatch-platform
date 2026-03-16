'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Upload, X } from 'lucide-react';
import { Button, Card, CardContent, Input } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/lib/api-client';

interface Category {
  id: string;
  name: string;
  type?: string;
}

interface ProductImage {
  id?: string;
  url: string;
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();

  const productId = params.id as string;

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    salePrice: '',
    stock: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !_hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/login?redirect=/admin/products');
      return;
    }

    if (user?.role !== 'ADMIN') {
      router.push('/');
      return;
    }

    void loadPageData();
  }, [mounted, _hasHydrated, isAuthenticated, user, router, productId]);

  const loadPageData = async () => {
    try {
      setLoading(true);
      setError('');

      const [productResponse, categoriesResponse] = await Promise.all([
        apiClient.getProductById(productId),
        apiClient.getCategories(),
      ]);

      if (!productResponse.success || !productResponse.data) {
        setError(productResponse.message || 'Failed to load product');
        setLoading(false);
        return;
      }

      const product = productResponse.data as any;

      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: String(product.price ?? ''),
        salePrice: product.salePrice ? String(product.salePrice) : '',
        stock: String(product.stock ?? ''),
      });

      setSelectedCategories(product.categoryId ? [product.categoryId] : []);

      const normalizedImages: ProductImage[] = Array.isArray(product.images)
        ? product.images.map((img: any) => ({
            id: img.id,
            url: typeof img === 'string' ? img : img.url,
          }))
        : [];
      setExistingImages(normalizedImages);

      if (categoriesResponse.success && Array.isArray(categoriesResponse.data)) {
        setCategories(categoriesResponse.data as Category[]);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load edit page data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => file.type.startsWith('image/'));

    if (validFiles.length !== files.length) {
      setError('Only image files are allowed');
      return;
    }

    const totalImages = existingImages.length + selectedImages.length + validFiles.length;
    if (totalImages > 10) {
      setError('Maximum 10 total images allowed per product');
      return;
    }

    setSelectedImages((prev) => [...prev, ...validFiles]);

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    setError('');
  };

  const removeNewImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Product name is required');
      return;
    }

    if (!formData.price || Number(formData.price) <= 0) {
      setError('Valid price is required');
      return;
    }

    if (!formData.stock || Number(formData.stock) < 0) {
      setError('Stock must be 0 or greater');
      return;
    }

    if (selectedCategories.length === 0) {
      setError('Please select at least one category');
      return;
    }

    setSaving(true);

    try {
      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('description', formData.description);
      payload.append('price', formData.price);
      payload.append('salePrice', formData.salePrice);
      payload.append('stock', formData.stock);
      payload.append('categoryIds', JSON.stringify(selectedCategories));

      selectedImages.forEach((image) => {
        payload.append('images', image);
      });

      const response = await apiClient.updateProduct(productId, payload);
      if (!response.success) {
        setError(response.message || 'Failed to update product');
        setSaving(false);
        return;
      }

      setSuccess('Product updated successfully');
      setTimeout(() => router.push('/admin'), 1200);
    } catch (e: any) {
      setError(e?.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || !_hasHydrated || !isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-gold" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Edit Product</h1>
          <p className="text-gray-400">Update product details and images</p>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Product Name</label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="bg-gray-900 border-gray-700 text-white"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  disabled={saving}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Price</label>
                  <Input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="bg-gray-900 border-gray-700 text-white"
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Sale Price</label>
                  <Input
                    type="number"
                    name="salePrice"
                    value={formData.salePrice}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="bg-gray-900 border-gray-700 text-white"
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Stock</label>
                  <Input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    min="0"
                    className="bg-gray-900 border-gray-700 text-white"
                    disabled={saving}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Categories <span className="ml-2 text-sm text-gray-500">({selectedCategories.length} selected)</span>
                </label>
                <div className="border border-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto bg-gray-900 space-y-2">
                  {categories.map((category) => (
                    <label key={category.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-800 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id)}
                        onChange={() => {
                          setSelectedCategories((prev) =>
                            prev.includes(category.id)
                              ? prev.filter((id) => id !== category.id)
                              : [...prev, category.id]
                          );
                        }}
                        className="w-4 h-4 text-brand-gold border-gray-600 rounded focus:ring-brand-gold"
                        disabled={saving}
                      />
                      <span className="text-gray-200">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Existing Images ({existingImages.length})
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {existingImages.map((image, idx) => (
                    <img
                      key={image.id || `${image.url}-${idx}`}
                      src={image.url}
                      alt={`Existing ${idx + 1}`}
                      className="w-full h-28 object-cover rounded-lg border border-gray-700"
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Add More Images (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-brand-gold transition-colors">
                  <input
                    type="file"
                    id="images"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={saving}
                  />
                  <label htmlFor="images" className="cursor-pointer flex flex-col items-center">
                    <Upload className="w-10 h-10 text-gray-500 mb-3" />
                    <p className="text-white">Upload additional images</p>
                    <p className="text-sm text-gray-500">Max 10 total images per product</p>
                  </label>
                </div>

                {imagePreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-28 object-cover rounded-lg border border-gray-700"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={saving}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-lg">
                  {success}
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => router.push('/admin')}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-brand-gold hover:bg-brand-gold/90 text-black font-semibold"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
