import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { Poll } from "@/types";

// Database row types
interface PollOptionRow {
  id: string;
  text: string;
  order_index: number;
  votes: number;
}

export async function GET(request: NextRequest) {
  try {
    // Get user from authorization header with timeout
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Use admin client for better reliability and add timeout
    const authPromise = supabaseAdmin.auth.getUser(token);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Authentication timeout")), 5000),
    );

    let user;
    try {
      const { data, error: authError } = (await Promise.race([
        authPromise,
        timeoutPromise,
      ])) as any;
      if (authError || !data?.user) {
        return NextResponse.json(
          { success: false, error: "Invalid authentication" },
          { status: 401 },
        );
      }
      user = data.user;
    } catch (error) {
      console.error("Auth timeout or error:", error);
      return NextResponse.json(
        { success: false, error: "Authentication timeout" },
        { status: 401 },
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build query for user's polls using admin client for reliability
    let query = supabaseAdmin
      .from("polls")
      .select(
        `
        id,
        title,
        description,
        status,
        category,
        created_at,
        updated_at,
        end_date,
        created_by,
        allow_multiple_choice,
        require_auth,
        is_anonymous,
        show_results,
        total_votes,
        total_views,
        unique_voters,
        tags,
        is_public,
        share_code,
        poll_options (
          id,
          text,
          order_index,
          votes
        )
      `,
        { count: "exact" },
      )
      .eq("created_by", user.id);

    // Apply filters
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + limit - 1);

    // Add timeout to database query
    const queryPromise = query;
    const dbTimeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database timeout")), 10000),
    );

    let polls, error, count;
    try {
      const result = (await Promise.race([
        queryPromise,
        dbTimeoutPromise,
      ])) as any;
      polls = result.data;
      error = result.error;
      count = result.count;
    } catch (timeoutError) {
      console.error("Database query timeout:", timeoutError);
      return NextResponse.json(
        { success: false, error: "Database request timeout" },
        { status: 504 },
      );
    }

    if (error) {
      console.error("Error fetching user polls:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch polls" },
        { status: 500 },
      );
    }

    // Fetch user data for consistency with timeout
    let userData = null;
    try {
      const userDataPromise = supabaseAdmin
        .from("users")
        .select("id, name, avatar")
        .eq("id", user.id)
        .single();

      const userTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("User data timeout")), 3000),
      );

      const { data } = (await Promise.race([
        userDataPromise,
        userTimeoutPromise,
      ])) as any;
      userData = data;
    } catch (error) {
      console.warn("Failed to fetch user data:", error);
      // Continue without user data - not critical
      userData = {
        id: user.id,
        name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
        avatar: user.user_metadata?.avatar_url || null,
      };
    }

    // Transform the data to match frontend types
    const transformedPolls =
      polls?.map((poll: any) => ({
        id: poll.id,
        title: poll.title,
        description: poll.description,
        status: poll.status,
        category: poll.category,
        createdAt: poll.created_at,
        updatedAt: poll.updated_at,
        endDate: poll.end_date,
        createdBy: userData
          ? {
              id: userData.id,
              name: userData.name,
              avatar: userData.avatar,
            }
          : null,
        allowMultipleChoice: poll.allow_multiple_choice,
        requireAuth: poll.require_auth,
        isAnonymous: poll.is_anonymous,
        showResults: poll.show_results,
        totalVotes: poll.total_votes,
        totalViews: poll.total_views,
        uniqueVoters: poll.unique_voters,
        tags: poll.tags,
        isPublic: poll.is_public,
        shareCode: poll.share_code,
        options:
          poll.poll_options?.map((option: PollOptionRow) => ({
            id: option.id,
            text: option.text,
            votes: option.votes,
            percentage:
              poll.total_votes > 0
                ? Math.round((option.votes / poll.total_votes) * 100)
                : 0,
          })) || [],
      })) || [];

    return NextResponse.json({
      success: true,
      data: transformedPolls,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error("Unexpected error in user polls API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
