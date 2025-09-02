"use client";

import { User } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface LoginResponse {
  success: boolean;
  user?: AuthUser;
  session?: AuthSession;
  error?: string;
}

export interface RegisterResponse {
  success: boolean;
  user?: AuthUser;
  session?: AuthSession;
  message?: string;
  error?: string;
}

export interface LogoutResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface SessionResponse {
  success: boolean;
  authenticated: boolean;
  user?: AuthUser;
  session?: AuthSession;
  error?: string;
}

export interface RefreshResponse {
  success: boolean;
  user?: AuthUser;
  session?: AuthSession;
  error?: string;
}

export class AuthAPI {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Include cookies
      });

      const data: LoginResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Login API error:', error);
      return {
        success: false,
        error: 'Network error occurred during login'
      };
    }
  }

  /**
   * Register a new user
   */
  async register(name: string, email: string, password: string): Promise<RegisterResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
        credentials: 'include', // Include cookies
      });

      const data: RegisterResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Register API error:', error);
      return {
        success: false,
        error: 'Network error occurred during registration'
      };
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<LogoutResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
      });

      const data: LogoutResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Logout API error:', error);
      return {
        success: false,
        error: 'Network error occurred during logout'
      };
    }
  }

  /**
   * Request password reset
   */
  async resetPassword(email: string, redirectTo?: string): Promise<ResetPasswordResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, redirectTo }),
        credentials: 'include', // Include cookies
      });

      const data: ResetPasswordResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Reset password API error:', error);
      return {
        success: false,
        error: 'Network error occurred during password reset'
      };
    }
  }

  /**
   * Get current session status
   */
  async getSession(): Promise<SessionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/session`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
      });

      const data: SessionResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Get session API error:', error);
      return {
        success: false,
        authenticated: false,
        error: 'Network error occurred while checking session'
      };
    }
  }

  /**
   * Refresh session token
   */
  async refreshSession(refreshToken?: string): Promise<RefreshResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
        credentials: 'include', // Include cookies
      });

      const data: RefreshResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Refresh session API error:', error);
      return {
        success: false,
        error: 'Network error occurred during session refresh'
      };
    }
  }

  /**
   * Make an authenticated API request
   */
  async authenticatedFetch(
    endpoint: string,
    options: RequestInit = {},
    accessToken?: string
  ): Promise<Response> {
    const headers = new Headers(options.headers);

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const requestOptions: RequestInit = {
      ...options,
      headers,
      credentials: 'include', // Always include cookies
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, requestOptions);

      // If we get a 401, try to refresh the session
      if (response.status === 401 && accessToken) {
        const refreshResult = await this.refreshSession();

        if (refreshResult.success && refreshResult.session) {
          // Retry the request with the new token
          headers.set('Authorization', `Bearer ${refreshResult.session.access_token}`);
          const retryOptions: RequestInit = {
            ...options,
            headers,
            credentials: 'include',
          };

          return fetch(`${this.baseUrl}${endpoint}`, retryOptions);
        }
      }

      return response;
    } catch (error) {
      console.error('Authenticated fetch error:', error);
      throw error;
    }
  }
}

// Default instance
export const authAPI = new AuthAPI();

// Helper functions for common operations
export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  return authAPI.login(email, password);
}

export async function registerUser(name: string, email: string, password: string): Promise<RegisterResponse> {
  return authAPI.register(name, email, password);
}

export async function logoutUser(): Promise<LogoutResponse> {
  return authAPI.logout();
}

export async function resetUserPassword(email: string, redirectTo?: string): Promise<ResetPasswordResponse> {
  return authAPI.resetPassword(email, redirectTo);
}

export async function getCurrentSession(): Promise<SessionResponse> {
  return authAPI.getSession();
}

export async function refreshUserSession(refreshToken?: string): Promise<RefreshResponse> {
  return authAPI.refreshSession(refreshToken);
}

export async function makeAuthenticatedRequest(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string
): Promise<Response> {
  return authAPI.authenticatedFetch(endpoint, options, accessToken);
}

// Utility functions
export function isSessionExpired(session: AuthSession): boolean {
  if (!session.expires_at) return true;

  const now = Math.floor(Date.now() / 1000);
  const buffer = 300; // 5 minutes buffer

  return session.expires_at - buffer <= now;
}

export function isSessionExpiringSoon(session: AuthSession, bufferMinutes: number = 10): boolean {
  if (!session.expires_at) return true;

  const now = Math.floor(Date.now() / 1000);
  const buffer = bufferMinutes * 60;

  return session.expires_at - buffer <= now;
}

export function getTimeUntilExpiry(session: AuthSession): number {
  if (!session.expires_at) return 0;

  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, session.expires_at - now);
}

export function formatSessionExpiryTime(session: AuthSession): string {
  if (!session.expires_at) return "Unknown";

  const expiryDate = new Date(session.expires_at * 1000);
  return expiryDate.toLocaleString();
}

// Auth event types for custom event system
export type AuthEventType =
  | 'login'
  | 'logout'
  | 'register'
  | 'token_refresh'
  | 'session_expired'
  | 'auth_error';

export interface AuthEvent {
  type: AuthEventType;
  user?: AuthUser;
  session?: AuthSession;
  error?: string;
  timestamp: Date;
}

// Simple event emitter for auth events
class AuthEventEmitter {
  private listeners: Map<AuthEventType, Set<(event: AuthEvent) => void>> = new Map();

  on(eventType: AuthEventType, callback: (event: AuthEvent) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
  }

  off(eventType: AuthEventType, callback: (event: AuthEvent) => void) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  emit(event: AuthEvent) {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Auth event listener error:', error);
        }
      });
    }
  }
}

export const authEvents = new AuthEventEmitter();

// Helper to emit auth events
export function emitAuthEvent(type: AuthEventType, data: Partial<AuthEvent> = {}) {
  authEvents.emit({
    type,
    timestamp: new Date(),
    ...data
  });
}
