import { AuthSession, User, LoginCredentials, RegisterCredentials } from './types';

// Mock data for development - replace with actual auth service
const MOCK_USERS: User[] = [
  {
    id: '1',
    email: 'demo@example.com',
    username: 'demo',
    displayName: 'Demo User',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// Session storage key
const SESSION_STORAGE_KEY = 'polling_app_session';

/**
 * Get the current authentication session
 */
export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionData) return null;

    const session: AuthSession = JSON.parse(sessionData);

    // Check if session is expired
    if (new Date() > new Date(session.expiresAt)) {
      clearSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Set the authentication session
 */
export function setSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Error setting session:', error);
  }
}

/**
 * Clear the authentication session
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing session:', error);
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getSession() !== null;
}

/**
 * Get current user
 */
export function getCurrentUser(): User | null {
  const session = getSession();
  return session?.user || null;
}

/**
 * Mock login function - replace with actual authentication
 */
export async function login(credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Mock validation
  const user = MOCK_USERS.find(u => u.email === credentials.email);

  if (!user || credentials.password !== 'password') {
    return { success: false, error: 'Invalid email or password' };
  }

  // Create session
  const session: AuthSession = {
    user,
    token: `mock_token_${user.id}_${Date.now()}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  };

  setSession(session);
  return { success: true };
}

/**
 * Mock register function - replace with actual authentication
 */
export async function register(credentials: RegisterCredentials): Promise<{ success: boolean; error?: string }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Mock validation
  if (credentials.password !== credentials.confirmPassword) {
    return { success: false, error: 'Passwords do not match' };
  }

  if (MOCK_USERS.some(u => u.email === credentials.email)) {
    return { success: false, error: 'Email already exists' };
  }

  if (MOCK_USERS.some(u => u.username === credentials.username)) {
    return { success: false, error: 'Username already exists' };
  }

  // Create new user
  const newUser: User = {
    id: String(MOCK_USERS.length + 1),
    email: credentials.email,
    username: credentials.username,
    displayName: credentials.displayName,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  MOCK_USERS.push(newUser);

  // Create session
  const session: AuthSession = {
    user: newUser,
    token: `mock_token_${newUser.id}_${Date.now()}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  };

  setSession(session);
  return { success: true };
}

/**
 * Logout function
 */
export async function logout(): Promise<void> {
  clearSession();

  // Redirect to home page if on client side
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
}

/**
 * Validate authentication token
 */
export function validateToken(token: string): boolean {
  // Mock validation - replace with actual token validation
  return token.startsWith('mock_token_');
}

/**
 * Refresh authentication session
 */
export async function refreshSession(): Promise<boolean> {
  const session = getSession();
  if (!session) return false;

  try {
    // Mock refresh - replace with actual API call
    const newSession: AuthSession = {
      ...session,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    setSession(newSession);
    return true;
  } catch (error) {
    console.error('Error refreshing session:', error);
    clearSession();
    return false;
  }
}

/**
 * Password validation helper
 */
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Email validation helper
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Username validation helper
 */
export function validateUsername(username: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (username.length < 3) {
    errors.push('Username must be at least 3 characters long');
  }

  if (username.length > 20) {
    errors.push('Username must be no more than 20 characters long');
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, underscores, and hyphens');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
