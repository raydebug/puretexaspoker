const API_BASE_URL = 'http://localhost:3001/api';

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar?: string;
  chips: number;
  gamesPlayed: number;
  gamesWon: number;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    user: User;
    tokens: AuthTokens;
  };
}

export interface ProfileUpdateData {
  displayName?: string;
  avatar?: string;
  email?: string;
}

export interface PasswordChangeData {
  oldPassword: string;
  newPassword: string;
}

export class AuthService {
  private static instance: AuthService;
  private user: User | null = null;
  private tokens: AuthTokens | null = null;

  private constructor() {
    // Load user and tokens from localStorage on initialization
    this.loadFromStorage();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Register new user
   */
  public async register(data: RegisterData): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: AuthResponse = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.message || 'Registration failed');
      }

      // Store user and tokens
      this.user = result.data.user;
      this.tokens = result.data.tokens;
      this.saveToStorage();

      return this.user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  public async login(data: LoginData): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: AuthResponse = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.message || 'Login failed');
      }

      // Store user and tokens
      this.user = result.data.user;
      this.tokens = result.data.tokens;
      this.saveToStorage();

      return this.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  public async logout(): Promise<void> {
    try {
      if (this.tokens?.accessToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.tokens.accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state regardless of API call success
      this.user = null;
      this.tokens = null;
      this.clearStorage();
    }
  }

  /**
   * Refresh access token
   */
  public async refreshToken(): Promise<AuthTokens> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.tokens.refreshToken }),
      });

      const result = await response.json();

      if (!result.success || !result.data?.tokens) {
        throw new Error(result.message || 'Token refresh failed');
      }

      // Update tokens
      this.tokens = result.data.tokens;
      this.saveToStorage();

      if (!this.tokens) {
        throw new Error('Failed to update tokens');
      }

      return this.tokens;
    } catch (error) {
      console.error('Token refresh error:', error);
      // If refresh fails, logout user
      await this.logout();
      throw error;
    }
  }

  /**
   * Get current user profile
   */
  public async getProfile(): Promise<User> {
    try {
      const response = await this.makeAuthenticatedRequest('/auth/profile');
      const result = await response.json();

      if (!result.success || !result.data?.user) {
        throw new Error(result.message || 'Failed to get profile');
      }

      // Update cached user
      this.user = result.data.user;
      this.saveToStorage();

      if (!this.user) {
        throw new Error('Failed to update user profile');
      }

      return this.user;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  public async updateProfile(data: ProfileUpdateData): Promise<User> {
    try {
      const response = await this.makeAuthenticatedRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success || !result.data?.user) {
        throw new Error(result.message || 'Failed to update profile');
      }

      // Update cached user
      this.user = result.data.user;
      this.saveToStorage();

      if (!this.user) {
        throw new Error('Failed to update user profile');
      }

      return this.user;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  /**
   * Change password
   */
  public async changePassword(data: PasswordChangeData): Promise<void> {
    try {
      const response = await this.makeAuthenticatedRequest('/auth/password', {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Validate current session
   */
  public async validateSession(): Promise<boolean> {
    try {
      const response = await this.makeAuthenticatedRequest('/auth/validate');
      const result = await response.json();

      return result.success && result.data?.isAuthenticated;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  /**
   * Make authenticated request with automatic token refresh
   */
  private async makeAuthenticatedRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    if (!this.tokens?.accessToken) {
      throw new Error('No access token available');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.tokens.accessToken}`,
      ...options.headers,
    };

    let response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // If token expired, try to refresh
    if (response.status === 403 || response.status === 401) {
      try {
        await this.refreshToken();
        
        // Retry request with new token
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers: {
            ...headers,
            'Authorization': `Bearer ${this.tokens!.accessToken}`,
          },
        });
      } catch (refreshError) {
        // Refresh failed, logout user
        await this.logout();
        throw new Error('Session expired. Please login again.');
      }
    }

    return response;
  }

  /**
   * Get current user
   */
  public getCurrentUser(): User | null {
    return this.user;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.user !== null && this.tokens !== null;
  }

  /**
   * Get access token
   */
  public getAccessToken(): string | null {
    return this.tokens?.accessToken || null;
  }

  /**
   * Save authentication data to localStorage
   */
  private saveToStorage(): void {
    if (this.user && this.tokens) {
      localStorage.setItem('poker_auth_user', JSON.stringify(this.user));
      localStorage.setItem('poker_auth_tokens', JSON.stringify(this.tokens));
    }
  }

  /**
   * Load authentication data from localStorage
   */
  private loadFromStorage(): void {
    try {
      const userStr = localStorage.getItem('poker_auth_user');
      const tokensStr = localStorage.getItem('poker_auth_tokens');

      if (userStr && tokensStr) {
        this.user = JSON.parse(userStr);
        this.tokens = JSON.parse(tokensStr);
      }
    } catch (error) {
      console.error('Error loading auth data from storage:', error);
      this.clearStorage();
    }
  }

  /**
   * Clear authentication data from localStorage
   */
  private clearStorage(): void {
    localStorage.removeItem('poker_auth_user');
    localStorage.removeItem('poker_auth_tokens');
  }
}

export const authService = AuthService.getInstance(); 