import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

interface RegisterResponse {
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

export async function POST(
  request: NextRequest,
): Promise<NextResponse<RegisterResponse>> {
  try {
    const { name, email, password }: RegisterRequest = await request.json();

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Name, email, and password are required",
        },
        { status: 400 },
      );
    }

    // Validate name
    const trimmedName = name.trim();
    if (trimmedName.length < 1) {
      return NextResponse.json(
        {
          success: false,
          error: "Name must be at least 1 character long",
        },
        { status: 400 },
      );
    }

    if (trimmedName.length > 50) {
      return NextResponse.json(
        {
          success: false,
          error: "Name must be less than 50 characters",
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

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 6 characters long",
        },
        { status: 400 },
      );
    }

    // Additional password validation
    if (password.length > 72) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be less than 72 characters",
        },
        { status: 400 },
      );
    }

    console.log("Registration attempt for:", email.trim());

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.trim())
      .single();

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "An account with this email already exists",
        },
        { status: 409 },
      );
    }

    // Attempt to sign up
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: trimmedName,
          name: trimmedName,
        },
      },
    });

    if (error) {
      console.error("Registration error:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        code: error.code,
        details: error.details,
      });

      // Provide user-friendly error messages
      let errorMessage = "Failed to create account";

      if (error.message.includes("User already registered")) {
        errorMessage = "An account with this email already exists";
      } else if (error.message.includes("Password should be at least")) {
        errorMessage = "Password must be at least 6 characters long";
      } else if (
        error.message.includes("Unable to validate email") ||
        (error.message.includes("Email address") &&
          error.message.includes("is invalid"))
      ) {
        errorMessage =
          "Please enter a valid email address from a supported domain (e.g., Gmail, Outlook)";
      } else if (error.message.includes("signup is disabled")) {
        errorMessage = "Registration is currently disabled";
      } else if (
        error.message.includes("Too many requests") ||
        error.message.includes("rate limit") ||
        error.message.includes("Request rate limit reached")
      ) {
        errorMessage =
          "Too many registration attempts. Please wait 15-60 minutes before trying again.";
      } else if (error.message.includes("Invalid email")) {
        errorMessage =
          "Please enter a valid email address from a supported domain";
      } else if (error.message.includes("weak password")) {
        errorMessage = "Password is too weak. Please use a stronger password.";
      } else if (error.message.includes("validation_failed")) {
        errorMessage =
          "Registration validation failed. Please check your input.";
      } else if (error.code === "email_address_invalid") {
        errorMessage =
          "Please use a valid email address from a mainstream provider (Gmail, Outlook, etc.)";
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 400 },
      );
    }

    if (!data.user) {
      console.error("Registration failed - no user returned from Supabase");
      console.error("Supabase response data:", data);
      return NextResponse.json(
        {
          success: false,
          error: "Registration failed - no user returned",
        },
        { status: 400 },
      );
    }

    // If email confirmation is required (no session returned)
    if (!data.session) {
      return NextResponse.json({
        success: true,
        message:
          "Please check your email and click the confirmation link to complete registration",
        user: {
          id: data.user.id,
          email: data.user.email!,
          name: trimmedName,
        },
      });
    }

    // If user is immediately signed in (email confirmation disabled)
    try {
      // Create user profile in our users table
      const userData = {
        id: data.user.id,
        name: trimmedName,
        email: data.user.email!,
        avatar:
          data.user.user_metadata?.avatar_url ||
          data.user.user_metadata?.picture ||
          null,
      };

      console.log("Creating user profile:", userData);

      const { error: insertError } = await supabase
        .from("users")
        .insert(userData);

      if (insertError) {
        console.error("Error creating user profile:", insertError);
        console.error("Profile insertion data:", userData);
        // Don't fail registration if profile creation fails
      } else {
        console.log("User profile created successfully for:", trimmedName);
      }
    } catch (profileError) {
      console.error("Unexpected error creating user profile:", profileError);
      // Don't fail registration if profile management fails
    }

    // Return success response with session
    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: data.user.id,
        email: data.user.email!,
        name: trimmedName,
        avatar: data.user.user_metadata?.avatar_url || null,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at || 0,
      },
    });
  } catch (error) {
    console.error("Unexpected registration error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred during registration",
      },
      { status: 500 },
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
