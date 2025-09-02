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

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Poll ID is required" },
        { status: 400 },
      );
    }

    // Check if user is authenticated
    let authenticatedUser = null;
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser(token);
      authenticatedUser = authUser;
    }

    // Get poll with all related data
    // Allow access if poll is public OR user owns the poll
    const { data: poll, error } = await supabase
      .from("polls")
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
      .eq("id", id)
      .single();

    if (error || !poll) {
      return NextResponse.json(
        { success: false, error: "Poll not found" },
        { status: 404 },
      );
    }

    // Check access permissions
    const canAccess =
      poll.is_public ||
      (authenticatedUser && poll.created_by === authenticatedUser.id);
    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: "Poll not found or is private" },
        { status: 404 },
      );
    }

    // Fetch poll creator data separately to avoid foreign key issues
    let pollCreator = null;
    if (poll.created_by) {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, name, email, avatar")
        .eq("id", poll.created_by)
        .single();

      if (!userError && userData) {
        pollCreator = userData;
      }
    }

    // Update view count (skip analytics for now since table doesn't exist)
    await supabase
      .from("polls")
      .update({
        total_views: poll.total_views + 1,
      })
      .eq("id", id);

    // Transform data
    // Transform poll data
    const transformedPoll: Poll = {
      id: poll.id,
      title: poll.title,
      description: poll.description,
      status: poll.status,
      category: poll.category,
      createdAt: poll.created_at,
      updatedAt: poll.updated_at,
      endDate: poll.end_date,
      createdBy: pollCreator
        ? {
            id: pollCreator.id,
            name: pollCreator.name,
            email: pollCreator.email,
            avatar: pollCreator.avatar,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : {
            id: "",
            name: "Unknown",
            email: "",
            avatar: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
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

    return NextResponse.json({
      success: true,
      data: transformedPoll,
    });
  } catch (error) {
    console.error("Error fetching poll:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch poll" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    console.log("PATCH request started for poll ID:", id);

    // Get auth token
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      console.log("No auth header provided");
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("Token extracted, getting user...");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.log("Auth error:", authError);
      return NextResponse.json(
        { success: false, error: "Invalid authentication" },
        { status: 401 },
      );
    }

    console.log("User authenticated:", user.id);

    // Check if user owns the poll
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .select("id, created_by")
      .eq("id", id)
      .single();

    console.log("Poll ownership check - Poll data:", poll);
    console.log("Poll ownership check - Poll error:", pollError);
    console.log("Poll ownership check - User ID:", user.id);
    console.log("Poll ownership check - Poll created_by:", poll?.created_by);

    if (pollError || !poll) {
      console.log("Poll not found or error:", pollError);
      return NextResponse.json(
        { success: false, error: "Poll not found" },
        { status: 404 },
      );
    }

    if (poll.created_by !== user.id) {
      console.log("Permission denied - user ID mismatch");
      return NextResponse.json(
        { success: false, error: "Permission denied" },
        { status: 403 },
      );
    }

    console.log("Ownership verified, proceeding with update");

    // Parse update data
    const updates = await request.json();
    console.log("Updates received:", updates);

    // Build update object with more explicit handling
    const updateData: Record<string, string | boolean | null> = {};

    if (updates.title) {
      updateData.title = updates.title.toString().trim();
    }

    if (updates.description !== undefined) {
      updateData.description = updates.description
        ? updates.description.toString().trim()
        : null;
    }

    if (updates.category) {
      updateData.category = updates.category.toString();
    }

    if (
      updates.status &&
      ["active", "closed", "draft"].includes(updates.status)
    ) {
      updateData.status = updates.status;
    }

    if (updates.allowMultipleChoice !== undefined) {
      updateData.allow_multiple_choice = Boolean(updates.allowMultipleChoice);
    }

    if (updates.requireAuth !== undefined) {
      updateData.require_auth = Boolean(updates.requireAuth);
    }

    if (updates.isAnonymous !== undefined) {
      updateData.is_anonymous = Boolean(updates.isAnonymous);
    }

    if (
      updates.showResults &&
      ["immediately", "after-vote", "after-end", "never"].includes(
        updates.showResults,
      )
    ) {
      updateData.show_results = updates.showResults;
    }

    if (updates.endDate !== undefined) {
      updateData.end_date = updates.endDate || null;
    }

    if (updates.isPublic !== undefined) {
      updateData.is_public = Boolean(updates.isPublic);
    }

    if (updates.tags !== undefined) {
      updateData.tags = Array.isArray(updates.tags) ? updates.tags : null;
    }

    console.log("Update data prepared:", updateData);

    // Update poll using admin client to bypass RLS
    console.log("Executing database update...");
    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from("polls")
      .update(updateData)
      .eq("id", id)
      .select();

    console.log("Database update result:", updateResult);
    console.log("Database update error:", updateError);

    if (updateError) {
      console.error("Update error details:", {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update poll",
          details: updateError,
        },
        { status: 500 },
      );
    }

    if (!updateResult || updateResult.length === 0) {
      console.warn(
        "No rows were updated - poll may not exist or no changes made",
      );
      return NextResponse.json(
        {
          success: false,
          error:
            "No poll was updated - poll may not exist or no changes were made",
        },
        { status: 404 },
      );
    }

    console.log(
      "Poll updated successfully, affected rows:",
      updateResult.length,
    );

    return NextResponse.json({
      success: true,
      message: "Poll updated successfully",
      updatedPoll: updateResult[0],
    });
  } catch (error) {
    console.error("Unexpected error updating poll:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update poll",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    console.log("DELETE request started for poll ID:", (await params).id);
    const { id } = await params;

    // Get auth token
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      console.log("DELETE: No auth header provided");
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("DELETE: Token extracted, getting user...");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.log("DELETE: Auth error:", authError);
      return NextResponse.json(
        { success: false, error: "Invalid authentication" },
        { status: 401 },
      );
    }

    console.log("DELETE: User authenticated:", user.id);

    // Check if user owns the poll
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .select("id, created_by, title")
      .eq("id", id)
      .single();

    console.log("DELETE: Poll ownership check - Poll data:", poll);
    console.log("DELETE: Poll ownership check - Poll error:", pollError);

    if (pollError || !poll) {
      console.log("DELETE: Poll not found or error:", pollError);
      return NextResponse.json(
        { success: false, error: "Poll not found" },
        { status: 404 },
      );
    }

    if (poll.created_by !== user.id) {
      console.log("DELETE: Permission denied - user ID mismatch");
      console.log("DELETE: Poll created_by:", poll.created_by);
      console.log("DELETE: User ID:", user.id);
      return NextResponse.json(
        { success: false, error: "Permission denied" },
        { status: 403 },
      );
    }

    console.log("DELETE: Ownership verified, proceeding with deletion");

    // Delete poll using admin client to bypass RLS
    const { error: deleteError, count } = await supabaseAdmin
      .from("polls")
      .delete({ count: "exact" })
      .eq("id", id);

    console.log("DELETE: Delete operation result - Error:", deleteError);
    console.log("DELETE: Delete operation result - Count:", count);

    if (deleteError) {
      console.error("DELETE: Delete operation failed:", deleteError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete poll",
          details: deleteError,
        },
        { status: 500 },
      );
    }

    if (count === 0) {
      console.log("DELETE: No rows were deleted - RLS might be blocking");
      return NextResponse.json(
        { success: false, error: "Poll could not be deleted - access denied" },
        { status: 403 },
      );
    }

    console.log("DELETE: Poll deleted successfully, count:", count);

    return NextResponse.json({
      success: true,
      message: `Poll "${poll.title}" deleted successfully`,
    });
  } catch (error) {
    console.error("DELETE: Unexpected error deleting poll:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete poll",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
