import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

interface ResetPasswordRequest {
  email: string;
  redirectTo?: string;
}

interface ResetPasswordResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ResetPasswordResponse>> {
  try {
    const { email, redirectTo }: ResetPasswordRequest = await request.json();

    // Validate input
    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is required",
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

    // Get the origin from the request headers
    const origin = request.headers.get("origin") || "http://localhost:3000";

    // Set default redirect URL
    const defaultRedirectTo = `${origin}/reset-password`;
    const finalRedirectTo = redirectTo || defaultRedirectTo;

    // Validate redirect URL is from same origin for security
    try {
      const redirectUrl = new URL(finalRedirectTo);
      const originUrl = new URL(origin);

      if (redirectUrl.origin !== originUrl.origin) {
        console.warn("Invalid redirect URL origin:", finalRedirectTo);
        return NextResponse.json(
          {
            success: false,
            error: "Invalid redirect URL",
          },
          { status: 400 },
        );
      }
    } catch (urlError) {
      console.error("Invalid URL format:", finalRedirectTo);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid redirect URL format",
        },
        { status: 400 },
      );
    }

    // Attempt to send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: finalRedirectTo,
    });

    if (error) {
      console.error("Password reset error:", error);

      // Provide user-friendly error messages
      let errorMessage = "Failed to send reset email";

      if (error.message.includes("Unable to validate email")) {
        errorMessage = "Please enter a valid email address";
      } else if (
        error.message.includes("Too many requests") ||
        error.message.includes("rate limit") ||
        error.message.includes("Request rate limit reached")
      ) {
        errorMessage =
          "Too many reset attempts. Please wait before trying again.";
      } else if (error.message.includes("User not found")) {
        // For security, we don't reveal if user exists or not
        // But we'll still return success to prevent user enumeration
        console.log(
          "Password reset attempted for non-existent user:",
          email.trim(),
        );
        return NextResponse.json({
          success: true,
          message:
            "If this email exists in our system, you'll receive a reset link shortly",
        });
      } else if (error.message.includes("Invalid email")) {
        errorMessage = "Please enter a valid email address";
      } else if (error.message.includes("signup is disabled")) {
        errorMessage = "Password reset is currently unavailable";
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 400 },
      );
    }

    // Log successful reset request (without revealing if email exists)
    console.log("Password reset requested for email:", email.trim());

    return NextResponse.json({
      success: true,
      message:
        "If this email exists in our system, you'll receive a reset link shortly",
    });
  } catch (error) {
    console.error("Unexpected password reset error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred while processing your request",
      },
      { status: 500 },
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
