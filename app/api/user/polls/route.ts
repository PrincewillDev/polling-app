import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
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
    // Get user from authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Invalid authentication" },
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

    // Build query for user's polls
    let query = supabase
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

    const { data: polls, error, count } = await query;

    if (error) {
      console.error("Error fetching user polls:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch polls" },
        { status: 500 },
      );
    }

    // Fetch user data for consistency
    const { data: userData } = await supabase
      .from("users")
      .select("id, name, avatar")
      .eq("id", user.id)
      .single();

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
