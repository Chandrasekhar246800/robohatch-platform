/**
 * Cookie Consent Management Utility
 * Handles storage and retrieval of user cookie preferences
 */

export interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const CONSENT_KEY = 'robohatch-cookie-consent';
const CONSENT_VERSION = '1.0';

/**
 * Default consent state - only necessary cookies enabled
 */
const DEFAULT_CONSENT: CookieConsent = {
  necessary: true,
  analytics: false,
  marketing: false,
  timestamp: new Date().toISOString(),
};

/**
 * Check if code is running in browser environment
 */
const isBrowser = (): boolean => {
  return typeof window !== 'undefined';
};

/**
 * Get current cookie consent preferences
 * Returns null if no consent has been given yet
 */
export const getCookieConsent = (): CookieConsent | null => {
  if (!isBrowser()) return null;

  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return null;

    const consent = JSON.parse(stored) as CookieConsent;
    
    // Validate consent object structure
    if (
      typeof consent.necessary !== 'boolean' ||
      typeof consent.analytics !== 'boolean' ||
      typeof consent.marketing !== 'boolean'
    ) {
      return null;
    }

    return consent;
  } catch (error) {
    console.error('Failed to retrieve cookie consent:', error);
    return null;
  }
};

/**
 * Save cookie consent preferences
 */
export const setCookieConsent = (consent: Omit<CookieConsent, 'timestamp'>): void => {
  if (!isBrowser()) return;

  try {
    const consentWithTimestamp: CookieConsent = {
      ...consent,
      timestamp: new Date().toISOString(),
    };

    localStorage.setItem(CONSENT_KEY, JSON.stringify(consentWithTimestamp));
    
    // Also set a simple cookie flag for server-side checks if needed
    document.cookie = `consent-given=true; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    
    // Trigger custom event for other parts of app to react
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: consentWithTimestamp }));
  } catch (error) {
    console.error('Failed to save cookie consent:', error);
  }
};

/**
 * Accept all cookies
 */
export const acceptAllCookies = (): void => {
  setCookieConsent({
    necessary: true,
    analytics: true,
    marketing: true,
  });
};

/**
 * Reject non-essential cookies
 */
export const rejectNonEssentialCookies = (): void => {
  setCookieConsent({
    necessary: true,
    analytics: false,
    marketing: false,
  });
};

/**
 * Clear all consent data (for testing or reset)
 */
export const clearCookieConsent = (): void => {
  if (!isBrowser()) return;

  try {
    localStorage.removeItem(CONSENT_KEY);
    document.cookie = 'consent-given=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.dispatchEvent(new CustomEvent('cookieConsentCleared'));
  } catch (error) {
    console.error('Failed to clear cookie consent:', error);
  }
};

/**
 * Check if user has given consent (any decision made)
 */
export const hasGivenConsent = (): boolean => {
  return getCookieConsent() !== null;
};

/**
 * Check if analytics cookies are enabled
 * Use this before loading Google Analytics or similar tracking
 */
export const isAnalyticsEnabled = (): boolean => {
  const consent = getCookieConsent();
  return consent?.analytics ?? false;
};

/**
 * Check if marketing cookies are enabled
 * Use this before loading Facebook Pixel, ad networks, etc.
 */
export const isMarketingEnabled = (): boolean => {
  const consent = getCookieConsent();
  return consent?.marketing ?? false;
};

/**
 * Check if necessary cookies are enabled (always true)
 */
export const isNecessaryEnabled = (): boolean => {
  return true; // Necessary cookies are always enabled
};

/**
 * Get consent version for tracking changes over time
 */
export const getConsentVersion = (): string => {
  return CONSENT_VERSION;
};

/**
 * Hook for React components to listen to consent changes
 */
export const onConsentChange = (callback: (consent: CookieConsent) => void): (() => void) => {
  if (!isBrowser()) return () => {};

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<CookieConsent>;
    callback(customEvent.detail);
  };

  window.addEventListener('cookieConsentUpdated', handler);

  // Return cleanup function
  return () => {
    window.removeEventListener('cookieConsentUpdated', handler);
  };
};
