'use client';

import { useState, useEffect, useCallback } from 'react';
import { Poll, CreatePollData, PollFilters, Vote } from '@/lib/types';
import {
  getPolls,
  getPoll,
  createPoll,
  voteOnPoll,
  getUserVote,
  deletePoll,
  togglePollStatus,
  getMyPolls,
  getUserStats
} from '@/lib/db';

interface UsePollsReturn {
  polls: Poll[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  } | null;
  fetchPolls: (filters?: PollFilters) => Promise<void>;
  refetch: () => Promise<void>;
  createNewPoll: (data: CreatePollData) => Promise<{ success: boolean; poll?: Poll; error?: string }>;
}

export function usePolls(initialFilters: PollFilters = {}): UsePollsReturn {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PollFilters>(initialFilters);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  } | null>(null);

  const fetchPolls = useCallback(async (newFilters?: PollFilters) => {
    setIsLoading(true);
    setError(null);

    try {
      const filtersToUse = newFilters || filters;
      setFilters(filtersToUse);

      const response = await getPolls(filtersToUse);

      if (response.success) {
        setPolls(response.data);
        setPagination(response.pagination);
      } else {
        setError('Failed to fetch polls');
      }
    } catch (err) {
      console.error('Error fetching polls:', err);
      setError('An error occurred while fetching polls');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const refetch = useCallback(() => {
    return fetchPolls(filters);
  }, [fetchPolls, filters]);

  const createNewPoll = useCallback(async (data: CreatePollData) => {
    try {
      const result = await createPoll(data);

      if (result.success) {
        // Refetch polls to include the new one
        await refetch();
      }

      return result;
    } catch (error) {
      console.error('Error creating poll:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [refetch]);

  // Initial fetch
  useEffect(() => {
    fetchPolls();
  }, []); // Empty dependency array for initial load only

  return {
    polls,
    isLoading,
    error,
    pagination,
    fetchPolls,
    refetch,
    createNewPoll,
  };
}

interface UsePollReturn {
  poll: Poll | null;
  isLoading: boolean;
  error: string | null;
  userVote: Vote | null;
  fetchPoll: () => Promise<void>;
  vote: (optionId: string) => Promise<{ success: boolean; error?: string }>;
  deletePoll: () => Promise<{ success: boolean; error?: string }>;
  toggleStatus: () => Promise<{ success: boolean; error?: string }>;
}

export function usePoll(pollId: string): UsePollReturn {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [userVote, setUserVote] = useState<Vote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPoll = useCallback(async () => {
    if (!pollId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [pollData, voteData] = await Promise.all([
        getPoll(pollId),
        getUserVote(pollId)
      ]);

      if (pollData) {
        setPoll(pollData);
        setUserVote(voteData);
      } else {
        setError('Poll not found');
      }
    } catch (err) {
      console.error('Error fetching poll:', err);
      setError('An error occurred while fetching the poll');
    } finally {
      setIsLoading(false);
    }
  }, [pollId]);

  const vote = useCallback(async (optionId: string) => {
    if (!poll) return { success: false, error: 'Poll not loaded' };

    try {
      const result = await voteOnPoll(poll.id, optionId);

      if (result.success) {
        // Refetch poll data to get updated vote counts
        await fetchPoll();
      }

      return result;
    } catch (error) {
      console.error('Error voting:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [poll, fetchPoll]);

  const handleDeletePoll = useCallback(async () => {
    if (!poll) return { success: false, error: 'Poll not loaded' };

    try {
      const result = await deletePoll(poll.id);
      return result;
    } catch (error) {
      console.error('Error deleting poll:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [poll]);

  const toggleStatus = useCallback(async () => {
    if (!poll) return { success: false, error: 'Poll not loaded' };

    try {
      const result = await togglePollStatus(poll.id);

      if (result.success) {
        // Refetch poll data to get updated status
        await fetchPoll();
      }

      return result;
    } catch (error) {
      console.error('Error toggling poll status:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [poll, fetchPoll]);

  // Initial fetch
  useEffect(() => {
    fetchPoll();
  }, [fetchPoll]);

  return {
    poll,
    isLoading,
    error,
    userVote,
    fetchPoll,
    vote,
    deletePoll: handleDeletePoll,
    toggleStatus,
  };
}

interface UseMyPollsReturn {
  polls: Poll[];
  isLoading: boolean;
  error: string | null;
  stats: {
    totalPolls: number;
    totalVotes: number;
    totalViews: number;
    recentActivity: any[];
  } | null;
  fetchMyPolls: () => Promise<void>;
  fetchStats: () => Promise<void>;
}

export function useMyPolls(): UseMyPollsReturn {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyPolls = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const pollsData = await getMyPolls();
      setPolls(pollsData);
    } catch (err) {
      console.error('Error fetching user polls:', err);
      setError('An error occurred while fetching your polls');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const statsData = await getUserStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching user stats:', err);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    Promise.all([fetchMyPolls(), fetchStats()]);
  }, [fetchMyPolls, fetchStats]);

  return {
    polls,
    isLoading,
    error,
    stats,
    fetchMyPolls,
    fetchStats,
  };
}
