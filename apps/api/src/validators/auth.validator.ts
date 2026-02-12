import { z } from 'zod';

/**
 * Password validation schema
 * Requirements (2026 standards):
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[^A-Za-z0-9]/,
    'Password must contain at least one special character'
  );

/**
 * Email validation schema
 */
const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(255, 'Email must not exceed 255 characters')
  .toLowerCase()
  .trim();

/**
 * Register schema
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z
    .string()
    .min(1, 'Name must not be empty')
    .max(100, 'Name must not exceed 100 characters')
    .trim()
    .optional(),
});

/**
 * Login schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password must not exceed 128 characters'),
});

/**
 * Validate register input
 */
export function validateRegister(data: unknown) {
  const result = registerSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((err: { message: string }) => err.message).join(', ');
    throw new Error(`Validation failed: ${errors}`);
  }

  return result.data;
}

/**
 * Validate login input
 */
export function validateLogin(data: unknown) {
  const result = loginSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((err: { message: string }) => err.message).join(', ');
    throw new Error(`Validation failed: ${errors}`);
  }

  return result.data;
}

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
