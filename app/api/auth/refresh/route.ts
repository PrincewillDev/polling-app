import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

interface RefreshRequest {
  refresh_token?: string;
}

interface RefreshResponse {
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
): Promise<NextResponse<RefreshResponse>> {
  try {
    // Try to get refresh token from request body or existing session
    let refreshToken: string | undefined;

    try {
      const body: RefreshRequest = await request.json();
      refreshToken = body.refresh_token;
    } catch {
      // No body or invalid JSON, that's OK
    }

    // If no refresh token provided, try to get current session
    if (!refreshToken) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      refreshToken = session?.refresh_token;
    }

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: "No refresh token available",
        },
        { status: 401 },
      );
    }

    // Attempt to refresh the session
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      console.error("Token refresh error:", error);

      let errorMessage = "Failed to refresh session";

      if (error.message.includes("Invalid refresh token")) {
        errorMessage = "Session expired. Please login again.";
      } else if (error.message.includes("refresh_token_not_found")) {
        errorMessage = "Session expired. Please login again.";
      } else if (error.message.includes("Token has expired")) {
        errorMessage = "Session expired. Please login again.";
      } else if (
        error.message.includes("Too many requests") ||
        error.message.includes("rate limit")
      ) {
        errorMessage =
          "Too many refresh attempts. Please wait before trying again.";
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 401 },
      );
    }

    if (!data.session) { // Only check for session, user will be authenticated separately
      return NextResponse.json(
        {
          success: false,
          error: "Failed to refresh session - no session returned",
        },
        { status: 401 },
      );
    }

    // Get authenticated user to ensure authenticity
    const { data: { user: authenticatedUser }, error: userError } = await supabase.auth.getUser();

    if (userError || !authenticatedUser) {
      console.error("User authentication failed after refresh:", userError);
      return NextResponse.json({
        success: false,
        error: "Authentication failed after session refresh",
      }, { status: 401 });
    }

    // Get user profile data from our users table
    let userProfile = null;
    try {
      const { data: profile } = await supabase
        .from("users")
        .select("name, avatar")
        .eq("id", authenticatedUser.id) // Use authenticatedUser.id
        .single();

      userProfile = profile;
    } catch (profileError) {
      console.error(
        "Error fetching user profile during refresh:",
        profileError,
      );
      // Continue without profile data
    }

    // Return refreshed session with authenticated user data
    return NextResponse.json({
      success: true,
      user: {
        id: authenticatedUser.id,
        email: authenticatedUser.email!,
        name: userProfile?.name || authenticatedUser.user_metadata?.name || "User",
        avatar:
          userProfile?.avatar || authenticatedUser.user_metadata?.avatar_url || null,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at || 0,
      },
    });
  } catch (error) {
    console.error("Unexpected token refresh error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred while refreshing session",
      },
      { status: 500 },
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
