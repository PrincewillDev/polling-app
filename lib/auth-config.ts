export interface AuthConfig {
  useApiRoutes: boolean;
  enableRateLimiting: boolean;
  enableAnalytics: boolean;
  sessionRefreshBuffer: number; // minutes before expiry to refresh
  maxRetries: number;
  retryDelay: number; // milliseconds
  endpoints: {
    login: string;
    register: string;
    logout: string;
    resetPassword: string;
    session: string;
    refresh: string;
  };
}

// Default configuration
const defaultConfig: AuthConfig = {
  useApiRoutes: false, // Set to true to use API routes instead of direct Supabase calls
  enableRateLimiting: true,
  enableAnalytics: true,
  sessionRefreshBuffer: 10, // Refresh 10 minutes before expiry
  maxRetries: 3,
  retryDelay: 1000,
  endpoints: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    resetPassword: '/api/auth/reset-password',
    session: '/api/auth/session',
    refresh: '/api/auth/refresh',
  },
};

// Environment-based configuration
const getEnvironmentConfig = (): Partial<AuthConfig> => {
  // In production, prefer API routes for better security and centralized handling
  const isProduction = process.env.NODE_ENV === 'production';

  // Check if API routes are explicitly enabled
  const useApiRoutes = process.env.NEXT_PUBLIC_USE_AUTH_API_ROUTES === 'true' || isProduction;

  // Check if rate limiting should be disabled (useful for development/testing)
  const enableRateLimiting = process.env.NEXT_PUBLIC_DISABLE_RATE_LIMITING !== 'true';

  // Check if analytics should be disabled
  const enableAnalytics = process.env.NEXT_PUBLIC_DISABLE_AUTH_ANALYTICS !== 'true';

  return {
    useApiRoutes,
    enableRateLimiting,
    enableAnalytics,
  };
};

// Merge default config with environment overrides
export const authConfig: AuthConfig = {
  ...defaultConfig,
  ...getEnvironmentConfig(),
};

// Auth strategy interface for dependency injection
export interface AuthStrategy {
  login(email: string, password: string): Promise<{
    success: boolean;
    user?: any;
    session?: any;
    error?: string;
  }>;

  register(name: string, email: string, password: string): Promise<{
    success: boolean;
    user?: any;
    session?: any;
    message?: string;
    error?: string;
  }>;

  logout(): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;

  resetPassword(email: string, redirectTo?: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;

  getSession(): Promise<{
    success: boolean;
    authenticated: boolean;
    user?: any;
    session?: any;
    error?: string;
  }>;

  refreshSession(refreshToken?: string): Promise<{
    success: boolean;
    user?: any;
    session?: any;
    error?: string;
  }>;
}

// Validation functions
export const validateAuthConfig = (config: AuthConfig): string[] => {
  const errors: string[] = [];

  if (config.sessionRefreshBuffer < 1) {
    errors.push('sessionRefreshBuffer must be at least 1 minute');
  }

  if (config.sessionRefreshBuffer > 60) {
    errors.push('sessionRefreshBuffer should not exceed 60 minutes');
  }

  if (config.maxRetries < 1 || config.maxRetries > 10) {
    errors.push('maxRetries must be between 1 and 10');
  }

  if (config.retryDelay < 100 || config.retryDelay > 10000) {
    errors.push('retryDelay must be between 100ms and 10s');
  }

  // Validate endpoint paths
  Object.entries(config.endpoints).forEach(([key, path]) => {
    if (!path.startsWith('/')) {
      errors.push(`Endpoint ${key} must start with '/'`);
    }

    if (path.includes('..')) {
      errors.push(`Endpoint ${key} contains invalid path traversal`);
    }
  });

  return errors;
};

// Runtime configuration validation
const configErrors = validateAuthConfig(authConfig);
if (configErrors.length > 0) {
  console.warn('Auth configuration warnings:', configErrors);
}

// Helper functions
export const isApiRoutesEnabled = (): boolean => authConfig.useApiRoutes;
export const isRateLimitingEnabled = (): boolean => authConfig.enableRateLimiting;
export const isAnalyticsEnabled = (): boolean => authConfig.enableAnalytics;

export const getAuthEndpoint = (type: keyof AuthConfig['endpoints']): string => {
  return authConfig.endpoints[type];
};

export const shouldRefreshSession = (expiresAt: number): boolean => {
  const now = Math.floor(Date.now() / 1000);
  const bufferSeconds = authConfig.sessionRefreshBuffer * 60;
  return (expiresAt - bufferSeconds) <= now;
};

// Development helpers
export const getAuthConfigDebugInfo = () => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return {
    config: authConfig,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_USE_AUTH_API_ROUTES: process.env.NEXT_PUBLIC_USE_AUTH_API_ROUTES,
      NEXT_PUBLIC_DISABLE_RATE_LIMITING: process.env.NEXT_PUBLIC_DISABLE_RATE_LIMITING,
      NEXT_PUBLIC_DISABLE_AUTH_ANALYTICS: process.env.NEXT_PUBLIC_DISABLE_AUTH_ANALYTICS,
    },
    validation: {
      errors: configErrors,
      isValid: configErrors.length === 0,
    }
  };
};

// Log configuration in development
if (process.env.NODE_ENV === 'development') {
  console.log('Auth Configuration:', {
    useApiRoutes: authConfig.useApiRoutes,
    enableRateLimiting: authConfig.enableRateLimiting,
    enableAnalytics: authConfig.enableAnalytics,
  });
}
