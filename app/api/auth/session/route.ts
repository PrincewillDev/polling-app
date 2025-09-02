import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

interface SessionResponse {
  success: boolean;
  authenticated: boolean;
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

export async function GET(
  request: NextRequest,
): Promise<NextResponse<SessionResponse>> {
  try {
    // Get current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Session check error:", sessionError);
      return NextResponse.json({
        success: true,
        authenticated: false,
        error: "Failed to check session",
      });
    }

    // No session found or no user in session
    if (!session) {
      return NextResponse.json({
        success: true,
        authenticated: false,
      });
    }

    // Get authenticated user to ensure authenticity
    const { data: { user: authenticatedUser }, error: userError } = await supabase.auth.getUser();

    if (userError || !authenticatedUser) {
      console.error("User authentication failed:", userError);
      return NextResponse.json({
        success: true,
        authenticated: false,
        error: "Authentication failed",
      });
    }

    // Get user profile data from our users table using the authenticated user's ID
    let userProfile = null;
    try {
      const { data: profile } = await supabase
        .from("users")
        .select("name, avatar")
        .eq("id", authenticatedUser.id)
        .single();

      userProfile = profile;
    } catch (profileError) {
      console.error("Error fetching user profile:", profileError);
      // Continue without profile data
    }

    // Return session information with authenticated user data
    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: authenticatedUser.id,
        email: authenticatedUser.email!,
        name: userProfile?.name || authenticatedUser.user_metadata?.name || "User",
        avatar:
          userProfile?.avatar || authenticatedUser.user_metadata?.avatar_url || null,
      },
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at || 0,
      },
    });
  } catch (error) {
    console.error("Unexpected session check error:", error);
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        error: "An unexpected error occurred while checking session",
      },
      { status: 500 },
    );
  }
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
