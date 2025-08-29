// User authentication types
export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  displayName: string;
  password: string;
  confirmPassword: string;
}

// Poll types
export interface PollOption {
  id: string;
  text: string;
  votes: number;
  percentage?: number;
}

export interface Poll {
  id: string;
  title: string;
  description?: string;
  options: PollOption[];
  createdBy: {
    id: string;
    username: string;
    displayName: string;
  };
  totalVotes: number;
  isActive: boolean;
  allowMultipleVotes: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePollData {
  title: string;
  description?: string;
  options: string[];
  allowMultipleVotes?: boolean;
  expiresAt?: Date;
}

export interface Vote {
  id: string;
  pollId: string;
  optionId: string;
  userId: string;
  createdAt: Date;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Form validation types
export interface FormErrors {
  [key: string]: string | undefined;
}

// Dashboard types
export interface UserStats {
  totalPolls: number;
  totalVotes: number;
  totalViews: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: "poll_created" | "vote_cast" | "poll_expired";
  description: string;
  createdAt: Date;
  relatedPoll?: {
    id: string;
    title: string;
  };
}

// Filter and search types
export interface PollFilters {
  search?: string;
  isActive?: boolean;
  createdBy?: string;
  sortBy?: "newest" | "oldest" | "most_votes" | "trending";
  page?: number;
  limit?: number;
}
