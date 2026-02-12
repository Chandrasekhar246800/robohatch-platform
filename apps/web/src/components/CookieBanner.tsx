'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie, Settings, X } from 'lucide-react';
import {
  hasGivenConsent,
  acceptAllCookies,
  rejectNonEssentialCookies,
} from '@/lib/cookieConsent';
import { CookiePreferencesModal } from './CookiePreferencesModal';

export const CookieBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if user has already given consent
  useEffect(() => {
    if (mounted) {
      const hasConsent = hasGivenConsent();
      setIsVisible(!hasConsent);
    }
  }, [mounted]);

  const handleAcceptAll = () => {
    acceptAllCookies();
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    rejectNonEssentialCookies();
    setIsVisible(false);
  };

  const handleManagePreferences = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    // Check if consent was given in modal
    if (hasGivenConsent()) {
      setIsVisible(false);
    }
  };

  const handleModalSave = () => {
    setIsVisible(false);
  };

  // Don't render anything on server or if already consented
  if (!mounted || !isVisible) {
    return null;
  }

  return (
    <>
      {/* Cookie Banner */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 animate-slideUp"
        role="dialog"
        aria-label="Cookie consent banner"
        aria-live="polite"
      >
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
              {/* Icon & Text */}
              <div className="flex items-start gap-3 flex-1">
                <Cookie className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    We Value Your Privacy
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    We use cookies to enhance your browsing experience, analyze site traffic, and
                    personalize content. By clicking "Accept All", you consent to our use of
                    cookies.{' '}
                    <Link
                      href="/privacy"
                      className="text-primary hover:text-accent underline font-medium transition-colors"
                    >
                      Learn more
                    </Link>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                <button
                  onClick={handleManagePreferences}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
                  aria-label="Manage cookie preferences"
                >
                  <Settings className="w-4 h-4" />
                  <span>Manage Preferences</span>
                </button>
                <button
                  onClick={handleRejectAll}
                  className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
                  aria-label="Reject non-essential cookies"
                >
                  Reject All
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-6 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-accent transition-colors shadow-md whitespace-nowrap"
                  aria-label="Accept all cookies"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Modal */}
      <CookiePreferencesModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
      />
    </>
  );
};
