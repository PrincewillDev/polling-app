import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
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

export async function POST(
  request: NextRequest,
): Promise<NextResponse<LoginResponse>> {
  try {
    const { email, password }: LoginRequest = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Email and password are required",
        },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid email address",
        },
        { status: 400 },
      );
    }

    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      console.error("Login error:", error);

      // Provide user-friendly error messages
      let errorMessage = "Failed to login";

      if (error.message.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password";
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "Please check your email and confirm your account";
      } else if (
        error.message.includes("Too many requests") ||
        error.message.includes("rate limit") ||
        error.message.includes("Request rate limit reached")
      ) {
        errorMessage =
          "Too many login attempts. Please wait 15-60 minutes before trying again. If you forgot your password, try resetting it instead.";
      } else if (error.message.includes("signup is disabled")) {
        errorMessage = "Registration is currently disabled";
      } else if (error.message.includes("Invalid email")) {
        errorMessage = "Please enter a valid email address";
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 401 },
      );
    }

    if (!data.user || !data.session) {
      return NextResponse.json(
        {
          success: false,
          error: "Login failed - no user or session returned",
        },
        { status: 401 },
      );
    }

    // Ensure user profile exists in our users table
    try {
      const { error: fetchError } = await supabase
        .from("users")
        .select("id")
        .eq("id", data.user.id)
        .single();

      if (fetchError && fetchError.code === "PGRST116") {
        // User doesn't exist, create profile
        console.log(
          "Creating user profile for:",
          data.user.id,
          data.user.email,
        );

        // Ensure we have a valid name
        let userName =
          data.user.user_metadata?.name ||
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.display_name;

        if (!userName && data.user.email) {
          userName = data.user.email.split("@")[0];
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
          id: data.user.id,
          name: userName,
          email: data.user.email!,
          avatar:
            data.user.user_metadata?.avatar_url ||
            data.user.user_metadata?.picture ||
            null,
        };

        const { error: insertError } = await supabase
          .from("users")
          .insert(userData);

        if (insertError) {
          console.error("Error creating user profile:", insertError);
        } else {
          console.log("User profile created successfully for:", userName);
        }
      } else if (fetchError) {
        console.error("Error checking user profile:", fetchError);
      }
    } catch (profileError) {
      console.error("Unexpected error managing user profile:", profileError);
      // Don't fail login if profile management fails
    }

    // Get user profile data
    let userProfile = null;
    try {
      const { data: profile } = await supabase
        .from("users")
        .select("name, avatar")
        .eq("id", data.user.id)
        .single();

      userProfile = profile;
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }

    // Return success response
    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email!,
        name: userProfile?.name || data.user.user_metadata?.name || "User",
        avatar:
          userProfile?.avatar || data.user.user_metadata?.avatar_url || null,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at || 0,
      },
    });
  } catch (error) {
    console.error("Unexpected login error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred during login",
      },
      { status: 500 },
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
