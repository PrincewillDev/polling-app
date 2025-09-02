import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

    // Check if user has voted (requires authentication)
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

    // Check if user has already voted on this poll
    const { data: existingVote, error: voteError } = await supabase
      .from("votes")
      .select("id")
      .eq("poll_id", id)
      .eq("user_id", user.id)
      .single();

    if (voteError && voteError.code !== "PGRST116") {
      console.error("Error checking existing vote:", voteError);
      return NextResponse.json(
        { success: false, error: "Failed to check vote status" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        hasVoted: !!existingVote,
      },
    });
  } catch (error) {
    console.error("Error checking vote status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check vote status" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Poll ID is required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { optionIds } = body;

    if (!optionIds || !Array.isArray(optionIds) || optionIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one option must be selected" },
        { status: 400 },
      );
    }

    // Get poll to check if it exists and is active
    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .select("id, status, require_auth, allow_multiple_choice, end_date")
      .eq("id", id)
      .single();

    if (pollError || !poll) {
      return NextResponse.json(
        { success: false, error: "Poll not found" },
        { status: 404 },
      );
    }

    // Check if poll is active
    if (poll.status !== "active") {
      return NextResponse.json(
        { success: false, error: "This poll is not currently active" },
        { status: 400 },
      );
    }

    // Check if poll has ended
    if (poll.end_date && new Date(poll.end_date) < new Date()) {
      return NextResponse.json(
        { success: false, error: "This poll has ended" },
        { status: 400 },
      );
    }

    // Check multiple choice constraint
    if (!poll.allow_multiple_choice && optionIds.length > 1) {
      return NextResponse.json(
        { success: false, error: "This poll only allows selecting one option" },
        { status: 400 },
      );
    }

    let user = null;

    // Handle authentication if required
    if (poll.require_auth) {
      const authHeader = request.headers.get("authorization");
      if (!authHeader) {
        return NextResponse.json(
          { success: false, error: "Authentication required for this poll" },
          { status: 401 },
        );
      }

      const token = authHeader.replace("Bearer ", "");

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (authError || !authUser) {
        return NextResponse.json(
          { success: false, error: "Invalid authentication" },
          { status: 401 },
        );
      }

      user = authUser;

      // Check if user has already voted
      const { data: existingVote, error: voteError } = await supabase
        .from("votes")
        .select("id")
        .eq("poll_id", id)
        .eq("user_id", user.id)
        .single();

      if (voteError && voteError.code !== "PGRST116") {
        console.error("Error checking existing vote:", voteError);
        return NextResponse.json(
          { success: false, error: "Failed to check existing vote" },
          { status: 500 },
        );
      }

      if (existingVote) {
        return NextResponse.json(
          { success: false, error: "You have already voted on this poll" },
          { status: 400 },
        );
      }
    } else {
      // For anonymous votes, get user from token if provided
      const authHeader = request.headers.get("authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser(token);
        user = authUser;
      }
    }

    // Verify that all selected options belong to this poll
    const { data: validOptions, error: optionsError } = await supabase
      .from("poll_options")
      .select("id")
      .eq("poll_id", id)
      .in("id", optionIds);

    if (
      optionsError ||
      !validOptions ||
      validOptions.length !== optionIds.length
    ) {
      return NextResponse.json(
        { success: false, error: "One or more selected options are invalid" },
        { status: 400 },
      );
    }

    // Get IP address for anonymous voting tracking
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip");
    const userAgent = request.headers.get("user-agent");

    // Record the vote directly (no stored procedures)
    try {
      const voteData: any = {
        poll_id: id,
        option_ids: optionIds,
        ip_address: ip,
        user_agent: userAgent,
      };

      if (user) {
        voteData.user_id = user.id;
      }

      const { error: voteInsertError } = await supabase
        .from("votes")
        .insert(voteData);

      if (voteInsertError) {
        throw voteInsertError;
      }

      // Update vote counts for each selected option
      for (const optionId of optionIds) {
        const { data: currentOption, error: fetchError } = await supabase
          .from("poll_options")
          .select("votes")
          .eq("id", optionId)
          .single();

        if (!fetchError && currentOption) {
          const { error: updateError } = await supabase
            .from("poll_options")
            .update({ votes: currentOption.votes + 1 })
            .eq("id", optionId);

          if (updateError) {
            console.error("Error updating option votes:", updateError);
          }
        }
      }

      // Update poll total votes and unique voters
      const { data: currentPoll, error: pollFetchError } = await supabase
        .from("polls")
        .select("total_votes, unique_voters")
        .eq("id", id)
        .single();

      if (!pollFetchError && currentPoll) {
        const { error: pollUpdateError } = await supabase
          .from("polls")
          .update({
            total_votes: currentPoll.total_votes + optionIds.length,
            unique_voters: currentPoll.unique_voters + 1,
          })
          .eq("id", id);

        if (pollUpdateError) {
          console.error("Error updating poll stats:", pollUpdateError);
        }
      }
    } catch (error) {
      console.error("Error recording vote:", error);
      return NextResponse.json(
        { success: false, error: "Failed to record vote" },
        { status: 500 },
      );
    }

    // Analytics table might not exist, so skip for now
    // TODO: Add analytics tracking when table is created

    return NextResponse.json({
      success: true,
      message: "Vote recorded successfully",
    });
  } catch (error) {
    console.error("Error processing vote:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process vote" },
      { status: 500 },
    );
  }
}
