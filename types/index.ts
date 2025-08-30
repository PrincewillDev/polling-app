// User types
export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

// Poll types
export interface PollOption {
  id: string
  text: string
  votes: number
  percentage: number
  voters?: string[] // User IDs who voted for this option
}

export interface Poll {
  id: string
  title: string
  description?: string
  status: 'active' | 'closed' | 'draft'
  category: string
  createdAt: string
  updatedAt: string
  endDate?: string
  createdBy: User

  // Settings
  allowMultipleChoice: boolean
  requireAuth: boolean
  isAnonymous: boolean
  showResults: 'immediately' | 'after-vote' | 'after-end' | 'never'

  // Stats
  totalVotes: number
  totalViews: number
  uniqueVoters: number

  // Poll content
  options: PollOption[]

  // Metadata
  tags?: string[]
  isPublic: boolean
  shareCode?: string
}

// Vote types
export interface Vote {
  id: string
  pollId: string
  userId?: string // null for anonymous votes
  optionIds: string[]
  createdAt: string
  ipAddress?: string
  userAgent?: string
}

// Comment types
export interface Comment {
  id: string
  pollId: string
  userId?: string
  userName?: string
  content: string
  createdAt: string
  updatedAt: string
  parentId?: string // For nested comments
  likes?: number
  dislikes?: number
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Form types
export interface CreatePollRequest {
  title: string
  description?: string
  category: string
  options: Array<{
    text: string
  }>
  allowMultipleChoice: boolean
  requireAuth: boolean
  isAnonymous: boolean
  showResults: 'immediately' | 'after-vote' | 'after-end' | 'never'
  endDate?: string
  isPublic: boolean
  tags?: string[]
}

export interface UpdatePollRequest extends Partial<CreatePollRequest> {
  id: string
  status?: 'active' | 'closed' | 'draft'
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface VoteRequest {
  pollId: string
  optionIds: string[]
}

// Filter and search types
export interface PollFilters {
  status?: 'all' | 'active' | 'closed' | 'draft'
  category?: string
  createdBy?: string
  search?: string
  sortBy?: 'created_at' | 'updated_at' | 'votes' | 'views' | 'title'
  sortOrder?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
  tags?: string[]
}

export interface PollStats {
  totalPolls: number
  activePolls: number
  closedPolls: number
  draftPolls: number
  totalVotes: number
  totalViews: number
  averageVotesPerPoll: number
  mostPopularCategory: string
  recentActivity: Array<{
    type: 'poll_created' | 'vote_cast' | 'poll_closed'
    pollId: string
    pollTitle: string
    timestamp: string
  }>
}

// Component props types
export interface PollCardProps {
  poll: Poll
  variant?: 'default' | 'compact' | 'detailed'
  showActions?: boolean
  onEdit?: (pollId: string) => void
  onDelete?: (pollId: string) => void
  onVote?: (pollId: string, optionIds: string[]) => void
}

export interface VotingFormProps {
  poll: Poll
  hasVoted: boolean
  onVote: (optionIds: string[]) => Promise<void>
  isLoading?: boolean
}

export interface PollResultsProps {
  poll: Poll
  showVoterDetails?: boolean
}

// Auth context types
export interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateUser: (userData: Partial<User>) => void
}

// Theme and UI types
export interface Theme {
  primary: string
  secondary: string
  accent: string
  background: string
  foreground: string
  muted: string
  border: string
}

export interface NotificationState {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

// Error types
export interface AppError {
  code: string
  message: string
  details?: any
  statusCode?: number
}

// Analytics types
export interface PollAnalytics {
  pollId: string
  views: number
  uniqueViews: number
  votes: number
  uniqueVoters: number
  conversionRate: number
  averageTimeSpent: number
  dropOffRate: number
  popularOptions: Array<{
    optionId: string
    text: string
    percentage: number
  }>
  demographics?: {
    ageGroups?: Record<string, number>
    locations?: Record<string, number>
    devices?: Record<string, number>
  }
  timeSeriesData?: Array<{
    date: string
    views: number
    votes: number
  }>
}

// Export utility types
export type PollStatus = Poll['status']
export type ShowResults = Poll['showResults']
export type SortBy = PollFilters['sortBy']
export type SortOrder = PollFilters['sortOrder']
export type NotificationType = NotificationState['type']
