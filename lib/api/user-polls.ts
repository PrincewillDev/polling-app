import { Poll } from "@/types";
import { authenticatedFetchJSON, createAuthHeaders } from "@/lib/auth-utils";

interface PaginationParams {
  limit?: number;
  offset?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export class UserPollsAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    return await createAuthHeaders();
  }

  // Get user's polls
  async getUserPolls(
    params: PaginationParams = {},
  ): Promise<ApiResponse<Poll[]>> {
    try {
      const {
        limit = 20,
        offset = 0,
        status = "all",
        sortBy = "created_at",
        sortOrder = "desc",
      } = params;

      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        status,
        sortBy,
        sortOrder,
      });

      return await authenticatedFetchJSON(
        `${this.baseUrl}/api/user/polls?${queryParams}`,
      );
    } catch (error) {
      console.error("Error fetching user polls:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch polls",
      };
    }
  }

  // Get user's poll statistics
  async getUserPollStats(): Promise<
    ApiResponse<{
      totalPolls: number;
      activePolls: number;
      totalVotes: number;
      totalViews: number;
    }>
  > {
    try {
      const allPolls = await this.getUserPolls({ limit: 1000 }); // Get all polls for stats

      if (!allPolls.success || !allPolls.data) {
        return {
          success: false,
          error: "Failed to fetch poll statistics",
        };
      }

      const polls = allPolls.data;
      const stats = {
        totalPolls: polls.length,
        activePolls: polls.filter((poll) => poll.status === "active").length,
        totalVotes: polls.reduce((sum, poll) => sum + poll.totalVotes, 0),
        totalViews: polls.reduce((sum, poll) => sum + poll.totalViews, 0),
      };

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error("Error fetching user poll stats:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch statistics",
      };
    }
  }

  // Update poll
  async updatePoll(
    pollId: string,
    updates: Partial<Poll>,
  ): Promise<ApiResponse<Poll>> {
    try {
      return await authenticatedFetchJSON(
        `${this.baseUrl}/api/polls/${pollId}`,
        {
          method: "PATCH",
          body: JSON.stringify(updates),
        },
      );
    } catch (error) {
      console.error("Error updating poll:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update poll",
      };
    }
  }

  // Delete poll
  async deletePoll(id: string): Promise<ApiResponse<void>> {
    try {
      return await authenticatedFetchJSON(`${this.baseUrl}/api/polls/${id}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Error deleting poll:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete poll",
      };
    }
  }

  // Publish/unpublish poll
  async togglePollStatus(
    pollId: string,
    status: "active" | "closed" | "draft",
  ): Promise<ApiResponse<Poll>> {
    try {
      return await authenticatedFetchJSON(
        `${this.baseUrl}/api/polls/${pollId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
      );
    } catch (error) {
      console.error("Error toggling poll status:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update poll status",
      };
    }
  }

  // Toggle poll visibility
  async togglePollVisibility(
    pollId: string,
    isPublic: boolean,
  ): Promise<ApiResponse<Poll>> {
    try {
      return await authenticatedFetchJSON(
        `${this.baseUrl}/api/polls/${pollId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ isPublic }),
        },
      );
    } catch (error) {
      console.error("Error toggling poll visibility:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update poll visibility",
      };
    }
  }
}

// Singleton instance
export const userPollsAPI = new UserPollsAPI();

// Hook-style wrapper for easier use in components
export const useUserPollsAPI = () => {
  return userPollsAPI;
};
