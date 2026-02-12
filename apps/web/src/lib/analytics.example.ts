/**
 * Example: Google Analytics Integration with Cookie Consent
 * 
 * This file demonstrates how to load Google Analytics only when the user
 * has consented to analytics cookies.
 * 
 * Place this in: app/analytics.tsx or lib/analytics.ts
 */

'use client';

import { useEffect } from 'react';
import { isAnalyticsEnabled, onConsentChange } from '@/lib/cookieConsent';

// Your Google Analytics Measurement ID
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';

/**
 * Load Google Analytics script
 */
const loadGoogleAnalytics = () => {
  if (typeof window === 'undefined') return;

  // Check if already loaded
  if (window.gtag) {
    console.log('Google Analytics already loaded');
    return;
  }

  // Create script tag
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  script.async = true;
  document.head.appendChild(script);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    (window.dataLayer as any[]).push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    anonymize_ip: true, // GDPR compliance
    cookie_flags: 'SameSite=None;Secure',
  });

  console.log('✅ Google Analytics loaded');
};

/**
 * Remove Google Analytics script and cookies
 */
const removeGoogleAnalytics = () => {
  if (typeof window === 'undefined') return;

  // Remove GA cookies
  const gaCookies = ['_ga', '_gat', '_gid'];
  gaCookies.forEach((cookieName) => {
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });

  // Remove gtag from window
  delete window.gtag;
  delete window.dataLayer;

  console.log('❌ Google Analytics removed');
};

/**
 * Analytics Component
 * Add this to your root layout or a high-level component
 */
export const Analytics = () => {
  useEffect(() => {
    // Check initial consent state
    if (isAnalyticsEnabled()) {
      loadGoogleAnalytics();
    }

    // Listen for consent changes
    const unsubscribe = onConsentChange((consent) => {
      if (consent.analytics) {
        loadGoogleAnalytics();
      } else {
        removeGoogleAnalytics();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return null;
};

/**
 * Usage in layout.tsx:
 * 
 * import { Analytics } from '@/lib/analytics';
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <CookieBanner />
 *         <Analytics />
 *       </body>
 *     </html>
 *   );
 * }
 */

/**
 * Track custom events
 */
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  if (!isAnalyticsEnabled()) {
    console.log('Analytics disabled, event not tracked:', eventName);
    return;
  }

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
    console.log('Tracked event:', eventName, eventParams);
  }
};

/**
 * Track page views
 */
export const trackPageView = (url: string) => {
  if (!isAnalyticsEnabled()) {
    console.log('Analytics disabled, page view not tracked:', url);
    return;
  }

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    });
    console.log('Tracked page view:', url);
  }
};

/**
 * Example: Track eCommerce events
 */
export const trackPurchase = (orderId: string, total: number, currency = 'INR') => {
  if (!isAnalyticsEnabled()) return;

  trackEvent('purchase', {
    transaction_id: orderId,
    value: total,
    currency: currency,
  });
};

export const trackAddToCart = (productId: string, productName: string, price: number) => {
  if (!isAnalyticsEnabled()) return;

  trackEvent('add_to_cart', {
    item_id: productId,
    item_name: productName,
    price: price,
  });
};

/**
 * Type declarations for gtag (add to types/global.d.ts)
 */
declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'js',
      targetId: string | Date,
      config?: Record<string, any>
    ) => void;
    dataLayer?: any[];
  }
}

export {};
