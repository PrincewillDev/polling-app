import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { createClient } from "@supabase/supabase-js";

// Define specific types for metadata to avoid 'any'
interface PollAnalyticsMetadata {
  options_count?: number;
  allow_multiple_choice?: boolean;
  category?: string;
  poll_title?: string;
  user_agent_details?: {
    browser?: string;
    os?: string;
    device?: string;
  };
  referrer?: string;
  session_duration?: number;
  interaction_type?: string;
  [key: string]: unknown; // For extensibility while maintaining type safety
}

// Type for user poll statistics
interface UserPollStats {
  poll_id: string;
  poll_title: string;
  total_votes: number;
  total_views: number;
  created_at: string;
  status: string;
  category: string;
  last_activity: string;
  [key: string]: unknown; // For extensibility
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables");
  console.log("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "Set" : "Missing");
  console.log(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY:",
    supabaseKey ? "Set" : "Missing",
  );
}

if (!supabaseServiceKey) {
  console.warn(
    "SUPABASE_SERVICE_ROLE_KEY not found - some admin operations may fail",
  );
}

// Main client instance - use this for all client-side operations
export const supabase = createBrowserClient();

// Server-side client with service role for admin operations
// Falls back to regular client if service key is not available
export const supabaseAdmin = supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : supabase;

// Database types (matching our schema)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          avatar: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          avatar?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          avatar?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      polls: {
        Row: {
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
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          status?: "active" | "closed" | "draft";
          category: string;
          created_at?: string;
          updated_at?: string;
          end_date?: string | null;
          created_by: string;
          allow_multiple_choice?: boolean;
          require_auth?: boolean;
          is_anonymous?: boolean;
          show_results?: "immediately" | "after-vote" | "after-end" | "never";
          total_votes?: number;
          total_views?: number;
          unique_voters?: number;
          tags?: string[] | null;
          is_public?: boolean;
          share_code?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          status?: "active" | "closed" | "draft";
          category?: string;
          created_at?: string;
          updated_at?: string;
          end_date?: string | null;
          created_by?: string;
          allow_multiple_choice?: boolean;
          require_auth?: boolean;
          is_anonymous?: boolean;
          show_results?: "immediately" | "after-vote" | "after-end" | "never";
          total_votes?: number;
          total_views?: number;
          unique_voters?: number;
          tags?: string[] | null;
          is_public?: boolean;
          share_code?: string | null;
        };
      };
      poll_options: {
        Row: {
          id: string;
          poll_id: string;
          text: string;
          order_index: number;
          votes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          poll_id: string;
          text: string;
          order_index: number;
          votes?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          poll_id?: string;
          text?: string;
          order_index?: number;
          votes?: number;
          created_at?: string;
        };
      };
      votes: {
        Row: {
          id: string;
          poll_id: string;
          user_id: string | null;
          option_ids: string[];
          created_at: string;
          ip_address: string | null;
          user_agent: string | null;
        };
        Insert: {
          id?: string;
          poll_id: string;
          user_id?: string | null;
          option_ids: string[];
          created_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: {
          id?: string;
          poll_id?: string;
          user_id?: string | null;
          option_ids?: string[];
          created_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
        };
      };
      comments: {
        Row: {
          id: string;
          poll_id: string;
          user_id: string | null;
          user_name: string | null;
          content: string;
          created_at: string;
          updated_at: string;
          parent_id: string | null;
          likes: number;
          dislikes: number;
        };
        Insert: {
          id?: string;
          poll_id: string;
          user_id?: string | null;
          user_name?: string | null;
          content: string;
          created_at?: string;
          updated_at?: string;
          parent_id?: string | null;
          likes?: number;
          dislikes?: number;
        };
        Update: {
          id?: string;
          poll_id?: string;
          user_id?: string | null;
          user_name?: string | null;
          content?: string;
          created_at?: string;
          updated_at?: string;
          parent_id?: string | null;
          likes?: number;
          dislikes?: number;
        };
      };
      poll_analytics: {
        Row: {
          id: string;
          poll_id: string;
          user_id: string | null;
          event_type: string;
          created_at: string;
          ip_address: string | null;
          user_agent: string | null;
          metadata: PollAnalyticsMetadata | null;
        };
        Insert: {
          id?: string;
          poll_id: string;
          user_id?: string | null;
          event_type: string;
          created_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: PollAnalyticsMetadata | null;
        };
        Update: {
          id?: string;
          poll_id?: string;
          user_id?: string | null;
          event_type?: string;
          created_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: PollAnalyticsMetadata | null;
        };
      };
      user_poll_interactions: {
        Row: {
          id: string;
          user_id: string;
          poll_id: string;
          has_voted: boolean;
          has_viewed: boolean;
          first_viewed_at: string | null;
          voted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          poll_id: string;
          has_voted?: boolean;
          has_viewed?: boolean;
          first_viewed_at?: string | null;
          voted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          poll_id?: string;
          has_voted?: boolean;
          has_viewed?: boolean;
          first_viewed_at?: string | null;
          voted_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_poll_results: {
        Args: {
          poll_uuid: string;
        };
        Returns: {
          option_id: string;
          option_text: string;
          vote_count: number;
          percentage: number;
          voters: string[];
        }[];
      };
      can_user_vote: {
        Args: {
          poll_uuid: string;
          user_uuid?: string;
        };
        Returns: boolean;
      };
      cast_vote: {
        Args: {
          poll_uuid: string;
          user_uuid?: string;
          option_uuids: string[];
          user_ip?: string;
          user_agent_string?: string;
        };
        Returns: void;
      };
      track_poll_view: {
        Args: {
          poll_uuid: string;
          user_uuid?: string;
          user_ip?: string;
          user_agent_string?: string;
        };
        Returns: void;
      };
      get_user_poll_stats: {
        Args: {
          user_uuid: string;
        };
        Returns: UserPollStats[];
      };
      get_trending_polls: {
        Args: {
          limit_count?: number;
        };
        Returns: {
          id: string;
          title: string;
          description: string;
          category: string;
          total_votes: number;
          total_views: number;
          created_by: string;
          creator_name: string;
          created_at: string;
          trend_score: number;
        }[];
      };
      search_polls: {
        Args: {
          search_query: string;
          poll_status?: "active" | "closed" | "draft";
          poll_category?: string;
          limit_count?: number;
          offset_count?: number;
        };
        Returns: {
          id: string;
          title: string;
          description: string;
          status: "active" | "closed" | "draft";
          category: string;
          total_votes: number;
          total_views: number;
          created_by: string;
          creator_name: string;
          created_at: string;
          relevance_score: number;
        }[];
      };
    };
    Enums: {
      poll_status: "active" | "closed" | "draft";
      show_results_type: "immediately" | "after-vote" | "after-end" | "never";
    };
  };
};

// Export the main client as supabaseClient for backwards compatibility
export const supabaseClient = supabase;
