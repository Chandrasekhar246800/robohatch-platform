import { useAuthStore } from '@/store/auth.store';
import {
  clearCsrfTokenMemory,
  getCsrfTokenMemory,
  setCsrfTokenMemory,
} from '@/lib/csrf-token';

// Custom error class for authentication failures
export class AuthenticationError extends Error {
  refreshAttempted: boolean;

  constructor(message: string, refreshAttempted = false) {
    super(message);
    this.name = 'AuthenticationError';
    this.refreshAttempted = refreshAttempted;
  }
}

// Custom error class for network failures
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

// Ensure API_URL is an absolute URL
const getApiUrl = () => {
  const backendUrl = process.env.API_BACKEND_URL?.trim();
  const publicUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();

    // In production, always use same-origin requests so auth cookies remain first-party.
    // This avoids cross-site cookie issues when the public API URL points at Railway.
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return '';
    }

    return (backendUrl || publicUrl || 'http://localhost:5000').replace(/\/$/, '');
  }

  if (backendUrl) {
    return backendUrl.replace(/\/$/, '');
  }

  // If no URL is set, use localhost for development
  if (!publicUrl) {
    console.warn('⚠️  API_BACKEND_URL/NEXT_PUBLIC_API_URL not set, using localhost:5000');
    return 'http://localhost:5000';
  }
  
  // If URL doesn't start with http:// or https://, add https://
  if (!publicUrl.startsWith('http://') && !publicUrl.startsWith('https://')) {
    console.warn('⚠️  NEXT_PUBLIC_API_URL missing protocol, adding https://');
    return `https://${publicUrl}`;
  }
  
  // Remove trailing slash if present
  return publicUrl.replace(/\/$/, '');
};

const API_URL = getApiUrl();

// Log the API URL in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('🌐 API URL:', API_URL);
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: string;
    };
    csrfToken?: string;
  };
}

export interface ApiError {
  success: false;
  message: string;
}

class ApiClient {
  private baseUrl: string;
  private refreshPromise: Promise<AuthResponse> | null = null;
  private refreshSequence = 0;
  private csrfBootstrapPromise: Promise<string | null> | null = null;
  private csrfBootstrapSequence = 0;

  constructor() {
    this.baseUrl = API_URL;
    if (typeof window !== 'undefined') {
      console.log('[API Client] Base URL:', this.baseUrl);

      // Validate URL is absolute
      if (this.baseUrl && !this.baseUrl.startsWith('http://') && !this.baseUrl.startsWith('https://')) {
        console.error('❌ CRITICAL ERROR: API URL must be absolute (start with http:// or https://)');
        console.error('   Current value:', this.baseUrl);
        console.error('   Set NEXT_PUBLIC_API_URL in Vercel to: https://your-api.railway.app');
      }
      
      // Check if URL contains the frontend domain (common mistake)
      if (this.baseUrl.includes('vercel.app') && this.baseUrl.includes('railway.app')) {
        console.error('❌ CRITICAL ERROR: API URL contains both vercel.app and railway.app');
        console.error('   This indicates a malformed URL!');
        console.error('   Current value:', this.baseUrl);
        console.error('   Should be just: https://your-api.railway.app');
      }
    }
  }

