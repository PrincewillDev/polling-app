import { createClient } from "@/lib/supabase/client";
import { Session, User, AuthError } from "@supabase/supabase-js";

interface SessionState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  lastRefresh: number;
}

interface SessionManagerEvents {
  "session-changed": (session: Session | null) => void;
  "session-expired": () => void;
  "refresh-failed": (error: AuthError) => void;
  "auth-error": (error: AuthError) => void;
}

class SessionManager {
  private supabase = createClient();
  private state: SessionState = {
    session: null,
    user: null,
    loading: true,
    error: null,
    lastRefresh: 0,
  };
  private listeners = new Map<
    keyof SessionManagerEvents,
    Set<SessionManagerEvents[keyof SessionManagerEvents]>
  >();
  private refreshPromise: Promise<Session | null> | null = null;
  private refreshTimeout: NodeJS.Timeout | null = null;
  private initialized = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.initialize();
    }
  }

  /**
   * Initialize session manager
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.initialized = true;

      // Get initial session
      await this.loadSession();

      // Listen for auth state changes
      this.supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`Auth state changed: ${event}`);

        let user: User | null = null;
        if (session) {
          const {
            data: { user: authenticatedUser },
            error: userError,
          } = await this.supabase.auth.getUser();
          if (userError) {
            console.warn(
              "Failed to authenticate user on auth state change:",
              userError.message,
            );
            // Handle error, maybe sign out or set user to null
          } else {
            user = authenticatedUser;
          }
        }

        if (event === "SIGNED_OUT") {
          this.updateState({ session: null, user: null });
          this.emit("session-changed", null);
        } else if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
          this.updateState({ session, user });
          if (session) {
            this.scheduleRefresh(session);
          }
          this.emit("session-changed", session);
        }
      });
    } catch (error) {
      console.error("Session manager initialization failed:", error);
      this.updateState({
        loading: false,
        error: error instanceof Error ? error.message : "Initialization failed",
      });
    }
  }

  /**
   * Load current session
   */
  private async loadSession(): Promise<Session | null> {
    try {
      this.updateState({ loading: true, error: null });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      // Always verify user authenticity first
      const {
        data: { user: authenticatedUser },
        error: userError,
      } = await this.supabase.auth.getUser();
      clearTimeout(timeout);

      if (userError || !authenticatedUser) {
        console.warn("User not authenticated:", userError?.message);
        this.updateState({
          session: null,
          user: null,
          loading: false,
          error: userError?.message || "User not authenticated",
        });
        return null;
      }

      // Only get session if we have an authenticated user
      const {
        data: { session },
        error: sessionError,
      } = await this.supabase.auth.getSession();

      if (sessionError) {
        console.warn("Failed to load session:", sessionError.message);
        this.handleAuthError(sessionError);
        this.updateState({ loading: false, error: sessionError.message });
        return null;
      }

      this.updateState({
        session,
        user: authenticatedUser,
        loading: false,
        error: null,
      });

      if (session) {
        this.scheduleRefresh(session);
      }

      return session;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load session";
      console.error("Session load error:", message);
      this.updateState({ loading: false, error: message });
      return null;
    }
  }

  /**
   * Refresh session token
   */
  async refreshSession(forceRefresh = false): Promise<Session | null> {
    // Prevent multiple concurrent refresh attempts
    if (this.refreshPromise && !forceRefresh) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh();
    const result = await this.refreshPromise;
    this.refreshPromise = null;

    return result;
  }

  /**
   * Perform actual session refresh
   */
  private async performRefresh(): Promise<Session | null> {
    try {
      console.log("Refreshing session...");
      this.state.lastRefresh = Date.now();

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const {
        data: { session },
        error,
      } = await this.supabase.auth.refreshSession();
      clearTimeout(timeout);

      if (error) {
        console.warn("Session refresh failed:", error.message);
        this.handleRefreshError(error);
        return null;
      }

      if (session) {
        this.updateState({
          session,
          user: session.user,
          error: null,
        });
        this.scheduleRefresh(session);
        this.emit("session-changed", session);
        console.log("Session refreshed successfully");
      } else {
        console.warn("No session returned from refresh");
        await this.signOut();
      }

      return session;
    } catch (error) {
      const authError = error as AuthError;
      console.error("Session refresh error:", authError);
      this.handleRefreshError(authError);
      return null;
    }
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleRefresh(session: Session): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    if (!session.expires_at) {
      console.warn("Session has no expiration time");
      return;
    }

    // Refresh 5 minutes before expiration
    const expiresAt = session.expires_at * 1000;
    const refreshAt = expiresAt - 5 * 60 * 1000;
    const now = Date.now();
    const delay = Math.max(0, refreshAt - now);

    console.log(`Scheduling refresh in ${Math.round(delay / 1000)} seconds`);

    this.refreshTimeout = setTimeout(async () => {
      if (this.isSessionValid()) {
        await this.refreshSession();
      }
    }, delay);
  }

  /**
   * Check if current session is valid
   */
  isSessionValid(): boolean {
    const { session } = this.state;
    if (!session || !session.expires_at) return false;

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at;

    return now < expiresAt;
  }

  /**
   * Check if session is expiring soon (within 10 minutes)
   */
  isSessionExpiringSoon(): boolean {
    const { session } = this.state;
    if (!session || !session.expires_at) return false;

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at;
    const tenMinutes = 10 * 60;

    return expiresAt - now < tenMinutes;
  }

  /**
   * Get access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    let { session } = this.state;

    // If no session, try to load it
    if (!session) {
      session = await this.loadSession();
    }

    if (!session) {
      return null;
    }

    // If session is expired or expiring soon, refresh it
    if (!this.isSessionValid() || this.isSessionExpiringSoon()) {
      session = await this.refreshSession();
    }

    return session?.access_token || null;
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<void> {
    try {
      if (this.refreshTimeout) {
        clearTimeout(this.refreshTimeout);
        this.refreshTimeout = null;
      }

      await this.supabase.auth.signOut();

      this.updateState({
        session: null,
        user: null,
        error: null,
        loading: false,
      });

      this.emit("session-changed", null);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: AuthError): void {
    this.emit("auth-error", error);

    // Handle specific error types
    if (error.message.includes("refresh") || error.message.includes("token")) {
      this.emit("session-expired");
    }
  }

  /**
   * Handle refresh errors
   */
  private handleRefreshError(error: AuthError): void {
    this.emit("refresh-failed", error);

    // If refresh fails due to invalid token, sign out
    if (
      error.message.includes("refresh") ||
      error.message.includes("invalid")
    ) {
      this.signOut();
    }
  }

  /**
   * Update internal state
   */
  private updateState(updates: Partial<SessionState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Get current state
   */
  getState(): SessionState {
    return { ...this.state };
  }

  /**
   * Get current session
   */
  getSession(): Session | null {
    return this.state.session;
  }

  /**
   * Get current user
   */
  getUser(): User | null {
    return this.state.user;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.state.session?.user && this.isSessionValid();
  }

  /**
   * Add event listener
   */
  on<K extends keyof SessionManagerEvents>(
    event: K,
    listener: SessionManagerEvents[K],
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof SessionManagerEvents>(
    event: K,
    listener: SessionManagerEvents[K],
  ): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit event
   */
  private emit<K extends keyof SessionManagerEvents>(
    event: K,
    ...args: Parameters<SessionManagerEvents[K]>
  ): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          (listener as (...args: unknown[]) => void)(...args);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
    this.listeners.clear();
    this.refreshPromise = null;
    this.initialized = false;
  }

  /**
   * Get session statistics for debugging
   */
  getDebugInfo(): {
    hasSession: boolean;
    isValid: boolean;
    expiringSoon: boolean;
    expiresAt: string | null;
    timeUntilExpiry: number | null;
    lastRefresh: string | null;
    loading: boolean;
    error: string | null;
  } {
    const { session, loading, error, lastRefresh } = this.state;

    return {
      hasSession: !!session,
      isValid: this.isSessionValid(),
      expiringSoon: this.isSessionExpiringSoon(),
      expiresAt: session?.expires_at
        ? new Date(session.expires_at * 1000).toISOString()
        : null,
      timeUntilExpiry: session?.expires_at
        ? Math.max(0, session.expires_at * 1000 - Date.now())
        : null,
      lastRefresh: lastRefresh ? new Date(lastRefresh).toISOString() : null,
      loading,
      error,
    };
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

// Export class for testing
export { SessionManager };

// Convenience functions that use the singleton
export const getAccessToken = () => sessionManager.getAccessToken();
export const getCurrentSession = () => sessionManager.getSession();
export const getCurrentUser = () => sessionManager.getUser();
export const isAuthenticated = () => sessionManager.isAuthenticated();
export const refreshSession = () => sessionManager.refreshSession();
export const signOut = () => sessionManager.signOut();
export const getSessionDebugInfo = () => sessionManager.getDebugInfo();

// Hook for React components
export function useSessionManager() {
  if (typeof React === "undefined" || !React) {
    throw new Error(
      "React is not available. Make sure React is installed to use this hook.",
    );
  }
  const [state, setState] = React.useState(sessionManager.getState());

  React.useEffect(() => {
    const handleSessionChange = () => {
      setState(sessionManager.getState());
    };

    sessionManager.on("session-changed", handleSessionChange);
    sessionManager.on("session-expired", handleSessionChange);
    sessionManager.on("auth-error", handleSessionChange);

    return () => {
      sessionManager.off("session-changed", handleSessionChange);
      sessionManager.off("session-expired", handleSessionChange);
      sessionManager.off("auth-error", handleSessionChange);
    };
  }, []);

  return {
    ...state,
    refreshSession: () => sessionManager.refreshSession(),
    signOut: () => sessionManager.signOut(),
    getAccessToken: () => sessionManager.getAccessToken(),
    isAuthenticated: () => sessionManager.isAuthenticated(),
    debugInfo: sessionManager.getDebugInfo(),
  };
}

// React import check
let React: typeof import("react") | undefined;
if (typeof window !== "undefined") {
  try {
    // Dynamic import for React in browser environment
    React = (globalThis as { React?: typeof import("react") }).React;
    if (!React) {
      // Fallback - this will be handled at runtime
      React = undefined;
    }
  } catch {
    // React not available, hook will not work
    React = undefined;
  }
}
