import { z } from 'zod';

/**
 * Shipping address validation schema
 */
export const shippingAddressSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .max(100, 'Full name must not exceed 100 characters')
    .trim(),
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters')
    .toLowerCase()
    .trim(),
  phone: z
    .string()
    .regex(/^[+]?[\d\s()-]{10,20}$/, 'Invalid phone number format')
    .trim(),
  addressLine1: z
    .string()
    .min(5, 'Address line 1 must be at least 5 characters')
    .max(255, 'Address line 1 must not exceed 255 characters')
    .trim(),
  addressLine2: z
    .string()
    .max(255, 'Address line 2 must not exceed 255 characters')
    .trim()
    .optional()
    .nullable(),
  city: z
    .string()
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City must not exceed 100 characters')
    .trim(),
  state: z
    .string()
    .min(2, 'State must be at least 2 characters')
    .max(100, 'State must not exceed 100 characters')
    .trim(),
  postalCode: z
    .string()
    .regex(/^[0-9]{6}$/, 'Invalid postal code (must be 6 digits)')
    .trim(),
  country: z
    .string()
    .min(2, 'Country must be at least 2 characters')
    .max(100, 'Country must not exceed 100 characters')
    .trim()
    .default('India'),
});

/**
 * Payment verification schema
 */
export const paymentVerificationSchema = z.object({
  razorpay_order_id: z
    .string()
    .min(1, 'Razorpay order ID is required')
    .max(255, 'Invalid razorpay order ID'),
  razorpay_payment_id: z
    .string()
    .min(1, 'Razorpay payment ID is required')
    .max(255, 'Invalid razorpay payment ID'),
  razorpay_signature: z
    .string()
    .min(1, 'Razorpay signature is required')
    .max(512, 'Invalid razorpay signature'),
});

/**
 * Order creation schema
 */
export const createOrderSchema = z.object({
  shippingAddress: shippingAddressSchema,
});

/**
 * Validate shipping address
 */
export function validateShippingAddress(data: unknown) {
  const result = shippingAddressSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
    throw new Error(`Validation failed: ${errors}`);
  }

  return result.data;
}

/**
 * Validate payment verification data
 */
export function validatePaymentVerification(data: unknown) {
  const result = paymentVerificationSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
    throw new Error(`Validation failed: ${errors}`);
  }

  return result.data;
}

/**
 * Validate order creation data
 */
export function validateCreateOrder(data: unknown) {
  const result = createOrderSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
    throw new Error(`Validation failed: ${errors}`);
  }

  return result.data;
}

export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>;
export type PaymentVerificationInput = z.infer<typeof paymentVerificationSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
