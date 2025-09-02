# Authentication System Documentation

This document provides a comprehensive overview of the polling app's authentication system, including setup, configuration, API routes, and usage patterns.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Configuration](#configuration)
4. [API Routes](#api-routes)
5. [Frontend Components](#frontend-components)
6. [Security Features](#security-features)
7. [Usage Examples](#usage-examples)
8. [Troubleshooting](#troubleshooting)
9. [Development Guidelines](#development-guidelines)

## Overview

The polling app features a robust authentication system built on Supabase with additional API routes for enhanced security, rate limiting, and centralized error handling. The system supports:

- **User Registration & Login**: Email/password authentication with comprehensive validation
- **Session Management**: Automatic token refresh and session persistence
- **Password Reset**: Secure password reset via email
- **Rate Limiting**: Protection against brute force attacks
- **User Profiles**: Automatic user profile creation and management
- **Route Protection**: Middleware-based route protection

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
├─────────────────────────────────────────────────────────────┤
│ • Auth Pages (Login/Register)                               │
│ • Auth Provider (SSRAuthProvider)                           │
│ • Auth API Client (AuthAPI)                                │
│ • Rate Limiting Utils                                       │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   Middleware Layer                          │
├─────────────────────────────────────────────────────────────┤
│ • Route Protection                                          │
│ • Session Validation                                        │
│ • Redirect Logic                                            │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                                │
├─────────────────────────────────────────────────────────────┤
│ • /api/auth/login                                          │
│ • /api/auth/register                                       │
│ • /api/auth/logout                                         │
│ • /api/auth/reset-password                                 │
│ • /api/auth/session                                        │
│ • /api/auth/refresh                                        │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                 Supabase Layer                              │
├─────────────────────────────────────────────────────────────┤
│ • Auth Service                                              │
│ • User Management                                           │
│ • Session Handling                                          │
│ • Database Operations                                       │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Action**: User submits login/register form
2. **Frontend Validation**: Client-side validation and rate limit checks
3. **API Request**: Request sent to appropriate API route
4. **Server Processing**: API route validates, processes with Supabase
5. **Database Operations**: User profile management, session creation
6. **Response**: Success/error response with user data and session
7. **State Update**: Frontend updates auth state and redirects

## Configuration

### Environment Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Auth Configuration (Optional)
NEXT_PUBLIC_USE_AUTH_API_ROUTES=true
NEXT_PUBLIC_DISABLE_RATE_LIMITING=false
NEXT_PUBLIC_DISABLE_AUTH_ANALYTICS=false
```

### Auth Configuration

The system uses `lib/auth-config.ts` for centralized configuration:

```typescript
export interface AuthConfig {
  useApiRoutes: boolean;           // Use API routes vs direct Supabase
  enableRateLimiting: boolean;     // Enable rate limiting features
  enableAnalytics: boolean;        // Enable auth analytics tracking
  sessionRefreshBuffer: number;    // Minutes before expiry to refresh
  maxRetries: number;             // Max retry attempts for requests
  retryDelay: number;             // Delay between retries (ms)
  endpoints: {                    // API endpoint paths
    login: string;
    register: string;
    logout: string;
    resetPassword: string;
    session: string;
    refresh: string;
  };
}
```

## API Routes

### POST /api/auth/login

Authenticate user with email and password.

**Request:**
```typescript
{
  email: string;
  password: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  user?: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
  };
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  error?: string;
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid input
- `401`: Invalid credentials
- `500`: Server error

### POST /api/auth/register

Register a new user account.

**Request:**
```typescript
{
  name: string;
  email: string;
  password: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  };
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  message?: string;
  error?: string;
}
```

**Status Codes:**
- `200`: Success (may require email confirmation)
- `400`: Invalid input or validation error
- `409`: User already exists
- `500`: Server error

### POST /api/auth/logout

Sign out the current user.

**Request:** No body required

**Response:**
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

### POST /api/auth/reset-password

Request password reset email.

**Request:**
```typescript
{
  email: string;
  redirectTo?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

### GET /api/auth/session

Get current session information.

**Response:**
```typescript
{
  success: boolean;
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
  };
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  error?: string;
}
```

### POST /api/auth/refresh

Refresh authentication session.

**Request:**
```typescript
{
  refresh_token?: string; // Optional, will use cookies if not provided
}
```

**Response:**
```typescript
{
  success: boolean;
  user?: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
  };
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  error?: string;
}
```

## Frontend Components

### SSRAuthProvider

The main authentication context provider that manages user state and provides auth methods.

```typescript
const { user, session, loading, isAuthenticated, login, register, logout, resetPassword } = useAuth();
```

**Key Features:**
- Server-side rendering support
- Automatic session refresh
- User profile synchronization
- Comprehensive error handling

### Auth Pages

#### Login Page (`app/(auth)/login/page.tsx`)
- Email/password authentication
- Rate limiting warnings
- Password reset functionality
- Redirect handling

#### Register Page (`app/(auth)/register/page.tsx`)
- User registration with validation
- Name, email, password fields
- Terms acceptance
- Email confirmation handling

### AuthAPI Client

Client-side API wrapper for authentication operations:

```typescript
import { authAPI } from '@/lib/auth-api';

// Login
const result = await authAPI.login('user@example.com', 'password');

// Register
const result = await authAPI.register('John Doe', 'user@example.com', 'password');

// Make authenticated requests
const response = await authAPI.authenticatedFetch('/api/polls', {
  method: 'POST',
  body: JSON.stringify(pollData)
}, accessToken);
```

## Security Features

### Rate Limiting

The system implements comprehensive rate limiting to prevent abuse:

- **Login Attempts**: Track failed login attempts per email
- **Registration**: Limit account creation attempts
- **Password Reset**: Prevent reset request flooding
- **Progressive Delays**: Increasing delays after repeated failures

Rate limiting is managed by `lib/rate-limit-utils.ts` with features:
- Local storage tracking
- Smart recovery suggestions
- Browser auth state clearing
- Detailed error analysis

### Input Validation

All authentication endpoints include comprehensive validation:

- **Email**: Format validation and normalization
- **Password**: Strength requirements and length limits
- **Name**: Length limits and sanitization
- **Redirect URLs**: Origin validation for security

### Session Management

- **Automatic Refresh**: Sessions refresh before expiration
- **Secure Cookies**: HttpOnly, Secure, SameSite settings
- **Token Rotation**: Refresh tokens rotate on use
- **Timeout Handling**: Graceful handling of auth timeouts

## Usage Examples

### Basic Authentication

```typescript
// Login
try {
  await login('user@example.com', 'password');
  router.push('/dashboard');
} catch (error) {
  setError(error.message);
}

// Register
try {
  await register('John Doe', 'user@example.com', 'securePassword123');
  // Handle email confirmation if required
} catch (error) {
  setError(error.message);
}

// Logout
try {
  await logout();
  router.push('/');
} catch (error) {
  console.error('Logout failed:', error);
}
```

### Making Authenticated Requests

```typescript
import { getAuthToken } from '@/components/auth/ssr-auth-provider';

const token = await getAuthToken();
const response = await fetch('/api/polls', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(pollData)
});
```

### Using AuthAPI Client

```typescript
import { authAPI, isSessionExpired } from '@/lib/auth-api';

// Check if session needs refresh
if (session && isSessionExpired(session)) {
  const refreshResult = await authAPI.refreshSession();
  if (!refreshResult.success) {
    // Handle refresh failure - redirect to login
  }
}

// Make authenticated request with auto-retry
const response = await authAPI.authenticatedFetch('/api/user/profile', {
  method: 'GET'
}, session.access_token);
```

## Troubleshooting

### Common Issues

#### "Too many requests" Error
- **Cause**: Rate limiting triggered
- **Solution**: Wait the specified time or use password reset
- **Prevention**: Implement proper form validation

#### Session Expired
- **Cause**: Token has expired and refresh failed
- **Solution**: Redirect user to login page
- **Check**: Network connectivity and Supabase status

#### Email Not Confirmed
- **Cause**: User hasn't confirmed email after registration
- **Solution**: Resend confirmation email or check spam folder
- **Note**: Some setups auto-confirm emails

#### User Profile Not Created
- **Cause**: Database insert failed during registration
- **Solution**: Check database permissions and constraints
- **Debug**: Check server logs for detailed error

### Debug Mode

Enable debug logging in development:

```typescript
import { getAuthConfigDebugInfo } from '@/lib/auth-config';

if (process.env.NODE_ENV === 'development') {
  console.log('Auth Debug Info:', getAuthConfigDebugInfo());
}
```

### Error Analysis

The system provides detailed error categorization:

```typescript
import { analyzeRateLimitError } from '@/lib/rate-limit-utils';

const analysis = analyzeRateLimitError(error);
if (analysis.isRateLimited) {
  console.log('Rate limit info:', analysis);
  console.log('Recovery suggestions:', analysis.suggestions);
}
```

## Development Guidelines

### Best Practices

1. **Always validate input** on both client and server
2. **Use TypeScript** for all auth-related code
3. **Handle errors gracefully** with user-friendly messages
4. **Test rate limiting** scenarios in development
5. **Log security events** for monitoring
6. **Validate redirect URLs** to prevent open redirects

### Testing

```bash
# Test authentication flow
npm run test:auth

# Test API routes
npm run test:api

# Test rate limiting
npm run test:rate-limits
```

### Code Organization

```
lib/
├── auth-api.ts           # Client-side API wrapper
├── auth-config.ts        # Configuration management
├── rate-limit-utils.ts   # Rate limiting utilities
└── supabase.ts           # Supabase client setup

app/api/auth/
├── login/route.ts        # Login endpoint
├── register/route.ts     # Registration endpoint
├── logout/route.ts       # Logout endpoint
├── reset-password/route.ts # Password reset endpoint
├── session/route.ts      # Session check endpoint
└── refresh/route.ts      # Token refresh endpoint

components/auth/
└── ssr-auth-provider.tsx # Main auth provider

app/(auth)/
├── login/page.tsx        # Login page
└── register/page.tsx     # Registration page
```

### Performance Considerations

- **Lazy Loading**: Auth components load only when needed
- **Caching**: Session data cached appropriately
- **Debouncing**: Input validation debounced to reduce requests
- **Timeout Handling**: All auth operations have reasonable timeouts

### Monitoring

Key metrics to monitor:

- Authentication success/failure rates
- Session refresh frequency
- Rate limiting trigger frequency
- API response times
- Error distribution by type

This authentication system provides a robust, secure, and user-friendly foundation for the polling application with comprehensive error handling, security features, and development tools.