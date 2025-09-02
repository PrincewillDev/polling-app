import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin, Database } from "@/lib/supabase";
import { CreatePollRequest } from "@/types";

// Type for poll option from database
type PollOptionRow = Database["public"]["Tables"]["poll_options"]["Row"];

// Type for user from database
type UserRow = Database["public"]["Tables"]["users"]["Row"];

// Type for poll with relations
interface PollWithRelations {
  id: string;
  title: string;
  description: string | null;
  status: "active" | "closed" | "draft";
  category: string;
  created_at: string;
  updated_at: string;
  end_date: string | null;
  created_by: string;
  allow_multiple_choice: boolean;
  require_auth: boolean;
  is_anonymous: boolean;
  show_results: "immediately" | "after-vote" | "after-end" | "never";
  total_votes: number;
  total_views: number;
  unique_voters: number;
  tags: string[] | null;
  is_public: boolean;
  share_code: string | null;
  poll_options?: PollOptionRow[];
  users?: UserRow | null;
}

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // Extract the token
    const token = authHeader.replace("Bearer ", "");

    // Verify the token by getting user info
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Authentication error:", authError);
      return NextResponse.json(
        { success: false, error: "Invalid authentication" },
        { status: 401 },
      );
    }

    console.log("Authenticated user:", {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
    });

    // Parse request body
    const pollData: CreatePollRequest = await request.json();

    // Validate required fields
    if (
      !pollData.title ||
      !pollData.category ||
      !pollData.options ||
      pollData.options.length < 2
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Title, category, and at least 2 options are required",
        },
        { status: 400 },
      );
    }

    // Check if we have proper admin permissions
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Service configuration incomplete. Please add SUPABASE_SERVICE_ROLE_KEY to your environment variables. Check your Supabase dashboard Settings → API for the service_role key.",
        },
        { status: 500 },
      );
    }

    // Ensure user profile exists - create minimal profile if needed
    console.log("Ensuring user profile exists for:", user.id, user.email);

    // Check if user profile exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", user.id)
      .single();

    console.log("User profile check result:", { existingUser, checkError });

    if (existingUser) {
      console.log("User profile already exists for:", user.id);
    }

    if (checkError && checkError.code === "PGRST116") {
      // User doesn't exist, create minimal profile
      const userName =
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "User";

      console.log("Creating user profile for:", userName);

      const { error: createError } = await supabaseAdmin.from("users").insert({
        id: user.id,
        name: userName.toString().trim() || "User",
        email: user.email!,
        avatar:
          user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      });

      if (createError) {
        console.error("Failed to create user profile:", createError);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to create user profile",
          },
          { status: 500 },
        );
      }

      console.log("User profile created successfully");
    } else if (checkError) {
      console.error("Error checking user profile:", checkError);
      return NextResponse.json(
        { success: false, error: "Failed to verify user profile" },
        { status: 500 },
      );
    }

    // Create poll without foreign key constraint to public.users
    // We'll create a simpler version that doesn't depend on the users table
    const pollInsertData = {
      title: pollData.title.trim(),
      description: pollData.description?.trim() || null,
      category: pollData.category,
      created_by: user.id, // This references auth.users which always exists
      allow_multiple_choice: pollData.allowMultipleChoice || false,
      require_auth:
        pollData.requireAuth !== undefined ? pollData.requireAuth : true,
      is_anonymous: pollData.isAnonymous || false,
      show_results: pollData.showResults || "after-vote",
      end_date: pollData.endDate
        ? new Date(pollData.endDate).toISOString()
        : null,
      is_public: pollData.isPublic !== undefined ? pollData.isPublic : true,
      tags: pollData.tags || [],
      status: "draft", // Start as draft, will be activated later
    };

    console.log("Creating poll with data:", pollInsertData);

    const { data: poll, error: pollError } = await supabaseAdmin
      .from("polls")
      .insert(pollInsertData)
      .select()
      .single();

    if (pollError) {
      console.error("Error creating poll:", pollError);
      return NextResponse.json(
        { success: false, error: "Failed to create poll" },
        { status: 500 },
      );
    }

    // Create poll options
    const optionInserts = pollData.options.map((option, index) => ({
      poll_id: poll.id,
      text: option.text.trim(),
      order_index: index,
    }));

    const { error: optionsError } = await supabaseAdmin
      .from("poll_options")
      .insert(optionInserts);

    if (optionsError) {
      console.error("Error creating poll options:", optionsError);

      // Rollback: delete the poll since options failed
      await supabaseAdmin.from("polls").delete().eq("id", poll.id);

      return NextResponse.json(
        { success: false, error: "Failed to create poll options" },
        { status: 500 },
      );
    }

    // Activate the poll if it's not meant to be a draft
    const finalStatus = pollData.isPublic ? "active" : "draft";
    const { data: finalPoll, error: updateError } = await supabaseAdmin
      .from("polls")
      .update({ status: finalStatus })
      .eq("id", poll.id)
      .select(
        `
        *,
        poll_options (
          id,
          text,
          order_index,
          votes
        )
      `,
      )
      .single();

    if (updateError) {
      console.error("Error updating poll status:", updateError);
      return NextResponse.json(
        { success: false, error: "Poll created but failed to activate" },
        { status: 500 },
      );
    }

    // Track the creation event
    await supabaseAdmin.from("poll_analytics").insert({
      poll_id: poll.id,
      user_id: user.id,
      event_type: "created",
      ip_address:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        null,
      user_agent: request.headers.get("user-agent") || null,
      metadata: {
        options_count: pollData.options.length,
        allow_multiple_choice: pollData.allowMultipleChoice,
        category: pollData.category,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: finalPoll.id,
        title: finalPoll.title,
        description: finalPoll.description,
        status: finalPoll.status,
        category: finalPoll.category,
        createdAt: finalPoll.created_at,
        createdBy: {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
          email: user.email,
          avatar: user.user_metadata?.avatar_url || null,
        },
        allowMultipleChoice: finalPoll.allow_multiple_choice,
        requireAuth: finalPoll.require_auth,
        isAnonymous: finalPoll.is_anonymous,
        showResults: finalPoll.show_results,
        endDate: finalPoll.end_date,
        isPublic: finalPoll.is_public,
        tags: finalPoll.tags,
        shareCode: finalPoll.share_code,
        totalVotes: finalPoll.total_votes,
        totalViews: finalPoll.total_views,
        uniqueVoters: finalPoll.unique_voters,
        options:
          finalPoll.poll_options?.map((option: PollOptionRow) => ({
            id: option.id,
            text: option.text,
            votes: option.votes,
            percentage: 0, // Will be calculated client-side
          })) || [],
      },
      message: `Poll "${finalPoll.title}" created successfully`,
    });
  } catch (error) {
    console.error("Unexpected error in poll creation:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred while creating the poll",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "active";
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") || "desc";

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
      )
      .eq("is_public", true);

    // Apply filters
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + limit - 1);

    const { data: polls, error, count } = await query;

    if (error) {
      console.error("Error fetching polls:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch polls" },
        { status: 500 },
      );
    }

    // Fetch user data separately to avoid foreign key issues
    let usersMap = new Map();
    if (polls && polls.length > 0) {
      const userIds = [...new Set(polls.map((poll) => poll.created_by))];
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, name, avatar")
        .in("id", userIds);

      if (!usersError && users) {
        users.forEach((user) => {
          usersMap.set(user.id, user);
        });
      }
    }

    // Transform the data to match our frontend types
    const transformedPolls =
      polls?.map((poll: any) => {
        const user = usersMap.get(poll.created_by);
        return {
          id: poll.id,
          title: poll.title,
          description: poll.description,
          status: poll.status,
          category: poll.category,
          createdAt: poll.created_at,
          updatedAt: poll.updated_at,
          endDate: poll.end_date,
          createdBy: user
            ? {
                id: user.id,
                name: user.name,
                avatar: user.avatar,
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
        };
      }) || [];

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
    console.error("Unexpected error in polls fetch:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred while fetching polls",
      },
      { status: 500 },
    );
  }
}
