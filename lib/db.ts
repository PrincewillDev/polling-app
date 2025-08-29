import { Poll, CreatePollData, Vote, PollFilters, PaginatedResponse } from './types';
import { getCurrentUser } from './auth';

// Mock database - replace with actual database implementation
let MOCK_POLLS: Poll[] = [
  {
    id: '1',
    title: 'What is your favorite programming language?',
    description: 'Help us understand the preferences of our developer community.',
    options: [
      { id: '1a', text: 'TypeScript', votes: 45, percentage: 40.9 },
      { id: '1b', text: 'Python', votes: 32, percentage: 29.1 },
      { id: '1c', text: 'JavaScript', votes: 21, percentage: 19.1 },
      { id: '1d', text: 'Rust', votes: 12, percentage: 10.9 },
    ],
    createdBy: {
      id: '1',
      username: 'demo',
      displayName: 'Demo User',
    },
    totalVotes: 110,
    isActive: true,
    allowMultipleVotes: false,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    title: 'Best time for team meetings?',
    description: 'Let\'s find a time that works for everyone on the team.',
    options: [
      { id: '2a', text: '9:00 AM', votes: 15, percentage: 37.5 },
      { id: '2b', text: '11:00 AM', votes: 18, percentage: 45.0 },
      { id: '2c', text: '2:00 PM', votes: 5, percentage: 12.5 },
      { id: '2d', text: '4:00 PM', votes: 2, percentage: 5.0 },
    ],
    createdBy: {
      id: '1',
      username: 'demo',
      displayName: 'Demo User',
    },
    totalVotes: 40,
    isActive: true,
    allowMultipleVotes: true,
    expiresAt: new Date('2024-12-31'),
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: '3',
    title: 'Office lunch preference',
    description: 'What should we order for the team lunch this Friday?',
    options: [
      { id: '3a', text: 'Pizza', votes: 8, percentage: 40.0 },
      { id: '3b', text: 'Thai Food', votes: 7, percentage: 35.0 },
      { id: '3c', text: 'Mexican', votes: 3, percentage: 15.0 },
      { id: '3d', text: 'Salads', votes: 2, percentage: 10.0 },
    ],
    createdBy: {
      id: '1',
      username: 'demo',
      displayName: 'Demo User',
    },
    totalVotes: 20,
    isActive: false,
    allowMultipleVotes: false,
    expiresAt: new Date('2024-01-05'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

let MOCK_VOTES: Vote[] = [
  {
    id: 'vote1',
    pollId: '1',
    optionId: '1a',
    userId: '1',
    createdAt: new Date('2024-01-16'),
  },
];

/**
 * Get all polls with optional filters
 */
export async function getPolls(filters: PollFilters = {}): Promise<PaginatedResponse<Poll>> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));

  let filteredPolls = [...MOCK_POLLS];

  // Apply search filter
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filteredPolls = filteredPolls.filter(poll =>
      poll.title.toLowerCase().includes(searchTerm) ||
      poll.description?.toLowerCase().includes(searchTerm)
    );
  }

  // Apply active filter
  if (filters.isActive !== undefined) {
    filteredPolls = filteredPolls.filter(poll => poll.isActive === filters.isActive);
  }

  // Apply created by filter
  if (filters.createdBy) {
    filteredPolls = filteredPolls.filter(poll => poll.createdBy.id === filters.createdBy);
  }

  // Apply sorting
  switch (filters.sortBy) {
    case 'oldest':
      filteredPolls.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      break;
    case 'most_votes':
      filteredPolls.sort((a, b) => b.totalVotes - a.totalVotes);
      break;
    case 'trending':
      // Mock trending algorithm - could be based on votes per day, recent activity, etc.
      filteredPolls.sort((a, b) => {
        const aScore = a.totalVotes / Math.max(1, (Date.now() - a.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const bScore = b.totalVotes / Math.max(1, (Date.now() - b.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        return bScore - aScore;
      });
      break;
    case 'newest':
    default:
      filteredPolls.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      break;
  }

  // Apply pagination
  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const paginatedPolls = filteredPolls.slice(startIndex, endIndex);
  const total = filteredPolls.length;
  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data: paginatedPolls,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

/**
 * Get a single poll by ID
 */
export async function getPoll(id: string): Promise<Poll | null> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200));

  const poll = MOCK_POLLS.find(p => p.id === id);
  return poll || null;
}

/**
 * Create a new poll
 */
export async function createPoll(data: CreatePollData): Promise<{ success: boolean; poll?: Poll; error?: string }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const currentUser = getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'User not authenticated' };
  }

  // Validate data
  if (!data.title.trim()) {
    return { success: false, error: 'Poll title is required' };
  }

  if (data.options.length < 2) {
    return { success: false, error: 'Poll must have at least 2 options' };
  }

  if (data.options.some(option => !option.trim())) {
    return { success: false, error: 'All poll options must have text' };
  }

  // Create new poll
  const newPoll: Poll = {
    id: String(MOCK_POLLS.length + 1),
    title: data.title.trim(),
    description: data.description?.trim(),
    options: data.options.map((option, index) => ({
      id: `${MOCK_POLLS.length + 1}${String.fromCharCode(97 + index)}`, // 1a, 1b, etc.
      text: option.trim(),
      votes: 0,
      percentage: 0,
    })),
    createdBy: {
      id: currentUser.id,
      username: currentUser.username,
      displayName: currentUser.displayName,
    },
    totalVotes: 0,
    isActive: true,
    allowMultipleVotes: data.allowMultipleVotes || false,
    expiresAt: data.expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  MOCK_POLLS.unshift(newPoll); // Add to beginning of array

  return { success: true, poll: newPoll };
}

