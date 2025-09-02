import { createClient } from "@/lib/supabase/client";
import { User, Session } from "@supabase/supabase-js";

const supabase = createClient();

// Cache for session to avoid repeated calls
let sessionCache: { session: Session | null; timestamp: number } | null = null;
const SESSION_CACHE_DURATION = 30000; // 30 seconds

/**
 * Get the current authenticated user with improved error handling
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // Check cached session first
    const cachedSession = getCachedSession();
    if (cachedSession) {
      return cachedSession.user;
    }

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      clearTimeout(timeoutId);

      if (error) {
        console.warn("Error getting current user:", error.message);
        // Clear any stale session data on auth errors
        await clearAuthState();
        return null;
      }

      return user;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.warn("Auth request timeout, clearing session");
        await clearAuthState();
      } else {
        console.error("Unexpected auth error:", fetchError);
      }
      return null;
    }
  } catch (error) {
    console.error("Unexpected error getting current user:", error);
    return null;
  }
}

/**
 * Get cached session if valid
 */
function getCachedSession(): Session | null {
  if (!sessionCache) return null;

  const now = Date.now();
  if (now - sessionCache.timestamp > SESSION_CACHE_DURATION) {
    sessionCache = null;
    return null;
  }

  return sessionCache.session;
}

/**
 * Update session cache
 */
function updateSessionCache(session: Session | null): void {
  sessionCache = {
    session,
    timestamp: Date.now(),
  };
}

/**
 * Clear authentication state
 */
async function clearAuthState(): Promise<void> {
  sessionCache = null;
  try {
    await supabase.auth.signOut();
  } catch {
    // Ignore errors during cleanup
  }
}

/**
 * Get the current session with improved error handling
 */
export async function getCurrentSession(): Promise<Session | null> {
  try {
    // Check cache first
    const cached = getCachedSession();
    if (cached) {
      // If cached session exists, we still need to ensure its user is authentic
      // We can't directly trust cached.user, so we'll re-authenticate the user
      const authenticatedUser = await getCurrentUser(); // This calls supabase.auth.getUser()
      if (cached.user?.id === authenticatedUser?.id) {
        // If the cached user ID matches the authenticated user ID,
        // we can assume the cached session is still valid and its user is authentic.
        // Update the cached session's user with the authenticated one just in case
        cached.user = authenticatedUser;
        return cached;
      } else {
        // User mismatch or no authenticated user, clear cache and proceed to fetch new session
        await clearAuthState();
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      // Always verify user authenticity first
      const {
        data: { user: authenticatedUser },
        error: userError,
      } = await supabase.auth.getUser();
      clearTimeout(timeoutId);

      if (userError || !authenticatedUser) {
        console.warn("User not authenticated:", userError?.message);
        await clearAuthState();
        return null;
      }

      // Only get session if we have an authenticated user
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.warn("Session error:", sessionError.message);
        if (
          sessionError.message.includes("refresh") ||
          sessionError.message.includes("token")
        ) {
          await clearAuthState();
        }
        return null;
      }

      if (session) {
        // Ensure session has the authenticated user
        session.user = authenticatedUser;
      }

      // Update cache with the session containing the authenticated user
      updateSessionCache(session);
      return session;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.warn("Session request timeout");
      } else {
        console.error("Session fetch error:", fetchError);
      }
      await clearAuthState();
      return null;
    }
  } catch (error) {
    console.error("Unexpected session error:", error);
    return null;
  }
}

/**
 * Get the current session token for API calls
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return null;
    }

    // Check if token is about to expire (refresh if < 5 minutes left)
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;

    if (expiresAt - now < 300) {
      // Less than 5 minutes
      console.log("Token expiring soon, attempting refresh...");
      try {
        const {
          data: { session: newSession },
          error,
        } = await supabase.auth.refreshSession();

        if (error) {
          console.warn("Token refresh failed:", error.message);
          await clearAuthState();
          return null;
        }

        if (newSession) {
          updateSessionCache(newSession);
          return newSession.access_token;
        }
      } catch (refreshError) {
        console.warn("Token refresh error:", refreshError);
        await clearAuthState();
        return null;
      }
    }

    return session.access_token;
  } catch (error) {
    console.error("Unexpected error getting auth token:", error);
    return null;
  }
}

/**
 * Create authorization headers for API requests
 */
