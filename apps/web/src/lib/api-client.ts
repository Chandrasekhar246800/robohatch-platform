import { useAuthStore } from '@/store/auth.store';

// Ensure API_URL is an absolute URL
const getApiUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // If no URL is set, use localhost for development
  if (!envUrl) {
    console.warn('⚠️  NEXT_PUBLIC_API_URL not set, using localhost:5000');
    return 'http://localhost:5000';
  }
  
  // If URL doesn't start with http:// or https://, add https://
  if (!envUrl.startsWith('http://') && !envUrl.startsWith('https://')) {
    console.warn('⚠️  NEXT_PUBLIC_API_URL missing protocol, adding https://');
    return `https://${envUrl}`;
  }
  
  // Remove trailing slash if present
  return envUrl.replace(/\/$/, '');
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
    token: string;
  };
}

export interface ApiError {
  success: false;
  message: string;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
    if (typeof window !== 'undefined') {
      console.log('[API Client] Base URL:', this.baseUrl);
      
      // Validate URL is absolute
      if (!this.baseUrl.startsWith('http://') && !this.baseUrl.startsWith('https://')) {
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
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // 🔒 SECURITY: No Authorization header - using httpOnly cookies
    // Tokens are automatically sent via cookies with credentials: 'include'

    return headers;
  }

  // Fetch with timeout and better error handling
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs = 15000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

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
      return response;
    } catch (error: any) {
      clearTimeout(timeout);
      console.error(`[API] Network error on ${url}:`, error);
      
      // Timeout error
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: Server took too long to respond');
      }
      
      // Network connection error (DNS, offline, server down)
      if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
        throw new Error('Network error: Cannot reach API server. Check your internet connection or API URL.');
      }
      
      // Other errors
      throw error;
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
      // Clear auth state (httpOnly cookie cleared by backend)
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      const errorMsg = data.error || data.message || 'Session expired';
      throw new Error(errorMsg);
    }

    // Handle other HTTP error responses (400, 403, 500, etc.)
    if (!response.ok) {
      const errorMsg = data.error || data.message || data.success === false && data.message || `HTTP ${response.status}`;
      console.error(`❌ Server returned error: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Success response with JSON data
    return data;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      const result = await this.handleResponse(response, true);

      // 🔒 SECURITY: Token is in httpOnly cookie, not in response
      // Update auth store with user data only (no token)
      if (result.success && result.data?.user) {
        useAuthStore.getState().setAuth(result.data.user, '');
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
      });

      console.log('[API] Login response received, status:', response.status);
      const result = await this.handleResponse(response, true);
      console.log('[API] Login result:', { 
        success: result.success, 
        hasData: !!result.data,
        hasToken: !!result.data?.token,
        message: result.message 
      });

      // Backend returns: { success: true, message: '...', data: { user } }
      // 🔒 SECURITY: No token in response, it's in httpOnly cookie
      if (result.success && result.data?.user) {
        console.log('✅ Login successful, user data received');
        useAuthStore.getState().setAuth(result.data.user, '');
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

  async getProfile() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/auth/profile`, {
        method: 'GET',
        headers: this.getHeaders(), // No withAuth needed - cookies sent automatically
      });

      return await this.handleResponse(response);
    } catch (error: any) {
      console.error('Get profile error:', error);
      return {
        success: false,
        message: error.message || 'Network error. Please check your connection.',
      };
    }
  }

  async logout(): Promise<void> {
    try {
      // Call backend to clear httpOnly cookie
      await this.fetchWithTimeout(`${this.baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
      
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

  // Cart API methods
  async getCart() {
    try {
      const response = await fetch(`${this.baseUrl}/api/cart`, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include', // Send cookies
      });

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

  async addToCart(productId: string, quantity: number = 1) {
    try {
      const response = await fetch(`${this.baseUrl}/api/cart/items`, {
        method: 'POST',
        headers: this.getHeaders(),
        credentials: 'include', // Send cookies for authentication
        body: JSON.stringify({ productId, quantity }),
      });

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

  async updateCartItem(itemId: string, quantity: number) {
    try {
      const response = await fetch(`${this.baseUrl}/api/cart/items/${itemId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        credentials: 'include', // Send cookies for authentication
        body: JSON.stringify({ quantity }),
      });

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
      const response = await fetch(`${this.baseUrl}/api/cart/items/${itemId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        credentials: 'include', // Send cookies for authentication
      });

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
      const response = await fetch(`${this.baseUrl}/api/cart`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        credentials: 'include', // Send cookies for authentication
      });

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

  // Order API methods
  async createOrder() {
    try {
      const response = await fetch(`${this.baseUrl}/api/orders`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
      return await response.json();
    } catch (error) {
      console.error('Create order error:', error);
      throw error;
    }
  }

  async getOrders(limit = 10, offset = 0) {
    try {
      const response = await fetch(`${this.baseUrl}/api/orders?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return await response.json();
    } catch (error) {
      console.error('Get orders error:', error);
      throw error;
    }
  }

  async getOrder(orderId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/api/orders/${orderId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return await response.json();
    } catch (error) {
      console.error('Get order error:', error);
      throw error;
    }
  }

  async updateOrderStatus(orderId: string, status: string) {
    try {
      const response = await fetch(`${this.baseUrl}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ status }),
      });
      return await response.json();
    } catch (error) {
      console.error('Update order status error:', error);
      throw error;
    }
  }

  async getOrderStats() {
    try {
      const response = await fetch(`${this.baseUrl}/api/orders/stats`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
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
  async createPaymentOrder() {
    try {
      const response = await fetch(`${this.baseUrl}/api/payment/orders`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

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
      const response = await fetch(`${this.baseUrl}/api/payment/create-order/${orderId}`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

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
      const response = await fetch(`${this.baseUrl}/api/payment/verify`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(paymentData),
      });

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
      const response = await fetch(`${this.baseUrl}/api/payment/failure`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ orderId, reason }),
      });

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
      const response = await fetch(`${this.baseUrl}/api/payment/status/${orderId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

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
      const response = await fetch(`${this.baseUrl}/api/payment/orders/${orderId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

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
      const response = await fetch(`${this.baseUrl}/api/admin/categories`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

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
      const response = await fetch(`${this.baseUrl}/api/admin/products`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

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
}

export const apiClient = new ApiClient();