/**
 * Vote on a poll
 */
export async function voteOnPoll(pollId: string, optionId: string): Promise<{ success: boolean; error?: string }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));

  const currentUser = getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'User not authenticated' };
  }

  const poll = MOCK_POLLS.find(p => p.id === pollId);
  if (!poll) {
    return { success: false, error: 'Poll not found' };
  }

  if (!poll.isActive) {
    return { success: false, error: 'Poll is no longer active' };
  }

  if (poll.expiresAt && new Date() > poll.expiresAt) {
    return { success: false, error: 'Poll has expired' };
  }

  const option = poll.options.find(o => o.id === optionId);
  if (!option) {
    return { success: false, error: 'Poll option not found' };
  }

  // Check if user has already voted
  const existingVote = MOCK_VOTES.find(v => v.pollId === pollId && v.userId === currentUser.id);

  if (existingVote && !poll.allowMultipleVotes) {
    return { success: false, error: 'You have already voted on this poll' };
  }

  // Create new vote
  const newVote: Vote = {
    id: `vote_${Date.now()}`,
    pollId,
    optionId,
    userId: currentUser.id,
    createdAt: new Date(),
  };

  MOCK_VOTES.push(newVote);

  // Update poll statistics
  option.votes++;
  poll.totalVotes++;

  // Recalculate percentages
  poll.options.forEach(opt => {
    opt.percentage = poll.totalVotes > 0 ? (opt.votes / poll.totalVotes) * 100 : 0;
  });

  poll.updatedAt = new Date();

  return { success: true };
}

/**
 * Get user's vote for a specific poll
 */
export async function getUserVote(pollId: string): Promise<Vote | null> {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  const vote = MOCK_VOTES.find(v => v.pollId === pollId && v.userId === currentUser.id);
  return vote || null;
}

/**
 * Delete a poll (only by creator)
 */
export async function deletePoll(pollId: string): Promise<{ success: boolean; error?: string }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));

  const currentUser = getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'User not authenticated' };
  }

  const pollIndex = MOCK_POLLS.findIndex(p => p.id === pollId);
  if (pollIndex === -1) {
    return { success: false, error: 'Poll not found' };
  }

  const poll = MOCK_POLLS[pollIndex];
  if (poll.createdBy.id !== currentUser.id) {
    return { success: false, error: 'You can only delete your own polls' };
  }

  // Remove poll and associated votes
  MOCK_POLLS.splice(pollIndex, 1);
  MOCK_VOTES = MOCK_VOTES.filter(v => v.pollId !== pollId);

  return { success: true };
}

/**
 * Toggle poll active status (only by creator)
 */
export async function togglePollStatus(pollId: string): Promise<{ success: boolean; error?: string }> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));

  const currentUser = getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'User not authenticated' };
  }

  const poll = MOCK_POLLS.find(p => p.id === pollId);
  if (!poll) {
    return { success: false, error: 'Poll not found' };
  }

  if (poll.createdBy.id !== currentUser.id) {
    return { success: false, error: 'You can only modify your own polls' };
  }

  poll.isActive = !poll.isActive;
  poll.updatedAt = new Date();

  return { success: true };
}

/**
 * Get polls created by current user
 */
export async function getMyPolls(): Promise<Poll[]> {
  const currentUser = getCurrentUser();
  if (!currentUser) return [];

  return MOCK_POLLS.filter(poll => poll.createdBy.id === currentUser.id);
}

/**
 * Get user statistics
 */
export async function getUserStats() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return {
      totalPolls: 0,
      totalVotes: 0,
      totalViews: 0,
      recentActivity: [],
    };
  }

  const userPolls = MOCK_POLLS.filter(poll => poll.createdBy.id === currentUser.id);
  const userVotes = MOCK_VOTES.filter(vote => vote.userId === currentUser.id);

  return {
    totalPolls: userPolls.length,
    totalVotes: userVotes.length,
    totalViews: userPolls.reduce((sum, poll) => sum + poll.totalVotes, 0), // Mock view count with vote count
    recentActivity: [
      ...userPolls.slice(0, 3).map(poll => ({
        id: `poll_${poll.id}`,
        type: 'poll_created' as const,
        description: `Created poll: ${poll.title}`,
        createdAt: poll.createdAt,
        relatedPoll: {
          id: poll.id,
          title: poll.title,
        },
      })),
      ...userVotes.slice(0, 5).map(vote => ({
        id: vote.id,
        type: 'vote_cast' as const,
        description: `Voted on a poll`,
        createdAt: vote.createdAt,
        relatedPoll: {
          id: vote.pollId,
          title: MOCK_POLLS.find(p => p.id === vote.pollId)?.title || 'Unknown Poll',
        },
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 10),
  };
}