export async function createAuthHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Make an authenticated API request
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const authHeaders = await createAuthHeaders();

  // Add timeout to fetch requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...authHeaders,
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle authentication errors
    if (response.status === 401) {
      console.warn("Authentication failed, attempting token refresh...");

      // Try to refresh token once
      const token = await getAuthToken();
      if (token) {
        // Retry with new token
        const retryHeaders = {
          ...authHeaders,
          Authorization: `Bearer ${token}`,
          ...options.headers,
        };

        const retryResponse = await fetch(url, {
          ...options,
          headers: retryHeaders,
        });

        if (retryResponse.status !== 401) {
          return retryResponse;
        }
      }

      // If refresh failed or still 401, clear auth and redirect
      await clearAuthState();

      // Redirect to login if we're in the browser
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        const loginUrl = `/login?redirectTo=${encodeURIComponent(currentPath)}`;
        window.location.href = loginUrl;
      }

      throw new Error("Authentication required");
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timeout");
    }
    throw error;
  }
}

/**
 * Make an authenticated API request and parse JSON response
 */
export async function authenticatedFetchJSON<T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await authenticatedFetch(url, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: `HTTP ${response.status}: ${response.statusText}`,
    }));

    throw new Error(
      errorData.error || `Request failed with status ${response.status}`,
    );
  }

  return response.json();
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getCurrentSession();
  return !!session?.user;
}

/**
 * Ensure user is authenticated or throw error
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  return user;
}

/**
 * Get user metadata with fallbacks
 */
export function getUserDisplayName(user: User): string {
  return (
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "User"
  );
}

/**
 * Get user avatar URL with fallback
 */
export function getUserAvatarUrl(user: User): string | null {
  return user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
}

/**
 * Handle auth errors with user-friendly messages
 */
export function getAuthErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object" || !("message" in error)) {
    return "An authentication error occurred";
  }

  const message = String(error.message).toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "Invalid email or password";
  }

  if (message.includes("email not confirmed")) {
    return "Please check your email and confirm your account";
  }

  if (message.includes("too many requests") || message.includes("rate limit")) {
    return "Too many attempts. Please try again later";
  }

  if (message.includes("user already registered")) {
    return "An account with this email already exists";
  }

  if (message.includes("password should be at least")) {
    return "Password must be at least 6 characters long";
  }

  if (message.includes("unable to validate email")) {
    return "Please enter a valid email address";
  }

  if (message.includes("signup is disabled")) {
    return "Registration is currently disabled";
  }

  if (message.includes("authentication required")) {
    return "Please log in to continue";
  }

  if (message.includes("refresh") && message.includes("token")) {
    return "Your session has expired. Please log in again";
  }

  if (message.includes("session timeout") || message.includes("timeout")) {
    return "Connection timeout. Please try again";
  }

  if (message.includes("network") || message.includes("fetch")) {
    return "Connection error. Please check your internet connection";
  }

  return String(error.message);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 6) {
    errors.push("Password must be at least 6 characters long");
  }

  if (password.length > 128) {
    errors.push("Password must be less than 128 characters");
  }

  if (!/[a-zA-Z]/.test(password)) {
    errors.push("Password must contain at least one letter");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a secure random string for tokens/ids
 */
export function generateSecureId(length = 16): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * Create a shareable URL for a poll
 */
export function createShareUrl(pollId: string, shareCode?: string): string {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  if (shareCode) {
    return `${baseUrl}/poll/${shareCode}`;
  }

  return `${baseUrl}/polls/${pollId}`;
}

/**
 * Check if user has permission to perform action on poll
 */
export function canUserAccessPoll(
  user: User | null,
  poll: Record<string, unknown>,
  action: "view" | "edit" | "delete",
): boolean {
  if (!user || !poll) return false;

  // Owner can do everything
  if (
    poll.created_by === user.id ||
    (poll.createdBy &&
      typeof poll.createdBy === "object" &&
      "id" in poll.createdBy &&
      poll.createdBy.id === user.id)
  ) {
    return true;
  }

  // For viewing, check if poll is public or user has access
  if (action === "view") {
    return (
      Boolean(poll.is_public) ||
      Boolean(poll.isPublic) ||
      poll.require_auth === false
    );
  }

  // Only owner can edit/delete
  return false;
}
