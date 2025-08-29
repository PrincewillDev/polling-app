'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Clock, Users, BarChart3, CheckCircle, XCircle, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Poll } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';

interface PollCardProps {
  poll: Poll;
  showVoteButton?: boolean;
  onVote?: (pollId: string, optionId: string) => Promise<void>;
  isVoting?: boolean;
}

export default function PollCard({
  poll,
  showVoteButton = true,
  onVote,
  isVoting = false
}: PollCardProps) {
  const { user } = useAuth();
  const [selectedOption, setSelectedOption] = useState<string>('');

  const isExpired = poll.expiresAt && new Date() > poll.expiresAt;
  const isOwner = user?.id === poll.createdBy.id;
  const canVote = showVoteButton && poll.isActive && !isExpired;

  const handleVote = async () => {
    if (!selectedOption || !onVote) return;
    await onVote(poll.id, selectedOption);
    setSelectedOption('');
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const getStatusBadge = () => {
    if (isExpired) {
      return (
        <Badge variant="secondary" className="text-gray-600">
          <XCircle className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    }

    if (!poll.isActive) {
      return (
        <Badge variant="secondary" className="text-gray-600">
          <XCircle className="h-3 w-3 mr-1" />
          Inactive
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="text-green-700 bg-green-100">
        <CheckCircle className="h-3 w-3 mr-1" />
        Active
      </Badge>
    );
  };

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold line-clamp-2 mb-2">
              <Link
                href={`/polls/${poll.id}`}
                className="hover:text-primary transition-colors"
              >
                {poll.title}
              </Link>
            </CardTitle>
            {poll.description && (
              <CardDescription className="line-clamp-2">
                {poll.description}
              </CardDescription>
            )}
          </div>
          <div className="ml-3 flex-shrink-0">
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Poll options with results */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Options ({poll.options.length})</span>
            <span>{poll.totalVotes} votes</span>
          </div>

          <div className="space-y-2">
            {poll.options.slice(0, 3).map((option) => (
              <div key={option.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    {canVote && (
                      <input
                        type={poll.allowMultipleVotes ? 'checkbox' : 'radio'}
                        name={`poll-${poll.id}`}
                        value={option.id}
                        checked={selectedOption === option.id}
                        onChange={(e) => setSelectedOption(e.target.checked ? option.id : '')}
                        className="rounded"
                        disabled={isVoting}
                      />
                    )}
                    <span className="text-gray-900 truncate">{option.text}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-medium">{option.votes}</span>
                    <span className="text-gray-500 ml-1">
                      ({(option.percentage || 0).toFixed(0)}%)
                    </span>
                  </div>
                </div>
                <Progress value={option.percentage || 0} className="h-2" />
              </div>
            ))}

            {poll.options.length > 3 && (
              <div className="text-sm text-gray-500 text-center py-1">
                +{poll.options.length - 3} more options
              </div>
            )}
          </div>
        </div>

        {/* Vote button */}
        {canVote && selectedOption && (
          <Button
            onClick={handleVote}
            disabled={isVoting}
            className="w-full"
            size="sm"
          >
            {isVoting ? 'Voting...' : 'Vote'}
          </Button>
        )}
      </CardContent>

      <CardFooter className="pt-4 border-t">
        <div className="flex items-center justify-between w-full text-sm text-gray-600">
          {/* Creator info */}
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>
              {isOwner ? 'You' : poll.createdBy.displayName}
            </span>
          </div>

          {/* Metadata */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>{poll.totalVotes}</span>
            </div>

            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(poll.createdAt)}</span>
            </div>

            {poll.expiresAt && (
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span className={isExpired ? 'text-red-600' : ''}>
                  {isExpired ? 'Expired' : `Until ${formatDate(poll.expiresAt)}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
