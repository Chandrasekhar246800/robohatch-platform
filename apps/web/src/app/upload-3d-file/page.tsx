'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Upload as UploadIcon,
  File,
  X,
  CheckCircle,
  AlertCircle,
  Info,
  Package,
  Palette,
  Ruler
} from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

const ALLOWED_FILE_TYPES = ['.stl', '.3mf', '.obj', '.gcode'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const materials = [
  { id: 'pla', name: 'PLA', description: 'Standard, eco-friendly' },
  { id: 'abs', name: 'ABS', description: 'Durable, heat-resistant' },
  { id: 'petg', name: 'PETG', description: 'Strong, flexible' },
  { id: 'tpu', name: 'TPU', description: 'Flexible, rubber-like' },
  { id: 'resin', name: 'Resin (SLA)', description: 'High detail printing' },
];

const colors = [
  { id: 'white', name: 'White', hex: '#FFFFFF' },
  { id: 'black', name: 'Black', hex: '#000000' },
  { id: 'red', name: 'Red', hex: '#EF4444' },
  { id: 'blue', name: 'Blue', hex: '#3B82F6' },
  { id: 'green', name: 'Green', hex: '#10B981' },
  { id: 'yellow', name: 'Yellow', hex: '#F59E0B' },
  { id: 'natural', name: 'Natural', hex: '#D4A574' },
];

export default function Upload3DFilePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Backend pricing data
  const [backendPrice, setBackendPrice] = useState<number | null>(null);
  const [pricingAccurate, setPricingAccurate] = useState<boolean>(false);
  const [filamentGrams, setFilamentGrams] = useState<number | null>(null);
  const [printTimeSeconds, setPrintTimeSeconds] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    material: 'pla',
    color: 'white',
    quantity: 1,
    infillPercentage: 20,
    layerHeight: 0.2,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/upload-3d-file');
    }
  }, [isAuthenticated, router]);

  const validateFile = (file: File): boolean => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!ALLOWED_FILE_TYPES.includes(fileExtension)) {
      setErrors({ 
        file: `Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}` 
      });
      return false;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      setErrors({ 
        file: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
      });
      return false;
    }
    
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && validateFile(selectedFile)) {
      setFile(selectedFile);
      setErrors({});
      if (!formData.name) {
        setFormData({ 
          ...formData, 
          name: selectedFile.name.replace(/\.[^/.]+$/, '') 
        });
      }
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && validateFile(droppedFile)) {
      setFile(droppedFile);
      setErrors({});
      if (!formData.name) {
        setFormData({ 
          ...formData, 
          name: droppedFile.name.replace(/\.[^/.]+$/, '') 
        });
      }
    }
  }, [formData]);

  const removeFile = () => {
    setFile(null);
    setErrors({});
    setBackendPrice(null);
    setPricingAccurate(false);
    setFilamentGrams(null);
    setPrintTimeSeconds(null);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setErrors({ file: 'Please select a file to upload' });
      return;
    }

    if (!formData.name.trim()) {
      setErrors({ name: 'Design name is required' });
      return;
    }

    setIsUploading(true);
    setErrors({});

    const uploadToast = toast.loading('Uploading your 3D design...');

    try {
      // Simulate upload progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      const result = await apiClient.upload3DDesign({
        file,
        name: formData.name,
        description: formData.description,
        material: formData.material,
        color: formData.color,
        quantity: formData.quantity,
        infillPercentage: formData.infillPercentage,
        layerHeight: formData.layerHeight,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success) {
        // Store pricing data from backend
        if (result.pricing) {
          setBackendPrice(result.pricing.final_price);
          setPricingAccurate(result.pricing.accurate);
          if (result.pricing.filament_grams) {
            setFilamentGrams(result.pricing.filament_grams);
          }
          if (result.pricing.print_time_seconds) {
            setPrintTimeSeconds(result.pricing.print_time_seconds);
          }
        }

        const successMsg = result.pricing?.accurate
          ? `3D design uploaded with accurate pricing! Final price: ₹${result.pricing.final_price}`
          : '3D design uploaded successfully! We\'ll review it and send you a quote.';
        
        toast.success(successMsg, {
          id: uploadToast,
          duration: 5000,
        });
        
        // Redirect after a short delay
        setTimeout(() => {
          router.push('/orders');
        }, 1500);
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      const errorMessage = error.message || 'Failed to upload file. Please try again.';
      setErrors({ submit: errorMessage });
      toast.error(errorMessage, { id: uploadToast });
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Upload 3D File</h1>
          <p className="text-gray-600">
            Have your own 3D design? Upload your STL or 3MF file and we'll print it for you!
          </p>
          
          {/* STL Analysis Info Banner */}
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <CheckCircle className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="font-medium text-blue-900">Backend STL Analysis</p>
                <p className="text-sm text-blue-700 mt-1">
                  Upload your STL file and our backend will automatically analyze it with PrusaSlicer to calculate accurate pricing based on filament usage and print time.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* File Upload Area */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Upload Your 3D File</h2>
                
                {!file ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                      dragActive
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-300 hover:border-primary'
                    }`}
                  >
                    <UploadIcon className="mx-auto mb-4 text-gray-400" size={48} />
                    <p className="text-lg font-medium mb-2">
                      Drag and drop your 3D file here
                    </p>
                    <p className="text-sm text-gray-500 mb-4">or</p>
                    <Button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Browse Files
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileChange}
                      accept={ALLOWED_FILE_TYPES.join(',')}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-500 mt-4">
                      Supported formats: STL, 3MF, OBJ, GCODE (Max 50MB)
                    </p>
                  </div>
                ) : (
                  <div className="border-2 border-green-300 bg-green-50 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <File className="text-green-600" size={24} />
                        </div>
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-gray-600">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={removeFile}
                        className="p-2 hover:bg-red-100 rounded-full transition-colors"
                      >
                        <X className="text-red-500" size={20} />
                      </button>
                    </div>

                    {/* Backend Pricing Display */}
                    {backendPrice !== null && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-300 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="text-green-600" size={20} />
                          <p className="font-medium text-green-900">
                            {pricingAccurate ? 'Accurate Pricing Applied' : 'Estimate Provided'}
                          </p>
                        </div>
                        {pricingAccurate && filamentGrams && printTimeSeconds && (
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Filament</p>
                              <p className="font-medium text-lg">{filamentGrams.toFixed(1)}g</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Print Time</p>
                              <p className="font-medium text-lg">
                                {Math.floor(printTimeSeconds / 3600)}h {Math.floor((printTimeSeconds % 3600) / 60)}m
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Total Price</p>
                              <p className="font-medium text-lg text-green-700">₹{backendPrice}</p>
                            </div>
                          </div>
                        )}
                        {!pricingAccurate && (
                          <p className="text-sm text-gray-600 mt-2">
                            Estimated price: ₹{backendPrice}
                          </p>
                        )}
                      </div>
                    )}

                    {uploadProgress > 0 && (
                      <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Uploading... {uploadProgress}%
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {errors.file && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="text-red-500" size={20} />
                    <p className="text-sm text-red-700">{errors.file}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Design Details */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Design Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Design Name *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Custom Phone Stand"
                      error={errors.name}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Any special instructions or notes..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Quantity *</label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Print Settings */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Print Settings</h2>
                
                <div className="space-y-6">
                  {/* Material */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Package size={18} className="text-primary" />
                      <label className="text-sm font-medium">Material</label>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {materials.map((material) => (
                        <div
                          key={material.id}
                          className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                            formData.material === material.id
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-300 hover:border-primary'
                          }`}
                          onClick={() => setFormData({ ...formData, material: material.id })}
                        >
                          <p className="font-medium">{material.name}</p>
                          <p className="text-xs text-gray-600">{material.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Palette size={18} className="text-primary" />
                      <label className="text-sm font-medium">Color</label>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {colors.map((color) => (
                        <div
                          key={color.id}
                          className={`cursor-pointer transition-all ${
                            formData.color === color.id ? 'scale-110' : 'hover:scale-105'
                          }`}
                          onClick={() => setFormData({ ...formData, color: color.id })}
                        >
                          <div
                            className={`w-12 h-12 rounded-lg border-2 ${
                              formData.color === color.id ? 'border-primary' : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: color.hex }}
                          />
                          <p className="text-xs text-center mt-1">{color.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Advanced Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Infill Percentage
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="10"
                          value={formData.infillPercentage}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            infillPercentage: parseInt(e.target.value) 
                          })}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium w-12">
                          {formData.infillPercentage}%
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Layer Height (mm)
                      </label>
                      <select
                        value={formData.layerHeight}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          layerHeight: parseFloat(e.target.value) 
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value={0.1}>0.1mm (High Quality)</option>
                        <option value={0.2}>0.2mm (Standard)</option>
                        <option value={0.3}>0.3mm (Fast)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Price Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Price Summary</h2>
                
                {backendPrice !== null ? (
                  <>
                    <div className="border-t border-b py-4 mb-6">
                      <div className="flex justify-between text-xl font-bold">
                        <span>Total:</span>
                        <span className="text-primary">₹{backendPrice}</span>
                      </div>
                      {pricingAccurate ? (
                        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <CheckCircle className="inline" size={12} /> 
                          Accurate pricing from STL analysis
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                          <Info className="inline" size={12} /> 
                          Estimated price (final quote after review)
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    <Info size={32} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">Upload and submit to get pricing</p>
                  </div>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={!file || isUploading}
                  className="w-full"
                >
                  {isUploading ? 'Uploading...' : 'Submit Print Request'}
                </Button>

                {errors.submit && (
                  <p className="text-red-500 text-sm mt-3">{errors.submit}</p>
                )}

                <div className="mt-6 space-y-2 text-xs text-gray-600">
                  <p className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-500" />
                    {file?.name.toLowerCase().endsWith('.stl') 
                      ? 'Automatic STL analysis with PrusaSlicer'
                      : 'File analyzed within 24 hours'}
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-500" />
                    Accurate pricing calculation
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-500" />
                    Professional quality printing
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
