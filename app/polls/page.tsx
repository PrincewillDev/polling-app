'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import PollCard from '@/components/polls/PollCard';
import Header from '@/components/layout/Header';
import { usePolls } from '@/hooks/usePolls';
import { useAuth } from '@/hooks/useAuth';
import { PollFilters } from '@/lib/types';
import Link from 'next/link';

export default function PollsPage() {
  const { user, isAuthenticated } = useAuth();
  const [filters, setFilters] = useState<PollFilters>({
    search: '',
    sortBy: 'newest',
    page: 1,
    limit: 12,
  });

  const { polls, isLoading, error, pagination, fetchPolls } = usePolls(filters);
  const [searchInput, setSearchInput] = useState('');

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput, page: 1 }));
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch polls when filters change
  useEffect(() => {
    fetchPolls(filters);
  }, [filters, fetchPolls]);

  const handleSortChange = (sortBy: PollFilters['sortBy']) => {
    setFilters(prev => ({ ...prev, sortBy, page: 1 }));
  };

  const handleStatusFilter = (isActive?: boolean) => {
    setFilters(prev => ({ ...prev, isActive, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleVote = async (pollId: string, optionId: string) => {
    // This would be implemented with actual voting logic
    console.log('Vote:', pollId, optionId);
    // Refresh polls after voting
    await fetchPolls(filters);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-red-600 mb-4">Error loading polls: {error}</p>
              <Button onClick={() => fetchPolls(filters)}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              All Polls
            </h1>
            <p className="text-gray-600">
              Discover and participate in community polls
            </p>
          </div>

          {isAuthenticated && (
            <div className="mt-4 sm:mt-0">
              <Button asChild>
                <Link href="/polls/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Poll
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search polls..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Sort Options */}
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Sort:</span>
                  {(['newest', 'oldest', 'most_votes', 'trending'] as const).map((sort) => (
                    <Button
                      key={sort}
                      variant={filters.sortBy === sort ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSortChange(sort)}
                    >
                      {sort === 'newest' && 'Newest'}
                      {sort === 'oldest' && 'Oldest'}
                      {sort === 'most_votes' && 'Most Votes'}
                      {sort === 'trending' && 'Trending'}
                    </Button>
                  ))}
                </div>

                <Separator orientation="vertical" className="h-8" />

                {/* Status Filter */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <Button
                    variant={filters.isActive === undefined ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusFilter(undefined)}
                  >
                    All
                  </Button>
                  <Button
                    variant={filters.isActive === true ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusFilter(true)}
                  >
                    Active
                  </Button>
                  <Button
                    variant={filters.isActive === false ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusFilter(false)}
                  >
                    Inactive
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        {pagination && (
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600">
              Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} polls
            </div>

            {filters.search && (
              <Badge variant="secondary">
                Search: "{filters.search}"
              </Badge>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Polls Grid */}
        {!isLoading && polls.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {polls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                onVote={handleVote}
                showVoteButton={isAuthenticated}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && polls.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Search className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filters.search ? 'No polls found' : 'No polls available'}
              </h3>
              <p className="text-gray-600 mb-6">
                {filters.search
                  ? `No polls match "${filters.search}". Try adjusting your search terms.`
                  : 'Be the first to create a poll and get the community engaged!'
                }
              </p>

              {filters.search ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchInput('');
                    setFilters(prev => ({ ...prev, search: '', page: 1 }));
                  }}
                >
                  Clear Search
                </Button>
              ) : (
                isAuthenticated && (
                  <Button asChild>
                    <Link href="/polls/create">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Poll
                    </Link>
                  </Button>
                )
              )}
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2">
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrevious}
            >
              Previous
            </Button>

            {/* Page Numbers */}
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={pagination.page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
