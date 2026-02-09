import { useAuthStore } from '@/store/auth.store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
  }

  private getHeaders(withAuth = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (withAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    // Check Zustand store first, then fallback to localStorage
    const storeToken = useAuthStore.getState().token;
    return storeToken || localStorage.getItem('token');
  }

  private setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('token', token);
    // Note: Zustand store will be updated by the login/register functions
  }

  private removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('token');
    // Also clear Zustand store
    useAuthStore.getState().logout();
  }

  // Fetch with timeout and better error handling
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs = 30000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return response;
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Please try again.');
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  // Global error handler
  private async handleResponse(response: Response, skipAuthRedirect = false) {
    // Check if response has content
    const contentType = response.headers.get('content-type');
    const hasJson = contentType?.includes('application/json');
    
    // Handle empty responses
    if (response.status === 204 || !hasJson) {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return { success: true };
    }

    // Try to parse JSON, with error handling
    let data;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : { success: true };
    } catch (error) {
      console.error('Failed to parse response:', error);
      throw new Error('Invalid response from server');
    }

    // Handle 401 - Unauthorized (token expired or invalid)
    // Skip redirect during login/register attempts
    if (response.status === 401 && !skipAuthRedirect) {
      this.removeToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please login again.');
    }

    // Handle other error responses
    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}`);
    }

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

      if (result.success && result.data?.token) {
        this.setToken(result.data.token);
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
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      const result = await this.handleResponse(response, true);

      if (result.success && result.data?.token) {
        this.setToken(result.data.token);
      }

      return result;
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.message || 'Network error. Please check your connection.',
      };
    }
  }

  async getProfile() {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/auth/profile`, {
        method: 'GET',
        headers: this.getHeaders(true),
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

  logout(): void {
    this.removeToken();
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Cart API methods
  async getCart() {
    try {
      const response = await fetch(`${this.baseUrl}/api/cart`, {
        method: 'GET',
        headers: this.getHeaders(true),
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
        headers: this.getHeaders(true),
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
        headers: this.getHeaders(true),
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
        headers: this.getHeaders(true),
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
        headers: this.getHeaders(true),
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
        headers: this.getHeaders(true),
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
        headers: this.getHeaders(true),
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
        headers: this.getHeaders(true),
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
        headers: this.getHeaders(true),
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
        headers: this.getHeaders(true),
      });
      return await response.json();
    } catch (error) {
      console.error('Get order stats error:', error);
      throw error;
    }
  }

  // Payment API methods
  async createPaymentOrder() {
    try {
      const response = await fetch(`${this.baseUrl}/api/payment/orders`, {
        method: 'POST',
        headers: this.getHeaders(true),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.error || 'Failed to create order' };
      }

      return await response.json();
    } catch (error) {
      console.error('Create payment order error:', error);
      return { success: false, message: 'Network error' };
    }
  }

  async initiatePayment(orderId: string, upiId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/api/payment/initiate`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify({ orderId, upiId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.error || 'Failed to initiate payment' };
      }

      return await response.json();
    } catch (error) {
      console.error('Initiate payment error:', error);
      return { success: false, message: 'Network error' };
    }
  }

  async verifyPayment(transactionId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/api/payment/verify`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify({ transactionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.error || 'Payment verification failed' };
      }

      return await response.json();
    } catch (error) {
      console.error('Verify payment error:', error);
      return { success: false, message: 'Network error' };
    }
  }

  async getPaymentStatus(orderId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/api/payment/status/${orderId}`, {
        method: 'GET',
        headers: this.getHeaders(true),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.error || 'Failed to get payment status' };
      }

      return await response.json();
    } catch (error) {
      console.error('Get payment status error:', error);
      return { success: false, message: 'Network error' };
    }
  }

  async getOrderWithPayment(orderId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/api/payment/orders/${orderId}`, {
        method: 'GET',
        headers: this.getHeaders(true),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.error || 'Failed to get order' };
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
      const token = this.getToken();
      const response = await fetch(`${this.baseUrl}/api/admin/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
      const token = this.getToken();
      const response = await fetch(`${this.baseUrl}/api/admin/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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
}

export const apiClient = new ApiClient();
