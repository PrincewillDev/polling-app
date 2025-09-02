"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { User, AuthError, Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { sessionManager } from "@/lib/session-manager";
import { supabase } from "@/lib/supabase";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
  updateUser: () => {},
});

interface AuthProviderProps {
  children: React.ReactNode;
  initialSession?: Session | null;
}

export const SSRAuthProvider = ({
  children,
  initialSession,
}: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(
    initialSession ?? null,
  );
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Ensure user profile exists in our users table
  const ensureUserProfile = useCallback(async (user: User) => {
    try {
      console.log("Checking user profile for:", user.id, user.email);

      const { error: fetchError } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single();

      if (fetchError && fetchError.code === "PGRST116") {
        // User doesn't exist, create profile
        console.log("Creating user profile with metadata:", user.user_metadata);

        // Ensure we have a valid name
        let userName =
          user.user_metadata?.name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.display_name;

        if (!userName && user.email) {
          userName = user.email.split("@")[0];
        }

        if (!userName) {
          userName = "User";
        }

        // Ensure name is not empty and trim whitespace
        userName = userName.toString().trim();
        if (userName.length === 0) {
          userName = "User";
        }

        const userData = {
          id: user.id,
          name: userName,
          email: user.email!,
          avatar:
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            null,
        };

        console.log("Inserting user profile:", userData);

        const { error: insertError } = await (
          supabase as unknown as {
            from: (table: string) => {
              insert: (data: unknown) => Promise<{ error: unknown }>;
            };
          }
        )
          .from("users")
          .insert(userData);

        if (insertError) {
          console.error("Error creating user profile:", insertError);
          console.error("Failed user data:", userData);
        } else {
          console.log("User profile created successfully for:", userName);
        }
      } else if (fetchError) {
        console.error("Error checking user profile:", fetchError);
      } else {
        console.log("User profile already exists");
      }
    } catch (error) {
      console.error("Unexpected error ensuring user profile:", error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      try {
        // Get session first
        const currentSession = await sessionManager.getSession();

        // Always verify user authenticity with getUser()
        let authenticatedUser: User | null = null;
        if (currentSession) {
          const {
            data: { user: verifiedUser },
            error: userError,
          } = await supabase.auth.getUser();
          if (userError) {
            console.error("Error verifying user:", userError);
          } else {
            authenticatedUser = verifiedUser;
          }
        }

        if (mounted) {
          setSession(currentSession);
          setUser(authenticatedUser);
        }
      } catch (error) {
        console.error("Unexpected error getting session:", error);
        if (mounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("Auth state changed:", event, currentSession?.user?.email);

      // Always verify user authenticity with getUser() instead of using session.user
      let authenticatedUser: User | null = null;
      if (currentSession) {
        const {
          data: { user: verifiedUser },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) {
          console.error(
            "Error verifying user on auth state change:",
            userError,
          );
        } else {
          authenticatedUser = verifiedUser;
        }
      }

      if (mounted) {
        setSession(currentSession);
        setUser(authenticatedUser);
        setLoading(false);
      }

      // Handle user profile creation/update
      if (event === "SIGNED_IN" && authenticatedUser) {
        await ensureUserProfile(authenticatedUser);
      }

      // Handle session expired/refresh errors
      if (event === "TOKEN_REFRESHED" && !currentSession) {
        console.warn("Token refresh failed, signing out");
        await logout();
      }

      // Refresh router on auth changes to update middleware
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        router.refresh();
      }
    });

    // Listen to session manager events for better error handling
    const handleSessionExpired = () => {
      if (mounted) {
        console.warn("Session expired, signing out");
        setSession(null);
        setUser(null);
        router.push("/login");
      }
    };

    const handleRefreshFailed = (error: AuthError) => {
      if (mounted) {
        console.warn("Session refresh failed:", error.message);
        setSession(null);
        setUser(null);
        if (!error.message.includes("not_authenticated")) {
          router.push("/login");
        }
      }
    };

    sessionManager.on("session-expired", handleSessionExpired);
    sessionManager.on("refresh-failed", handleRefreshFailed);

    // Only get session if we don't have initial session
    if (!initialSession) {
      getSession();
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
      sessionManager.off("session-expired", handleSessionExpired);
      sessionManager.off("refresh-failed", handleRefreshFailed);
    };
  }, [initialSession, router, ensureUserProfile]);

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      // User state will be updated via onAuthStateChange
    } catch (error) {
      const authError = error as AuthError;
      console.error("Login error:", authError);

      // Provide user-friendly error messages
      let errorMessage = "Failed to login";

      if (authError.message.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password";
      } else if (authError.message.includes("Email not confirmed")) {
        errorMessage = "Please check your email and confirm your account";
      } else if (
        authError.message.includes("Too many requests") ||
        authError.message.includes("rate limit") ||
        authError.message.includes("Request rate limit reached")
      ) {
        errorMessage =
          "Too many login attempts. Please wait 15-60 minutes before trying again. If you forgot your password, try resetting it instead.";
      } else if (authError.message.includes("signup is disabled")) {
        errorMessage = "Registration is currently disabled";
      } else if (authError.message.includes("Invalid email")) {
        errorMessage = "Please enter a valid email address";
      } else if (
        authError.message.includes("session") ||
        authError.message.includes("timeout")
      ) {
        errorMessage = "Connection timeout. Please try again";
      }

      throw new Error(errorMessage);
    }
  };

  // Register function
  const register = async (
    name: string,
    email: string,
    password: string,
  ): Promise<void> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
            name: name.trim(),
          },
        },
      });

      if (error) {
        throw error;
      }

      // If email confirmation is disabled, user will be signed in immediately
      // Otherwise, they need to confirm their email
      if (!data.user?.email_confirmed_at) {
        // Email confirmation required
        throw new Error(
          "Please check your email and click the confirmation link to complete registration",
        );
      }
    } catch (error) {
      const authError = error as AuthError;
      console.error("Registration error:", authError);

      // Provide user-friendly error messages
      let errorMessage = "Failed to create account";

      if (authError.message.includes("User already registered")) {
        errorMessage = "An account with this email already exists";
      } else if (authError.message.includes("Password should be at least")) {
        errorMessage = "Password must be at least 6 characters long";
      } else if (authError.message.includes("Unable to validate email")) {
        errorMessage = "Please enter a valid email address";
      } else if (authError.message.includes("signup is disabled")) {
        errorMessage = "Registration is currently disabled";
      } else if (
        authError.message.includes("Too many requests") ||
        authError.message.includes("rate limit") ||
        authError.message.includes("Request rate limit reached")
      ) {
        errorMessage =
          "Too many registration attempts. Please wait 15-60 minutes before trying again.";
      }

      throw new Error(errorMessage);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      // Use session manager for better cleanup
      await sessionManager.signOut();

      // Also call supabase signOut as backup
      const { error } = await supabase.auth.signOut();

      if (error && !error.message.includes("not_authenticated")) {
        throw error;
      }

      // User state will be updated via onAuthStateChange
    } catch (error) {
      console.error("Logout error:", error);
      // Don't throw error for logout - always allow user to "logout" client-side
      setSession(null);
      setUser(null);
    }
  };

  // Reset password function
  const resetPassword = async (email: string): Promise<void> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      // Success - no error thrown
    } catch (error) {
      const authError = error as AuthError;
      console.error("Password reset error:", authError);

      let errorMessage = "Failed to send reset email";

      if (authError.message.includes("Unable to validate email")) {
        errorMessage = "Please enter a valid email address";
      } else if (
        authError.message.includes("Too many requests") ||
        authError.message.includes("rate limit") ||
        authError.message.includes("Request rate limit reached")
      ) {
        errorMessage =
          "Too many reset attempts. Please wait before trying again.";
      } else if (authError.message.includes("User not found")) {
        // For security, we don't reveal if user exists or not
        errorMessage = "If this email exists, you'll receive a reset link";
      } else if (
        authError.message.includes("timeout") ||
        authError.message.includes("network")
      ) {
        errorMessage = "Connection timeout. Please try again";
      }

      throw new Error(errorMessage);
    }
  };

  // Update user function (for local state updates)
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    resetPassword,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an SSRAuthProvider");
  }

  return context;
};

// Helper function to get current user (useful for API calls)
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Error getting current user:", error);
      return null;
    }

    return user;
  } catch (error) {
    console.error("Unexpected error getting current user:", error);
    return null;
  }
};

// Helper function to get auth token
export const getAuthToken = async (): Promise<string | null> => {
  try {
    // Use session manager for better error handling and automatic refresh
    return await sessionManager.getAccessToken();
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
};
