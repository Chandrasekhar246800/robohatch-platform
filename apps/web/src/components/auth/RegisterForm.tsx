'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, CheckCircle, AlertCircle } from 'lucide-react';
import { AnimatedInput } from '@/components/ui/AnimatedInput';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { apiClient } from '@/lib/api-client';

export const RegisterForm: React.FC = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [apiError, setApiError] = useState('');

  const passwordChecks = [
    {
      label: '1 uppercase letter',
      met: /[A-Z]/.test(formData.password),
    },
    {
      label: '1 lowercase letter',
      met: /[a-z]/.test(formData.password),
    },
    {
      label: '1 number',
      met: /\d/.test(formData.password),
    },
    {
      label: '1 special character',
      met: /[^a-zA-Z\d]/.test(formData.password),
    },
    {
      label: 'minimum 8 characters',
      met: formData.password.length >= 8,
    },
  ];

  const getPasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/\d/)) strength++;
    if (password.match(/[^a-zA-Z\d]/)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setApiError('');

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.fullName) newErrors.fullName = 'Full name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password.length < 8)
      newErrors.password = 'Password must be at least 8 characters';
    if (!formData.password.match(/[A-Z]/))
      newErrors.password = 'Password must contain at least one uppercase letter';
    if (!formData.password.match(/[a-z]/))
      newErrors.password = 'Password must contain at least one lowercase letter';
    if (!formData.password.match(/\d/))
      newErrors.password = 'Password must contain at least one number';
    if (!formData.password.match(/[^a-zA-Z\d]/))
      newErrors.password = 'Password must contain at least one special character';
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';
    if (!acceptTerms) newErrors.terms = 'You must accept the terms';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.register({
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
      });

      if (response.success && response.data) {
        // Success! Redirect to homepage
        router.push('/');
      } else {
        // Show error message from API
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
        staggerChildren: 0.08,
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

  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];

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
            <h1 className="text-3xl font-bold mb-2">Create Account</h1>
            <p className="text-secondary-peach">Join ROBOHATCH today</p>
          </motion.div>
        </div>

        {/* Form */}
        <motion.form
          variants={formVariants}
          initial="hidden"
          animate="visible"
          onSubmit={handleSubmit}
          className="p-8 space-y-5"
        >
          <motion.div variants={itemVariants}>
            <AnimatedInput
              label="Full Name"
              type="text"
              placeholder="John Doe"
              icon={<User size={20} />}
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              error={errors.fullName}
            />
          </motion.div>

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

            {/* Password Strength Indicator */}
            <AnimatePresence>
              {formData.password && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2"
                >
                  <div className="flex gap-1 mb-1">
                    {[...Array(4)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: i < passwordStrength ? 1 : 0 }}
                        transition={{ duration: 0.3, delay: i * 0.1 }}
                        className={`h-1 flex-1 rounded-full ${
                          i < passwordStrength
                            ? strengthColors[passwordStrength - 1]
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-600">
                    Strength:{' '}
                    <span
                      className={
                        passwordStrength > 0
                          ? strengthColors[passwordStrength - 1].replace(
                              'bg-',
                              'text-'
                            )
                          : ''
                      }
                    >
                      {passwordStrength > 0 ? strengthLabels[passwordStrength - 1] : 'None'}
                    </span>
                  </p>
                  <ul className="mt-2 space-y-2 text-xs text-gray-500">
                    {passwordChecks.map(({ label, met }) => (
                      <li key={label} className="flex items-center gap-2">
                        {met ? (
                          <CheckCircle size={14} className="text-green-500 shrink-0" />
                        ) : (
                          <span className="inline-block h-3.5 w-3.5 rounded-full border border-gray-300 shrink-0" />
                        )}
                        <span className={met ? 'text-gray-700' : ''}>{label}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div variants={itemVariants}>
            <AnimatedInput
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock size={20} />}
              showPasswordToggle
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              error={errors.confirmPassword}
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

          <motion.div variants={itemVariants}>
            <label className="flex items-start space-x-2 cursor-pointer group">
              <motion.div
                className="relative w-5 h-5 mt-0.5 border-2 border-gray-300 rounded group-hover:border-primary transition-colors flex-shrink-0"
                whileTap={{ scale: 0.9 }}
              >
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="opacity-0 absolute inset-0 cursor-pointer"
                />
                <AnimatePresence>
                  {acceptTerms && (
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
              <span className="text-sm text-gray-600">
                I agree to the{' '}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </span>
            </label>
            {errors.terms && (
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="mt-1 text-sm text-red-600 flex items-center"
              >
                <AlertCircle size={14} className="mr-1" />
                {errors.terms}
              </motion.p>
            )}
          </motion.div>

          <motion.div variants={itemVariants}>
            <AnimatedButton
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </AnimatedButton>
          </motion.div>

          <motion.div variants={itemVariants} className="text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-primary font-semibold hover:text-accent transition-colors"
              >
                Login
              </Link>
            </p>
          </motion.div>
        </motion.form>
      </div>
    </motion.div>
  );
};
