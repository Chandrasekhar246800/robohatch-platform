"use client";

import { isAnalyticsEnabled, onConsentChange } from "@/lib/cookieConsent";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";
const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? "";

declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date,
      config?: Record<string, any>
    ) => void;
    dataLayer?: any[];
    clarity?: (...args: any[]) => void;
  }
}

const isBrowser = () => typeof window !== 'undefined';

const ensureGtag = () => {
  if (!isBrowser() || !GA_MEASUREMENT_ID || window.gtag) {
    return;
  }

  const existing = document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`);
  if (existing) {
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    (window.dataLayer as any[]).push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    cookie_flags: 'SameSite=Lax;Secure',
  });
};

const removeGtag = () => {
  if (!isBrowser()) return;

  document
    .querySelectorAll(`script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`)
    .forEach((node) => node.remove());

  delete window.gtag;
  delete window.dataLayer;

  ['_ga', '_gid', '_gat'].forEach((cookieName) => {
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });
};

const ensureClarity = () => {
  if (!isBrowser() || !CLARITY_PROJECT_ID) {
    return;
  }

  if (document.querySelector(`script[data-clarity="${CLARITY_PROJECT_ID}"]`)) {
    return;
  }

  const script = document.createElement('script');
  script.dataset.clarity = CLARITY_PROJECT_ID;
  script.innerHTML = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");`;
  document.head.appendChild(script);
};

const removeClarity = () => {
  if (!isBrowser()) return;

  document.querySelectorAll('script[data-clarity]').forEach((node) => node.remove());
  delete window.clarity;
};

export const initializeAnalytics = () => {
  if (!isBrowser()) return;

  if (isAnalyticsEnabled()) {
    ensureGtag();
    ensureClarity();
  }

  onConsentChange((consent) => {
    if (consent.analytics) {
      ensureGtag();
      ensureClarity();
    } else {
      removeGtag();
      removeClarity();
    }
  });
};

export const trackEvent = (eventName: string, eventParams: Record<string, any> = {}) => {
  if (!isBrowser() || !isAnalyticsEnabled() || !window.gtag) {
    return;
  }

  window.gtag('event', eventName, eventParams);
};

export const trackPageView = (url: string) => {
  if (!isBrowser() || !isAnalyticsEnabled() || !window.gtag || !GA_MEASUREMENT_ID) {
    return;
  }

  window.gtag('config', GA_MEASUREMENT_ID, { page_path: url });
};

export const trackHeroCta = (ctaName: string) => {
  trackEvent('hero_cta_click', { cta_name: ctaName });
};

export const trackUploadDesignCta = (source: string) => {
  trackEvent('upload_design_cta_click', { source });
};

export const trackWhatsAppClick = (location: string) => {
  trackEvent('whatsapp_click', { location });
};

export const trackAddToCart = (productId: string, productName: string, price: number) => {
  trackEvent('add_to_cart', {
    item_id: productId,
    item_name: productName,
    price,
    currency: 'INR',
  });
};

export const trackCheckoutStart = (value: number, itemCount: number) => {
  trackEvent('begin_checkout', {
    value,
    currency: 'INR',
    items: itemCount,
  });
};

export const trackPurchase = (orderId: string, total: number) => {
  trackEvent('purchase', {
    transaction_id: orderId,
    value: total,
    currency: 'INR',
  });
};
