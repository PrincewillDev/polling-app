"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, AuthError, Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
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

const ClientAuthContext = createContext<AuthContextType>({
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

interface ClientAuthProviderProps {
  children: React.ReactNode;
}

export const ClientAuthFallback = ({ children }: ClientAuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      try {
        // Always use getUser() to verify authenticity instead of getSession()
        const {
          data: { user: authenticatedUser },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Error getting authenticated user:", userError);
          if (mounted) {
            setUser(null);
            setSession(null);
            setLoading(false);
          }
          return;
        }

        // Only get session if we have an authenticated user
        let currentSession = null;
        if (authenticatedUser) {
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();
          if (!sessionError && session) {
            currentSession = session;
          }
        }

        if (mounted) {
          setUser(authenticatedUser);
          setSession(currentSession);
        }
      } catch (error) {
        console.error("Unexpected error getting session:", error);
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
      console.log(
        "Auth state changed (fallback):",
        event,
        currentSession?.user?.email,
      );

      // Always verify user authenticity with getUser() instead of using session.user
      let authenticatedUser: User | null = null;
      if (currentSession) {
        const {
          data: { user: fetchedUser },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) {
          console.error(
            "Error authenticating user on auth state change:",
            userError,
          );
        } else {
          authenticatedUser = fetchedUser;
        }
      }

      if (mounted) {
        setUser(authenticatedUser);
        setSession(currentSession);
        setLoading(false);
      }

      // Handle user profile creation/update
      if (event === "SIGNED_IN" && authenticatedUser) {
        // Could add ensureUserProfile here if needed
      }

      // Refresh router on auth changes
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        router.refresh();
      }
    });

    getSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

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
          "Too many login attempts. Please wait 15-60 minutes before trying again.";
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

      if (!data.user?.email_confirmed_at) {
        throw new Error(
          "Please check your email and click the confirmation link to complete registration",
        );
      }
    } catch (error) {
      const authError = error as AuthError;
      console.error("Registration error:", authError);

      let errorMessage = "Failed to create account";

      if (authError.message.includes("User already registered")) {
        errorMessage = "An account with this email already exists";
      } else if (authError.message.includes("Password should be at least")) {
        errorMessage = "Password must be at least 6 characters long";
      } else if (authError.message.includes("Unable to validate email")) {
        errorMessage = "Please enter a valid email address";
      }

      throw new Error(errorMessage);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Logout error:", error);
      throw new Error("Failed to logout");
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
    } catch (error) {
      const authError = error as AuthError;
      console.error("Password reset error:", authError);

      let errorMessage = "Failed to send reset email";

      if (authError.message.includes("Unable to validate email")) {
        errorMessage = "Please enter a valid email address";
      } else if (
        authError.message.includes("Too many requests") ||
        authError.message.includes("rate limit")
      ) {
        errorMessage =
          "Too many reset attempts. Please wait before trying again.";
      }

      throw new Error(errorMessage);
    }
  };

  // Update user function
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

  return (
    <ClientAuthContext.Provider value={value}>
      {children}
    </ClientAuthContext.Provider>
  );
};

export const useClientAuth = () => {
  const context = useContext(ClientAuthContext);

  if (context === undefined) {
    throw new Error("useClientAuth must be used within a ClientAuthFallback");
  }

  return context;
};
