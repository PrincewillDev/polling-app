"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User, AuthError } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateUser: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
        } else {
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error("Unexpected error getting session:", error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email);

      setUser(session?.user ?? null);
      setLoading(false);

      // Handle user profile creation/update
      if (event === "SIGNED_IN" && session?.user) {
        await ensureUserProfile(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Ensure user profile exists in our users table
  const ensureUserProfile = async (user: User) => {
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

        const { error: insertError } = await supabase
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
  };

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
      } else if (authError.message.includes("Too many requests")) {
        errorMessage = "Too many login attempts. Please try again later";
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

      // User state will be updated via onAuthStateChange
    } catch (error) {
      console.error("Logout error:", error);
      throw new Error("Failed to logout");
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
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
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
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Error getting session token:", error);
      return null;
    }

    return session?.access_token || null;
  } catch (error) {
    console.error("Unexpected error getting auth token:", error);
    return null;
  }
};
