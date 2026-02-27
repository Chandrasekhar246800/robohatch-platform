'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { AnimatedInput } from '@/components/ui/AnimatedInput';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, setHasHydrated } = useAuthStore((state) => ({ 
    setAuth: state.setAuth, 
    setHasHydrated: state.setHasHydrated 
  }));
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setApiError('');

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      console.log('[Login] Attempting login for:', formData.email);
      const response = await apiClient.login({
        email: formData.email,
        password: formData.password,
      });

      console.log('[Login] Response:', { 
        success: response.success, 
        hasData: !!response.data,
        hasUser: !!response.data?.user 
      });

      if (response.success && response.data) {
        // Store user data in Zustand store (token is in httpOnly cookie, not response)
        setAuth(response.data.user, '');
        
        // Immediately mark as hydrated since we just set state manually (not from localStorage)
        setHasHydrated(true);
        
        // Set isLoggedIn cookie so middleware can see it (expires in 7 days)
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);
        document.cookie = `isLoggedIn=true; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax`;
        
        console.log('[Login] User role:', response.data.user.role);
        
        // Longer delay to ensure:
        // 1. Cookie is set by browser
        // 2. Zustand persists state to localStorage
        // 3. Next page can read the persisted state
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Redirect based on user role
        if (response.data.user.role === 'ADMIN') {
          console.log('[Login] Admin user - redirecting to /admin');
          router.push('/admin');
        } else {
          // Regular users go to redirect URL or homepage
          const redirectUrl = searchParams.get('redirect') || '/';
          console.log('[Login] Regular user - redirecting to:', redirectUrl);
          router.push(redirectUrl);
        }
      } else {
        // Show error message from API
        console.error('[Login] Login failed:', response.message);
        setApiError(response.message);
      }
    } catch (error) {
      setApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: [0.6, 0.05, 0.01, 0.9],
      },
    },
  };

  const formVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.4 },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-md"
    >
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-accent p-8 text-white">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-secondary-peach">Login to your ROBOHATCH account</p>
          </motion.div>
        </div>

        {/* Form */}
        <motion.form
          variants={formVariants}
          initial="hidden"
          animate="visible"
          onSubmit={handleSubmit}
          className="p-8 space-y-6"
        >
          <motion.div variants={itemVariants}>
            <AnimatedInput
              label="Email Address"
              type="email"
              placeholder="your@email.com"
              icon={<Mail size={20} />}
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              error={errors.email}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <AnimatedInput
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock size={20} />}
              showPasswordToggle
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              error={errors.password}
            />
          </motion.div>

          {/* API Error Message */}
          <AnimatePresence>
            {apiError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <AlertCircle className="text-red-500" size={20} />
                <p className="text-sm text-red-700">{apiError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            variants={itemVariants}
            className="flex items-center justify-between"
          >
            <label className="flex items-center space-x-2 cursor-pointer group">
              <motion.div
                className="relative w-5 h-5 border-2 border-gray-300 rounded group-hover:border-primary transition-colors"
                whileTap={{ scale: 0.9 }}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="opacity-0 absolute inset-0 cursor-pointer"
                />
                <AnimatePresence>
                  {rememberMe && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <CheckCircle className="text-primary" size={20} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              <span className="text-sm text-gray-600">Remember me</span>
            </label>

            <Link href="/forgot-password" className="text-sm text-primary hover:text-primary-dark transition-colors">
              Forgot password?
            </Link>
          </motion.div>

          <motion.div variants={itemVariants}>
            <AnimatedButton
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </AnimatedButton>
          </motion.div>

          <motion.div variants={itemVariants} className="text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link
                href="/register"
                className="text-primary font-semibold hover:text-accent transition-colors"
              >
                Register
              </Link>
            </p>
          </motion.div>
        </motion.form>
      </div>
    </motion.div>
  );
};
