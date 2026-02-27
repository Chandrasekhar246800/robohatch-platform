'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Palette, 
  Ruler, 
  Package, 
  Upload,
  ChevronRight,
  Info,
  CheckCircle
} from 'lucide-react';
import { Button, Input, Card, CardContent } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';

const materials = [
  { id: 'pla', name: 'PLA', description: 'Standard, eco-friendly', price: 0 },
  { id: 'abs', name: 'ABS', description: 'Durable, heat-resistant', price: 50 },
  { id: 'petg', name: 'PETG', description: 'Strong, flexible', price: 75 },
  { id: 'tpu', name: 'TPU', description: 'Flexible, rubber-like', price: 100 },
  { id: 'wood-pla', name: 'Wood PLA', description: 'Wood-infused filament', price: 125 },
  { id: 'resin', name: 'Resin', description: 'High detail, smooth finish', price: 150 },
];

const colors = [
  { id: 'white', name: 'White', hex: '#FFFFFF' },
  { id: 'black', name: 'Black', hex: '#000000' },
  { id: 'red', name: 'Red', hex: '#EF4444' },
  { id: 'blue', name: 'Blue', hex: '#3B82F6' },
  { id: 'green', name: 'Green', hex: '#10B981' },
  { id: 'yellow', name: 'Yellow', hex: '#F59E0B' },
  { id: 'orange', name: 'Orange', hex: '#F97316' },
  { id: 'purple', name: 'Purple', hex: '#A855F7' },
  { id: 'pink', name: 'Pink', hex: '#EC4899' },
  { id: 'gray', name: 'Gray', hex: '#6B7280' },
  { id: 'natural', name: 'Natural', hex: '#D4A574' },
];

const sizes = [
  { id: 'small', name: 'Small', dimensions: '5x5x5 cm', price: 0 },
  { id: 'medium', name: 'Medium', dimensions: '10x10x10 cm', price: 50 },
  { id: 'large', name: 'Large', dimensions: '15x15x15 cm', price: 100 },
  { id: 'xlarge', name: 'Extra Large', dimensions: '20x20x20 cm', price: 200 },
  { id: 'custom', name: 'Custom Size', dimensions: 'Specify dimensions', price: 0 },
];

const categories = [
  { id: 'keychains-custom', name: 'Keychains', icon: '🔑' },
  { id: 'logo-keychains', name: 'Logo Keychains', icon: '🏢' },
  { id: 'moon-lamps', name: 'Moon Lamps', icon: '🌙' },
  { id: 'photo-frames', name: 'Photo Frames', icon: '🖼️' },
  { id: 'self-miniatures', name: 'Self Miniatures', icon: '🧍' },
];

