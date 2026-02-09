'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

interface AdminGuardProps {
  children: React.ReactNode;
}

/**
 * Guard component that redirects admin users away from customer-facing pages
 * Admin users should only access the admin panel
 */
export const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // If user is authenticated as admin, redirect to admin panel
    if (isAuthenticated && user?.role === 'ADMIN') {
      router.push('/admin');
    }
  }, [isAuthenticated, user, router]);

  // Don't render content if admin user
  if (isAuthenticated && user?.role === 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to admin panel...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
