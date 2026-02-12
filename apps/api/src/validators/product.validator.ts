import { z } from 'zod';

/**
 * Product validation schema
 */
export const createProductSchema = z.object({
  name: z
    .string()
    .min(3, 'Product name must be at least 3 characters')
    .max(200, 'Product name must not exceed 200 characters')
    .trim(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must not exceed 5000 characters')
    .trim(),
  price: z
    .number()
    .positive('Price must be positive')
    .max(1000000, 'Price must not exceed 1,000,000'),
  stock: z
    .number()
    .int('Stock must be an integer')
    .min(0, 'Stock cannot be negative')
    .max(100000, 'Stock must not exceed 100,000')
    .default(0),
  categoryIds: z
    .array(z.string().uuid('Invalid category ID'))
    .min(1, 'At least one category is required')
    .max(10, 'Maximum 10 categories allowed'),
  images: z
    .array(z.object({
      url: z.string().url('Invalid image URL'),
      alt: z.string().max(255, 'Alt text must not exceed 255 characters').optional(),
    }))
    .min(1, 'At least one image is required')
    .max(10, 'Maximum 10 images allowed'),
});

/**
 * Custom design upload schema
 */
export const customDesignUploadSchema = z.object({
  name: z
    .string()
    .min(3, 'Design name must be at least 3 characters')
    .max(200, 'Design name must not exceed 200 characters')
    .trim(),
  description: z
    .string()
    .max(2000, 'Description must not exceed 2000 characters')
    .trim()
    .optional()
    .nullable(),
  material: z
    .string()
    .max(100, 'Material must not exceed 100 characters')
    .trim()
    .optional()
    .nullable(),
  color: z
    .string()
    .max(50, 'Color must not exceed 50 characters')
    .trim()
    .optional()
    .nullable(),
  size: z
    .string()
    .max(50, 'Size must not exceed 50 characters')
    .trim()
    .optional()
    .nullable(),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(1000, 'Quantity must not exceed 1000')
    .default(1),
});

/**
 * Validate product creation
 */
export function validateCreateProduct(data: unknown) {
  const result = createProductSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
    throw new Error(`Validation failed: ${errors}`);
  }

  return result.data;
}

/**
 * Validate custom design upload
 */
export function validateCustomDesignUpload(data: unknown) {
  const result = customDesignUploadSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
    throw new Error(`Validation failed: ${errors}`);
  }

  return result.data;
}

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CustomDesignUploadInput = z.infer<typeof customDesignUploadSchema>;
