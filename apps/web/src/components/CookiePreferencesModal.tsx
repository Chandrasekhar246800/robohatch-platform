'use client';

import { useState, useEffect } from 'react';
import { X, Shield, BarChart3, Target, Info } from 'lucide-react';
import { setCookieConsent, getCookieConsent } from '@/lib/cookieConsent';
import type { CookieConsent } from '@/lib/cookieConsent';

interface CookiePreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export const CookiePreferencesModal: React.FC<CookiePreferencesModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load existing preferences when modal opens
  useEffect(() => {
    if (isOpen && mounted) {
      const existing = getCookieConsent();
      if (existing) {
        setPreferences({
          necessary: existing.necessary,
          analytics: existing.analytics,
          marketing: existing.marketing,
        });
      }
    }
  }, [isOpen, mounted]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSave = () => {
    setCookieConsent(preferences);
    onSave?.();
    onClose();
  };

  const togglePreference = (key: 'analytics' | 'marketing') => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!mounted || !isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[101] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-preferences-title"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2
              id="cookie-preferences-title"
              className="text-2xl font-bold text-gray-900 dark:text-white"
            >
              Cookie Preferences
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Introduction */}
            <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-gray-700 dark:text-gray-300">
                  We use cookies to enhance your browsing experience, analyze site traffic, and
                  personalize content. You can customize your preferences below.
                </p>
              </div>
            </div>

            {/* Necessary Cookies */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <Shield className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Necessary Cookies
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Essential for the website to function properly. These cookies enable core
                      functionality such as security, authentication, and shopping cart operations.
                      They cannot be disabled.
                    </p>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      Examples: Session management, security tokens, authentication
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="relative inline-block w-12 h-6 bg-green-600 rounded-full cursor-not-allowed opacity-60">
                    <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm"></div>
                  </div>
                  <div className="text-xs text-center text-gray-500 dark:text-gray-500 mt-1">
                    Always On
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics Cookies */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Analytics Cookies
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Help us understand how visitors interact with our website by collecting and
                      reporting information anonymously. This helps us improve our services.
                    </p>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      Examples: Google Analytics, page views, user behavior tracking
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <button
                    onClick={() => togglePreference('analytics')}
                    className={`relative inline-block w-12 h-6 rounded-full transition-colors ${
                      preferences.analytics ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    role="switch"
                    aria-checked={preferences.analytics}
                    aria-label="Toggle analytics cookies"
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                        preferences.analytics ? 'right-0.5' : 'left-0.5'
                      }`}
                    ></div>
                  </button>
                  <div className="text-xs text-center text-gray-500 dark:text-gray-500 mt-1">
                    {preferences.analytics ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
              </div>
            </div>

            {/* Marketing Cookies */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <Target className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Marketing Cookies
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Used to track visitors across websites to display relevant advertisements and
                      measure the effectiveness of marketing campaigns.
                    </p>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      Examples: Facebook Pixel, Google Ads, remarketing tags
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <button
                    onClick={() => togglePreference('marketing')}
                    className={`relative inline-block w-12 h-6 rounded-full transition-colors ${
                      preferences.marketing ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    role="switch"
                    aria-checked={preferences.marketing}
                    aria-label="Toggle marketing cookies"
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                        preferences.marketing ? 'right-0.5' : 'left-0.5'
                      }`}
                    ></div>
                  </button>
                  <div className="text-xs text-center text-gray-500 dark:text-gray-500 mt-1">
                    {preferences.marketing ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Policy Link */}
            <div className="text-center">
              <a
                href="/privacy"
                className="text-sm text-primary hover:text-accent underline transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                View our Privacy Policy
              </a>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-accent transition-colors shadow-md"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