  private getHeaders(withAuth = false): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const csrfToken = this.getCsrfToken();
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }

    // 🔒 SECURITY: Auth cookies are HttpOnly, so JavaScript never sees them.
    // CSRF is the only token we attach manually, and it stays in memory only.

    return headers;
  }

  private getMultipartHeaders(withAuth = false): HeadersInit {
    const headers: Record<string, string> = {};

    const csrfToken = this.getCsrfToken();
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }

    return headers;
  }

  private getCsrfToken(): string | null {
    return getCsrfTokenMemory();
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  private getRequestPath(url: string): string {
    try {
      return new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').pathname;
    } catch {
      return url;
    }
  }

  private isStateChangingMethod(method?: string): boolean {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes((method || 'GET').toUpperCase());
  }

  private shouldSkipCsrfForRequest(url: string): boolean {
    const path = this.getRequestPath(url);
    const excludedPaths = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh',
      '/api/auth/logout',
      '/api/auth/csrf',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/auth/verify-reset-token',
      '/api/webhook',
    ];

    return excludedPaths.some((endpoint) => path === endpoint || path.startsWith(`${endpoint}/`));
  }

  private shouldAutoRefresh(url: string): boolean {
    const path = this.getRequestPath(url);
    const excludedPaths = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh',
      '/api/auth/logout',
      '/api/auth/csrf',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/auth/verify-reset-token',
    ];

    return !excludedPaths.some((endpoint) => path === endpoint || path.startsWith(`${endpoint}/`));
  }

  private invalidateRefreshState(): void {
    this.refreshSequence += 1;
    this.refreshPromise = null;
  }

  private clearClientSessionState(): void {
    this.invalidateRefreshState();
    this.invalidateCsrfState();
    useAuthStore.getState().logout();
  }

  private invalidateCsrfState(): void {
    this.csrfBootstrapSequence += 1;
    this.csrfBootstrapPromise = null;
    clearCsrfTokenMemory();
  }

  async ensureCsrfToken(forceRefresh = false): Promise<string | null> {
    if (!this.isBrowser()) {
      return null;
    }

    const currentToken = getCsrfTokenMemory();
    if (currentToken && !forceRefresh) {
      return currentToken;
    }

    // Single-flight protection: if a bootstrap request is already running,
    // all callers await the same promise instead of creating duplicate traffic.
    if (this.csrfBootstrapPromise) {
      return this.csrfBootstrapPromise;
    }

    if (forceRefresh) {
      // The caller has already determined the current token is stale.
      // Clear the memory copy so subsequent reads do not reuse bad state.
      clearCsrfTokenMemory();
    }

    const csrfSequence = this.csrfBootstrapSequence;
    const bootstrapPromise = (async (): Promise<string | null> => {
      try {
        const response = await fetch(`${this.baseUrl}/api/auth/csrf`, {
          method: 'GET',
          credentials: 'include',
          mode: 'cors',
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          return null;
        }

        const result = await response.json();
        const csrfToken = result?.data?.csrfToken || result?.csrfToken || null;

        if (csrfSequence !== this.csrfBootstrapSequence) {
          return null;
        }

        if (typeof csrfToken === 'string' && csrfToken.length > 0) {
          setCsrfTokenMemory(csrfToken);
          return csrfToken;
        }

        return null;
      } catch (error) {
        console.warn('CSRF bootstrap failed:', error);
        return null;
      }
    })();

    this.csrfBootstrapPromise = bootstrapPromise;

    try {
      return await bootstrapPromise;
    } finally {
      if (this.csrfBootstrapPromise === bootstrapPromise) {
        this.csrfBootstrapPromise = null;
      }
    }
  }

  private async shouldRetryForInvalidCsrf(response: Response): Promise<boolean> {
    if (response.status !== 403) {
      return false;
    }

    try {
      const clone = response.clone();
      const text = await clone.text();

      if (!text || text.trim() === '') {
        return false;
      }

      const data = JSON.parse(text);
      const message = String(data?.message || data?.error || '').toLowerCase();
      return message.includes('csrf');
    } catch {
      return false;
    }
  }

  private syncCsrfToken(payload: any): void {
    const csrfToken = payload?.data?.csrfToken || payload?.csrfToken;
    if (csrfToken) {
      setCsrfTokenMemory(csrfToken);
    }
  }

  private clearCsrfToken(): void {
    clearCsrfTokenMemory();
  }

  // Fetch with timeout and better error handling
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs = 15000,
    config: { retryOn401?: boolean; retryAttempted?: boolean; retryOn403?: boolean; retryAttempted403?: boolean } = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const retryOn401 = config.retryOn401 !== false;
    const retryAttempted = config.retryAttempted === true;
    const retryOn403 = config.retryOn403 !== false;
    const retryAttempted403 = config.retryAttempted403 === true;
    const method = (options.method || 'GET').toUpperCase();

    if (
      this.isBrowser() &&
      this.isStateChangingMethod(method) &&
      !this.shouldSkipCsrfForRequest(url)
    ) {
      await this.ensureCsrfToken();
    }

    try {
      console.log(`[API] Requesting: ${url}`);
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        mode: 'cors',
        credentials: 'include', // 🔒 REQUIRED: Send httpOnly cookies
      });
      clearTimeout(timeout);
      console.log(`[API] Response: ${response.status} ${response.statusText}`);

      if (response.status === 401 && retryAttempted) {
        // The request has already consumed its one refresh attempt.
        // Surface a terminal auth failure so callers do not start a second refresh cycle.
        throw new AuthenticationError('Session expired', true);
      }

      if (
        response.status === 401 &&
        retryOn401 &&
        !retryAttempted &&
        this.isBrowser() &&
        this.shouldAutoRefresh(url)
      ) {
        const refreshed = await this.refreshSession();

        if (refreshed.success && refreshed.data?.user) {
          return this.fetchWithTimeout(url, options, timeoutMs, {
            retryOn401,
            retryAttempted: true,
          });
        }

        this.clearClientSessionState();
        throw new AuthenticationError(refreshed.message || 'Session expired', true);
      }

      if (
        response.status === 403 &&
        retryOn403 &&
        !retryAttempted403 &&
        this.isBrowser() &&
        this.isStateChangingMethod(method) &&
        !this.shouldSkipCsrfForRequest(url) &&
        (await this.shouldRetryForInvalidCsrf(response))
      ) {
        const refreshedCsrf = await this.ensureCsrfToken(true);

        if (!refreshedCsrf) {
          // Bootstrap failed or produced no token; return the original failure
          // so callers can surface the CSRF error without generating more traffic.
          return response;
        }

        return this.fetchWithTimeout(url, options, timeoutMs, {
          retryOn401,
          retryAttempted,
          retryOn403,
          retryAttempted403: true,
        });
      }

      return response;
    } catch (error: any) {
      clearTimeout(timeout);
      console.error(`[API] Network error on ${url}:`, error);
      
      // Timeout error
      if (error.name === 'AbortError') {
        throw new NetworkError('Request timeout: Server took too long to respond');
      }
      
      // Network connection error (DNS, offline, server down)
      if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
        throw new NetworkError('Network error: Cannot reach API server. Check your internet connection or API URL.');
      }
      
      // Other errors
      throw new NetworkError(error.message || 'Network error occurred');
    }
  }

  async refreshSession(): Promise<AuthResponse> {
    if (!this.isBrowser()) {
      return {
        success: false,
        message: 'Session refresh is unavailable during server rendering.',
      };
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshSequence = this.refreshSequence;
    const refreshPromise = (async (): Promise<AuthResponse> => {
      try {
        const response = await this.fetchWithTimeout(
          `${this.baseUrl}/api/auth/refresh`,
          {
            method: 'POST',
            headers: this.getHeaders(),
          },
          15000,
          { retryOn401: false }
        );

        const result = await this.handleResponse(response, true);

        if (refreshSequence !== this.refreshSequence) {
          return {
            success: false,
            message: 'Session changed while refresh was in flight',
          };
        }

        if (result.success && result.data?.user) {
          this.syncCsrfToken(result);
          useAuthStore.getState().setAuth(result.data.user);
          return result;
        }

        this.clearClientSessionState();
        return {
          success: false,
          message: result.message || 'Session refresh failed',
        };
      } catch (error: any) {
        if (refreshSequence === this.refreshSequence) {
          this.clearClientSessionState();
        }

        return {
          success: false,
          message: error.message || 'Session refresh failed',
        };
      }
    })();

    this.refreshPromise = refreshPromise;

    try {
      return await refreshPromise;
    } finally {
      if (this.refreshPromise === refreshPromise) {
        this.refreshPromise = null;
      }
    }
  }

  // Global error handler
  private async handleResponse(response: Response, skipAuthRedirect = false) {
    // Clone response FIRST before consuming body
    const responseClone = response.clone();
    
    // Check if response has content
    const contentType = response.headers.get('content-type');
    const hasJson = contentType?.includes('application/json');
    
    console.log(`[API] Response content-type: ${contentType || 'MISSING'}, status: ${response.status}`);
    
    // Handle 204 No Content
    if (response.status === 204) {
      return { success: true };
    }

    // Try to get response text first
    let text: string;
    try {
      text = await response.text();
      console.log(`[API] Response body (first 500 chars):`, text.substring(0, 500));
    } catch (error) {
      console.error('❌ Failed to read response body:', error);
      throw new Error('Failed to read server response');
    }

    // If response is empty
    if (!text || text.trim() === '') {
      console.warn('⚠️  Empty response body from server');
      if (!response.ok) {
        throw new Error(`Server returned empty ${response.status} response`);
      }
      return { success: true };
    }

    // Try to parse as JSON (regardless of Content-Type header)
    let data: any;
    try {
      data = JSON.parse(text);
      console.log('[API] Successfully parsed JSON response');
    } catch (parseError) {
      // If parsing fails and Content-Type suggests JSON, it's an error
      if (hasJson) {
        console.error('❌ Invalid JSON from server (Content-Type says JSON but parsing failed):', parseError);
        console.error('Raw response:', text);
        throw new Error('Server returned invalid JSON');
      }
      
      // If Content-Type is not JSON and parsing fails, server might be returning HTML/text
      console.error('❌ Server returned non-JSON response:', text.substring(0, 200));
      
      if (!response.ok) {
        throw new Error(`Server error (${response.status}): Server returned HTML/text instead of JSON`);
      }
      
      // This is a success response but not JSON (shouldn't happen for our API)
      console.warn('⚠️  Warning: 200 OK but non-JSON response. This might indicate a proxy/CDN issue.');
      throw new Error('Server returned HTML/text instead of JSON. Check if API URL is correct.');
    }

    // Handle 401 - Unauthorized (token expired or invalid)
    // Skip redirect during login/register attempts
    if (response.status === 401 && !skipAuthRedirect) {
      const errorMsg = data.error || data.message || 'Session expired';
      // Throw AuthenticationError - let caller decide whether to logout
      throw new AuthenticationError(errorMsg);
    }

    // Handle other HTTP error responses (400, 403, 500, etc.)
    if (!response.ok) {
      const errorMsg = data.error || data.message || data.success === false && data.message || `HTTP ${response.status}`;
      console.error(`❌ Server returned error: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    this.syncCsrfToken(data);

    // Success response with JSON data
    return data;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      }, 15000, { retryOn401: false });

      const result = await this.handleResponse(response, true);

      // 🔒 SECURITY: Auth tokens remain in httpOnly cookies.
      // The CSRF token is mirrored into memory from the JSON payload only.
      if (result.success && result.data?.user) {
        this.syncCsrfToken(result);
        useAuthStore.getState().setAuth(result.data.user);
      }

      return result;
    } catch (error: any) {
      console.error('Register error:', error);
      return {
        success: false,
        message: error.message || 'Network error. Please check your connection.',
      };
    }
  }

  async login(data: LoginData): Promise<AuthResponse> {
    try {
      console.log('[API] Attempting login with:', { email: data.email });
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      }, 15000, { retryOn401: false });

      console.log('[API] Login response received, status:', response.status);
      const result = await this.handleResponse(response, true);
      console.log('[API] Login result:', { 
        success: result.success, 
        hasData: !!result.data,
        hasCsrfToken: !!result.data?.csrfToken,
        message: result.message 
      });

      // Backend returns: { success: true, message: '...', data: { user, csrfToken } }
      // Auth remains cookie-only; the CSRF token is the only browser-managed secret.
      if (result.success && result.data?.user) {
        console.log('✅ Login successful, user data received');
        this.syncCsrfToken(result);
        useAuthStore.getState().setAuth(result.data.user);
        return result;
      }

      // Backend returned error
      return {
        success: false,
        message: result.message || 'Login failed',
      };
    } catch (error: any) {
      console.error('❌ Login error:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 200)
      });
      
      // Return the actual error message from server or network
      return {
        success: false,
        message: error.message || 'An unexpected error occurred',
      };
    }
  }

  async getProfile(): Promise<AuthResponse> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/auth/profile`, {
        method: 'GET',
        headers: this.getHeaders(), // No withAuth needed - cookies sent automatically
      }, 15000, { retryOn401: true });

      return await this.handleResponse(response);
    } catch (error: any) {
      console.error('Get profile error:', error);
      return {
        success: false,
        message: error.message || 'Network error. Please check your connection.',
      };
    }
  }

  async updateProfile(data: { name: string }) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/auth/profile`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      }, 15000, { retryOn401: true });

      return await this.handleResponse(response);
    } catch (error: any) {
      console.error('Update profile error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update profile',
      };
    }
  }

  async logout(): Promise<void> {
    try {
      this.invalidateRefreshState();
      // Call backend to clear httpOnly cookie
      await this.fetchWithTimeout(`${this.baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: this.getHeaders(),
      }, 15000, { retryOn401: false });

      // Clear local auth state
      useAuthStore.getState().logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if backend call fails
      useAuthStore.getState().logout();
    }
  }

  isAuthenticated(): boolean {
    // Check auth store, not local token
    return useAuthStore.getState().isAuthenticated;
  }

  /**
   * Handle authentication failure - logout and redirect to login
   * Call this when catching AuthenticationError in components
   */
  handleAuthenticationFailure(errorMessage?: string): void {
    console.warn('Authentication failure:', errorMessage || 'Session expired');
    
    this.clearClientSessionState();
    
    // Redirect to login page
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }

  // Cart API methods
  async getCart() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/cart`, {
        method: 'GET',
        headers: this.getHeaders(),
      }, 15000, { retryOn401: true });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Get cart error:', error);
      throw error;
    }
  }

  async addToCart(productId: string, quantity: number = 1, customText?: string, customImageUrl?: string) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/cart/items`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ productId, quantity, customText, customImageUrl }),
      }, 15000, { retryOn401: true });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Add to cart error:', error);
      throw error;
    }
  }

  async addCustomDesignToCart(customDesignId: string, quantity: number = 1) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/cart/custom-designs`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ customDesignId, quantity }),
      }, 15000, { retryOn401: true });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Add custom design to cart error:', error);
      throw error;
    }
  }

  async updateCartItem(itemId: string, quantity: number) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/cart/items/${itemId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ quantity }),
      }, 15000, { retryOn401: true });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Update cart item error:', error);
      throw error;
    }
  }

  async removeFromCart(itemId: string) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/cart/items/${itemId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      }, 15000, { retryOn401: true });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Remove from cart error:', error);
      throw error;
    }
  }

  async clearCart() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/cart`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      }, 15000, { retryOn401: true });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Clear cart error:', error);
      throw error;
    }
  }

  // Custom photo upload for personalized products
  async uploadCustomPhoto(file: File) {
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/custom-photos/upload`, {
        method: 'POST',
        headers: this.getMultipartHeaders(),
        // Don't set headers - browser will set Content-Type with boundary
        // Authentication handled via cookies with credentials: 'include'
        body: formData,
      }, 15000, { retryOn401: true });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Upload custom photo error:', error);
      throw error;
    }
  }

  // Wishlist API methods
  async getWishlist() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/wishlist`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('Get wishlist error:', error);
      if (error instanceof NetworkError) {
        throw error;
      }
      throw new Error(error.message || 'Failed to get wishlist');
    }
  }

  async addToWishlist(productId: string) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/wishlist/items`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Add to wishlist error:', error);
      if (error instanceof NetworkError) {
        throw error;
      }
      throw new Error(error.message || 'Failed to add to wishlist');
    }
  }

  async removeFromWishlist(itemId: string) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/wishlist/items/${itemId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Remove from wishlist error:', error);
      if (error instanceof NetworkError) {
        throw error;
      }
      throw new Error(error.message || 'Failed to remove from wishlist');
    }
  }

  async clearWishlist() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/wishlist/clear`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Clear wishlist error:', error);
      if (error instanceof NetworkError) {
        throw error;
      }
      throw new Error(error.message || 'Failed to clear wishlist');
    }
  }

  // Address API methods
  async getAddresses() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/addresses`, {
        method: 'GET',
        headers: this.getHeaders(),
      }, 15000, { retryOn401: true });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get addresses error:', error);
      throw error;
    }
  }

  async getAddressById(addressId: string) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/addresses/${addressId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      }, 15000, { retryOn401: true });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get address error:', error);
      throw error;
    }
  }

  async createAddress(addressData: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
    isDefault?: boolean;
  }) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/addresses`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(addressData),
      }, 15000, { retryOn401: true });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Create address error:', error);
      throw error;
    }
  }

  async updateAddress(addressId: string, addressData: {
    fullName?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/addresses/${addressId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(addressData),
      }, 15000, { retryOn401: true });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Update address error:', error);
      throw error;
    }
  }

  async deleteAddress(addressId: string) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/addresses/${addressId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      }, 15000, { retryOn401: true });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Delete address error:', error);
      throw error;
    }
  }

  async setDefaultAddress(addressId: string) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/addresses/${addressId}/default`, {
        method: 'PUT',
        headers: this.getHeaders(),
      }, 15000, { retryOn401: true });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Set default address error:', error);
      throw error;
    }
  }

  async getDefaultAddress() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/addresses/default`, {
        method: 'GET',
        headers: this.getHeaders(),
      }, 15000, { retryOn401: true });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get default address error:', error);
      throw error;
    }
  }

  // Order API methods
  async createOrder() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/orders`, {
        method: 'POST',
        headers: this.getHeaders(),
      }, 15000, { retryOn401: true });
      return await response.json();
    } catch (error) {
      console.error('Create order error:', error);
      throw error;
    }
  }

  async getOrders(limit = 10, offset = 0) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/orders?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        headers: this.getHeaders(),
      }, 15000, { retryOn401: true });
      return await response.json();
    } catch (error) {
      console.error('Get orders error:', error);
      throw error;
    }
  }

  async getOrder(orderId: string) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/orders/${orderId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      }, 15000, { retryOn401: true });
      return await response.json();
    } catch (error) {
      console.error('Get order error:', error);
      throw error;
    }
  }

  async updateOrderStatus(orderId: string, status: string) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ status }),
      }, 15000, { retryOn401: true });
      return await response.json();
    } catch (error) {
      console.error('Update order status error:', error);
      throw error;
    }
  }

  async getOrderStats() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/orders/stats`, {
        method: 'GET',
        headers: this.getHeaders(),
      }, 15000, { retryOn401: true });
      return await response.json();
    } catch (error) {
      console.error('Get order stats error:', error);
      throw error;
    }
  }

  // ============== PAYMENT API (Razorpay Integration) ==============
  
  /**
   * Step 1: Create order from cart (before payment)
   */
  async createPaymentOrder(shippingAddress?: any) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/payment/orders`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ shippingAddress }),
      }, 15000, { retryOn401: true });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.message || 'Failed to create order' };
      }

      return await response.json();
    } catch (error) {
      console.error('Create payment order error:', error);
      return { success: false, message: 'Network error' };
    }
  }

  /**
   * Step 2: Create Razorpay order (initialize payment)
   */
  async createRazorpayOrder(orderId: string) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/payment/create-order/${orderId}`, {
        method: 'POST',
        headers: this.getHeaders(),
      }, 15000, { retryOn401: true });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.message || 'Failed to create Razorpay order' };
      }

      return await response.json();
    } catch (error) {
      console.error('Create Razorpay order error:', error);
      return { success: false, message: 'Network error' };
    }
  }

  /**
   * Step 3: Verify payment signature (after user payment)
   */
  async verifyRazorpayPayment(paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/payment/verify`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(paymentData),
      }, 15000, { retryOn401: true });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.message || 'Payment verification failed' };
      }

      return await response.json();
    } catch (error) {
      console.error('Verify Razorpay payment error:', error);
      return { success: false, message: 'Network error' };
    }
  }

  /**
   * Handle payment failure
   */
  async handlePaymentFailure(orderId: string, reason?: string) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/payment/failure`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ orderId, reason }),
      }, 15000, { retryOn401: true });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.message || 'Failed to handle payment failure' };
      }

      return await response.json();
    } catch (error) {
      console.error('Handle payment failure error:', error);
      return { success: false, message: 'Network error' };
    }
  }

  /**
   * Get payment status for an order
   */
  async getPaymentStatus(orderId: string) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/payment/status/${orderId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      }, 15000, { retryOn401: true });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.message || 'Failed to get payment status' };
      }

      return await response.json();
    } catch (error) {
      console.error('Get payment status error:', error);
      return { success: false, message: 'Network error' };
    }
  }

  /**
   * Verify payment for an order (alias to getPaymentStatus)
   */
  async verifyPayment(orderId: string) {
    return this.getPaymentStatus(orderId);
  }

  /**
   * Get order with payment details
   */
  async getOrderWithPayment(orderId: string) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/payment/orders/${orderId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      }, 15000, { retryOn401: true });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.message || 'Failed to get order' };
      }

      return await response.json();
    } catch (error) {
      console.error('Get order error:', error);
      return { success: false, message: 'Network error' };
    }
  }

  // ============== CATEGORIES ==============
  async getCategories() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/categories`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return { success: false, message: 'Failed to fetch categories', data: [] };
      }

      return await this.handleResponse(response);
    } catch (error: any) {
      console.error('Get categories error:', error);
      return { success: false, message: error.message || 'Network error', data: [] };
    }
  }

  async createCategory(name: string) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/admin/categories`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ name }),
      }, 15000, { retryOn401: true });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.message || 'Failed to create category' };
      }

      return await response.json();
    } catch (error) {
      console.error('Create category error:', error);
      return { success: false, message: 'Network error' };
    }
  }

  // ============== PRODUCTS ==============
  async getProducts() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/products/all`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return { success: false, message: 'Failed to fetch products', data: [] };
      }

      return await this.handleResponse(response);
    } catch (error: any) {
      console.error('Get products error:', error);
      return { success: false, message: error.message || 'Network error', data: [] };
    }
  }

  async searchProducts(query: string) {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/products/search?q=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        return { success: false, message: 'Search failed', data: [] };
      }

      return await this.handleResponse(response);
    } catch (error: any) {
      console.error('Search products error:', error);
      return { success: false, message: error.message || 'Network error', data: [] };
    }
  }

  async getProductById(id: string) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/products/${id}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return { success: false, message: 'Failed to fetch product' };
      }

      return await this.handleResponse(response);
    } catch (error: any) {
      console.error('Get product error:', error);
      return { success: false, message: error.message || 'Network error' };
    }
  }

  async createProduct(formData: FormData) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/admin/products`, {
        method: 'POST',
        headers: this.getMultipartHeaders(),
        body: formData,
      }, 15000, { retryOn401: true });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.message || 'Failed to create product' };
      }

      return await response.json();
    } catch (error) {
      console.error('Create product error:', error);
      return { success: false, message: 'Network error' };
    }
  }

  async updateProduct(id: string, formData: FormData) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/admin/products/${id}`, {
        method: 'PUT',
        headers: this.getMultipartHeaders(),
        body: formData,
      }, 15000, { retryOn401: true });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.message || 'Failed to update product' };
      }

      return await response.json();
    } catch (error) {
      console.error('Update product error:', error);
      return { success: false, message: 'Network error' };
    }
  }

  async deleteProduct(id: string) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.message || 'Failed to delete product' };
      }

      return await response.json();
    } catch (error: any) {
      console.error('Delete product error:', error);
      return { success: false, message: error.message || 'Network error' };
    }
  }

  /**
   * Submit contact form
   */
  async submitContactForm(data: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
  }) {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/contact`, {
        method: 'POST',
        headers: this.getHeaders(),
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await this.handleResponse(response, true);
      return result;
    } catch (error: any) {
      console.error('Submit contact form error:', error);
      if (error instanceof NetworkError) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      throw error;
    }
  }

  /**
   * Upload 3D design file with specifications
   */
  async upload3DDesign(data: {
    file: File;
    name: string;
    description?: string;
    material: string;
    color: string;
    isMultiColor?: boolean;
    quantity: number;
    printerType: string;
    infillPercentage: number;
    layerHeight: number;
  }) {
    try {
      const uploadTimeoutMs = 120000;

      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('name', data.name);
      if (data.description) {
        formData.append('description', data.description);
      }
      formData.append('material', data.material);
      formData.append('color', data.color);
      if (data.isMultiColor !== undefined) {
        formData.append('isMultiColor', data.isMultiColor.toString());
      }
      formData.append('quantity', data.quantity.toString());
      formData.append('printerType', data.printerType);
      formData.append('infillPercentage', data.infillPercentage.toString());
      formData.append('layerHeight', data.layerHeight.toString());

      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/custom-designs`,
        {
          method: 'POST',
          headers: this.getMultipartHeaders(true),
          credentials: 'include',
          body: formData,
        },
        uploadTimeoutMs
      );

      const result = await this.handleResponse(response, true);
      return result;
    } catch (error: any) {
      console.error('Upload 3D design error:', error);
      if (error instanceof NetworkError) {
        if (error.message?.includes('timeout')) {
          throw new Error('3D analysis is taking longer than expected. Please wait and try again.');
        }
        throw new Error('Network error. Please check your connection and try again.');
      }
      throw error;
    }
  }
}

export const apiClient = new ApiClient();