export default function CustomDesignPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    category: '',
    name: '',
    description: '',
    material: 'pla',
    color: 'white',
    size: 'medium',
    customDimensions: '',
    quantity: 1,
    file: null as File | null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/custom-design');
    }
  }, [isAuthenticated, router]);

  const calculatePrice = () => {
    const materialPrice = materials.find(m => m.id === formData.material)?.price || 0;
    const sizePrice = sizes.find(s => s.id === formData.size)?.price || 0;
    const basePrice = 200;
    return (basePrice + materialPrice + sizePrice) * formData.quantity;
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    if (step === 1 && !formData.category) {
      newErrors.category = 'Please select a category';
    }

    if (step === 2) {
      if (!formData.name.trim()) {
        newErrors.name = 'Design name is required';
      }
      if (formData.quantity < 1) {
        newErrors.quantity = 'Quantity must be at least 1';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      // Prepare the request data
      const requestData = {
        name: formData.name,
        description: formData.description,
        material: formData.material,
        color: formData.color,
        size: formData.size === 'custom' ? formData.customDimensions : sizes.find(s => s.id === formData.size)?.dimensions,
        quantity: formData.quantity,
        fileUrl: formData.file ? formData.file.name : undefined, // TODO: Implement S3 upload
        category: formData.category,
      };

      const response = await fetch(`${apiUrl}/api/custom-designs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success - redirect to orders page
        router.push('/orders?new=custom-design');
      } else {
        throw new Error(data.message || 'Failed to submit custom design');
      }
    } catch (error) {
      console.error('Failed to submit design:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to submit custom design. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((num) => (
        <React.Fragment key={num}>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
            step >= num ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            {step > num ? <CheckCircle size={20} /> : num}
          </div>
          {num < 4 && (
            <div className={`w-16 h-1 ${step > num ? 'bg-primary' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-2xl font-bold mb-6">Select Category</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <Card
            key={cat.id}
            className={`cursor-pointer transition-all ${
              formData.category === cat.id
                ? 'ring-2 ring-primary bg-primary/5'
                : 'hover:shadow-lg'
            }`}
            onClick={() => setFormData({ ...formData, category: cat.id })}
          >
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-3">{cat.icon}</div>
              <h3 className="font-semibold">{cat.name}</h3>
            </CardContent>
          </Card>
        ))}
      </div>
      {errors.category && (
        <p className="text-red-500 text-sm mt-2">{errors.category}</p>
      )}
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-2xl font-bold mb-6">Design Details</h2>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Design Name *</label>
          <Input
            value={formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., My Custom Keychain"
            error={errors.name}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe your design requirements..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            rows={4}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Quantity *</label>
          <Input
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
            error={errors.quantity}
          />
        </div>
      </div>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-2xl font-bold mb-6">Material & Color</h2>
      
      <div className="space-y-8">
        {/* Material Selection */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Package size={20} className="text-primary" />
            <label className="text-lg font-semibold">Select Material</label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map((material) => (
              <Card
                key={material.id}
                className={`cursor-pointer transition-all ${
                  formData.material === material.id
                    ? 'ring-2 ring-primary bg-primary/5'
                    : 'hover:shadow-lg'
                }`}
                onClick={() => setFormData({ ...formData, material: material.id })}
              >
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-1">{material.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{material.description}</p>
                  <p className="text-primary font-semibold">
                    {material.price > 0 ? `+₹${material.price}` : 'Base Price'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Color Selection */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Palette size={20} className="text-primary" />
            <label className="text-lg font-semibold">Select Color</label>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-3">
            {colors.map((color) => (
              <div
                key={color.id}
                className={`cursor-pointer transition-all ${
                  formData.color === color.id ? 'scale-110' : 'hover:scale-105'
                }`}
                onClick={() => setFormData({ ...formData, color: color.id })}
              >
                <div
                  className={`w-full aspect-square rounded-lg border-2 ${
                    formData.color === color.id ? 'border-primary' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color.hex }}
                />
                <p className="text-xs text-center mt-1">{color.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Size Selection */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Ruler size={20} className="text-primary" />
            <label className="text-lg font-semibold">Select Size</label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sizes.map((size) => (
              <Card
                key={size.id}
                className={`cursor-pointer transition-all ${
                  formData.size === size.id
                    ? 'ring-2 ring-primary bg-primary/5'
                    : 'hover:shadow-lg'
                }`}
                onClick={() => setFormData({ ...formData, size: size.id })}
              >
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-1">{size.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{size.dimensions}</p>
                  <p className="text-primary font-semibold">
                    {size.price > 0 ? `+₹${size.price}` : 'Included'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          {formData.size === 'custom' && (
            <div className="mt-4">
              <Input
                value={formData.customDimensions}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, customDimensions: e.target.value })}
                placeholder="e.g., 12x8x10 cm"
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  const renderStep4 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="text-2xl font-bold mb-6">Review & Submit</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Order Summary */}
        <div>
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-xl font-semibold mb-4">Order Summary</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium">
                    {categories.find(c => c.id === formData.category)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Design Name:</span>
                  <span className="font-medium">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Material:</span>
                  <span className="font-medium">
                    {materials.find(m => m.id === formData.material)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Color:</span>
                  <span className="font-medium">
                    {colors.find(c => c.id === formData.color)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Size:</span>
                  <span className="font-medium">
                    {sizes.find(s => s.id === formData.size)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-medium">{formData.quantity}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Estimated Price:</span>
                  <span className="text-primary">₹{calculatePrice()}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  <Info className="inline" size={12} /> Final price will be confirmed after review
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Notes */}
        <div>
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">Additional Information</h3>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <Info className="inline mr-2" size={16} />
                  Our team will review your design and provide a final quote within 24 hours.
                </p>
              </div>

              {formData.description && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Your Description:</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {formData.description}
                  </p>
                </div>
              )}

              <div className="space-y-2 text-sm text-gray-600">
                <p>✓ Professional 3D printing</p>
                <p>✓ Quality materials</p>
                <p>✓ Fast turnaround time</p>
                <p>✓ Satisfaction guaranteed</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Custom Design</h1>
          <p className="text-gray-600">Create your personalized 3D printed product</p>
        </div>

        {renderStepIndicator()}

        <Card className="mb-8">
          <CardContent className="p-8">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="secondary"
            onClick={handleBack}
            disabled={step === 1}
          >
            Back
          </Button>

          {step < 4 ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="ml-2" size={20} />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Design Request'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
