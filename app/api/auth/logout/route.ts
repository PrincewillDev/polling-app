import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

interface LogoutResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<LogoutResponse>> {
  try {
    // Get current session to verify user is logged in
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Error getting session during logout:", sessionError);
    }

    // Attempt to sign out (this will work even if session is invalid)
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);

      // Provide user-friendly error messages
      let errorMessage = "Failed to logout";

      if (error.message.includes("Invalid session")) {
        // User is already logged out, treat as success
        return NextResponse.json({
          success: true,
          message: "Successfully logged out",
        });
      } else if (error.message.includes("Network")) {
        errorMessage = "Network error during logout. Please try again.";
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 400 },
      );
    }

    // Log successful logout
    if (session?.user?.email) {
      console.log("User logged out successfully:", session.user.email);
    }

    return NextResponse.json({
      success: true,
      message: "Successfully logged out",
    });
  } catch (error) {
    console.error("Unexpected logout error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred during logout",
      },
      { status: 500 },
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
