import { supabase } from "@/lib/supabase";
import {
  CreatePollRequest,
  Poll,
  ApiResponse,
  PaginatedResponse,
  PollFilters,
} from "@/types";

export class PollsAPI {
  // Get current user's auth token
  private async getAuthToken(): Promise<string | null> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Error getting session:", error);
        return null;
      }

      if (!session?.access_token) {
        console.warn("No access token found in session");
        return null;
      }

      return session.access_token;
    } catch (error) {
      console.error("Unexpected error getting auth token:", error);
      return null;
    }
  }

  // Create a new poll
  async createPoll(pollData: CreatePollRequest): Promise<ApiResponse<Poll>> {
    try {
      console.log("Creating poll with data:", pollData);

      const token = await this.getAuthToken();
      if (!token) {
        console.error("No authentication token available");
        return {
          success: false,
          error: "Authentication required. Please log in and try again.",
        };
      }

      console.log(
        "Making API request with token:",
        token.substring(0, 10) + "...",
      );

      const response = await fetch("/api/polls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(pollData),
      });

      const result = await response.json();
      console.log("API response:", { status: response.status, result });

      if (!response.ok) {
        const errorMessage =
          result.error || `HTTP ${response.status}: Failed to create poll`;
        console.error("API error:", errorMessage);
        throw new Error(errorMessage);
      }

      return result;
    } catch (error) {
      console.error("Error creating poll:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // Get polls with filtering and pagination
  async getPolls(filters: PollFilters = {}): Promise<PaginatedResponse<Poll>> {
    try {
      const searchParams = new URLSearchParams();

      // Add filters to search params
      if (filters.status && filters.status !== "all") {
        searchParams.set("status", filters.status);
      }
      if (filters.category) {
        searchParams.set("category", filters.category);
      }
      if (filters.search) {
        searchParams.set("search", filters.search);
      }
      if (filters.sortBy) {
        searchParams.set("sortBy", filters.sortBy);
      }
      if (filters.sortOrder) {
        searchParams.set("sortOrder", filters.sortOrder);
      }

      // Pagination
      searchParams.set("limit", "20");
      searchParams.set("offset", "0");

      const response = await fetch(`/api/polls?${searchParams.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch polls");
      }

      return result;
    } catch (error) {
      console.error("Error fetching polls:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }
  }

  // Get a specific poll by ID
  async getPoll(id: string): Promise<ApiResponse<Poll>> {
    try {
      const response = await fetch(`/api/polls/${id}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch poll");
      }

      return result;
    } catch (error) {
      console.error("Error fetching poll:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // Update a poll
  async updatePoll(
    id: string,
    updates: Partial<CreatePollRequest>,
  ): Promise<ApiResponse<Poll>> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await fetch(`/api/polls/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update poll");
      }

      return result;
    } catch (error) {
      console.error("Error updating poll:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // Delete a poll
  async deletePoll(id: string): Promise<ApiResponse<void>> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await fetch(`/api/polls/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete poll");
      }

      return result;
    } catch (error) {
      console.error("Error deleting poll:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // Vote on a poll
  async votePoll(
    pollId: string,
    optionIds: string[],
  ): Promise<ApiResponse<void>> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ optionIds }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to vote");
      }

      return result;
    } catch (error) {
      console.error("Error voting on poll:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // Get trending polls
  async getTrendingPolls(limit: number = 10): Promise<ApiResponse<Poll[]>> {
    try {
      const response = await fetch(`/api/polls/trending?limit=${limit}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch trending polls");
      }

      return result;
    } catch (error) {
      console.error("Error fetching trending polls:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        data: [],
      };
    }
  }

  // Search polls
  async searchPolls(
    query: string,
    filters: { category?: string; status?: string } = {},
  ): Promise<ApiResponse<Poll[]>> {
    try {
      const searchParams = new URLSearchParams({ search: query });

      if (filters.category) {
        searchParams.set("category", filters.category);
      }
      if (filters.status) {
        searchParams.set("status", filters.status);
      }

      const response = await fetch(
        `/api/polls/search?${searchParams.toString()}`,
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to search polls");
      }

      return result;
    } catch (error) {
      console.error("Error searching polls:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        data: [],
      };
    }
  }

  // Get user's polls
  async getUserPolls(userId?: string): Promise<ApiResponse<Poll[]>> {
    try {
      const token = await this.getAuthToken();
      if (!token && !userId) {
        throw new Error("Authentication required");
      }

      const url = userId ? `/api/users/${userId}/polls` : "/api/user/polls";
      const response = await fetch(url, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch user polls");
      }

      return result;
    } catch (error) {
      console.error("Error fetching user polls:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        data: [],
      };
    }
  }

  // Get poll analytics
  async getPollAnalytics(
    pollId: string,
  ): Promise<ApiResponse<Record<string, any>>> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await fetch(`/api/polls/${pollId}/analytics`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch poll analytics");
      }

      return result;
    } catch (error) {
      console.error("Error fetching poll analytics:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // Track poll view
  async trackView(pollId: string): Promise<void> {
    try {
      const token = await this.getAuthToken();

      await fetch(`/api/polls/${pollId}/view`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
    } catch (error) {
      // View tracking is non-critical, so we just log the error
      console.warn("Failed to track poll view:", error);
    }
  }
}

// Export a singleton instance
export const pollsAPI = new PollsAPI();

// Export individual functions for easier importing
export const {
  createPoll,
  getPolls,
  getPoll,
  updatePoll,
  deletePoll,
  votePoll,
  getTrendingPolls,
  searchPolls,
  getUserPolls,
  getPollAnalytics,
  trackView,
} = pollsAPI;
