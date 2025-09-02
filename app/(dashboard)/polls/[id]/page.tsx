"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Vote,
  Eye,
  Users,
  Calendar,
  Share2,
  Edit,
  Loader2,
  CheckCircle,
  AlertCircle,
  Globe,
  Lock,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { supabase } from "@/lib/supabase";
import { Poll } from "@/types";

interface PollPageProps {
  params: {
    id: string;
  };
}

export default function PollPage({ params }: PollPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    fetchPoll();
    if (isAuthenticated) {
      checkUserVote();
    }
  }, [resolvedParams.id, isAuthenticated]);

  const fetchPoll = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/polls/${resolvedParams.id}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Poll not found");
        }
        throw new Error("Failed to fetch poll");
      }

      const result = await response.json();
      setPoll(result.data);
    } catch (err) {
      console.error("Error fetching poll:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch poll");
    } finally {
      setLoading(false);
    }
  };

  const checkUserVote = async () => {
    if (!isAuthenticated || !user) return;

    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch(`/api/polls/${resolvedParams.id}/vote`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data?.hasVoted) {
          setHasVoted(true);
        }
      }
    } catch (error) {
      console.error("Error checking user vote:", error);
    }
  };

  const getAuthToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const handleVote = async () => {
    if (!poll) return;

    if (poll.requireAuth && !isAuthenticated) {
      setError("You must be logged in to vote on this poll");
      return;
    }

    if (selectedOptions.length === 0) {
      setError("Please select at least one option");
      return;
    }

    if (!poll.allowMultipleChoice && selectedOptions.length > 1) {
      setError("You can only select one option");
      return;
    }

    try {
      setVoting(true);
      setError(null);

      const token = await getAuthToken();
      const response = await fetch(`/api/polls/${resolvedParams.id}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ optionIds: selectedOptions }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit vote");
      }

      setHasVoted(true);
      fetchPoll(); // Refresh poll data to show updated results
      alert("Your vote has been recorded successfully!");
    } catch (err) {
      console.error("Error submitting vote:", err);
      setError(err instanceof Error ? err.message : "Failed to submit vote");
    } finally {
      setVoting(false);
    }
  };

  const handleOptionSelect = (optionId: string) => {
    if (!poll) return;

    if (poll.allowMultipleChoice) {
      setSelectedOptions((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId],
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const isOwner = user && poll?.createdBy?.id === user.id;
  const canVote = poll?.status === "active" && !hasVoted;
  const showResults =
    hasVoted ||
    poll?.showResults === "immediately" ||
    poll?.status === "closed";

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {error || "Poll not found"}
            </h3>
            <p className="text-gray-600 mb-4">
              The poll you're looking for doesn't exist or is not available.
            </p>
            <Button asChild>
              <Link href="/polls">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Polls
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" asChild>
          <Link href="/polls">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Polls
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          {isOwner && (
            <Button asChild>
              <Link href={`/polls/${poll.id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Poll
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Poll Info */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl font-bold mb-2">
                {poll.title}
              </CardTitle>
              {poll.description && (
                <CardDescription className="text-base">
                  {poll.description}
                </CardDescription>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={getStatusColor(poll.status)}>
                {poll.status}
              </Badge>
              {poll.category && (
                <Badge variant="secondary">{poll.category}</Badge>
              )}
            </div>
          </div>

          {/* Poll Stats */}
          <div className="flex items-center gap-6 text-sm text-gray-600 mt-4">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{poll.totalVotes} votes</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{poll.totalViews} views</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Created {formatDate(poll.createdAt)}</span>
            </div>
            {poll.endDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Ends {formatDate(poll.endDate)}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              {poll.isPublic ? (
                <>
                  <Globe className="h-4 w-4" />
                  <span>Public</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Private</span>
                </>
              )}
            </div>
          </div>

          {/* Author */}
          {poll.createdBy && (
            <div className="text-sm text-gray-600 mt-2">
              by {poll.createdBy.name}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Voting Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {hasVoted ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                You have voted
              </>
            ) : canVote ? (
              <>
                <Vote className="h-5 w-5" />
                Cast your vote
              </>
            ) : (
              <>
                <Eye className="h-5 w-5" />
                Poll Results
              </>
            )}
          </CardTitle>
          {poll.allowMultipleChoice && canVote && (
            <CardDescription>
              You can select multiple options for this poll.
            </CardDescription>
          )}
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-3 border border-red-200 rounded-lg bg-red-50">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {poll.options.map((option) => (
              <div key={option.id} className="space-y-2">
                {canVote ? (
                  <div className="flex items-center space-x-3">
                    {poll.allowMultipleChoice ? (
                      <Checkbox
                        id={option.id}
                        checked={selectedOptions.includes(option.id)}
                        onCheckedChange={() => handleOptionSelect(option.id)}
                      />
                    ) : (
                      <RadioGroup
                        value={selectedOptions[0] || ""}
                        onValueChange={(value) => setSelectedOptions([value])}
                        className="flex items-center"
                      >
                        <RadioGroupItem value={option.id} id={option.id} />
                      </RadioGroup>
                    )}
                    <Label
                      htmlFor={option.id}
                      className="flex-1 cursor-pointer"
                    >
                      {option.text}
                    </Label>
                  </div>
                ) : showResults ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{option.text}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {option.votes} votes
                        </span>
                        <Badge variant="secondary">{option.percentage}%</Badge>
                      </div>
                    </div>
                    <Progress value={option.percentage} className="h-2" />
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span>{option.text}</span>
                    <span className="text-sm text-gray-500">
                      Results hidden until you vote
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {canVote && (
            <div className="mt-6 pt-4 border-t">
              <Button
                onClick={handleVote}
                disabled={voting || selectedOptions.length === 0}
                className="w-full"
              >
                {voting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting Vote...
                  </>
                ) : (
                  <>
                    <Vote className="h-4 w-4 mr-2" />
                    Submit Vote
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tags */}
      {poll.tags && poll.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {poll.tags.map((tag, index) => (
                <Badge key={index} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
