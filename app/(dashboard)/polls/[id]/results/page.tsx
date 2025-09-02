"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  BarChart3,
  Users,
  Eye,
  Calendar,
  Share2,
  Download,
  TrendingUp,
  Clock,
  Globe,
  Lock,
  Trophy,
  Activity,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/components/auth/ssr-auth-provider";
import { supabase } from "@/lib/supabase";
import { Poll, PollResult } from "@/types";
import PollResults from "@/components/polls/poll-results";

interface PollResultsPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface PollAnalytics {
  viewsOverTime: Array<{ date: string; views: number; votes: number }>;
  demographics: Array<{ category: string; value: number; label: string }>;
  votePattern: Array<{ hour: number; votes: number }>;
  topReferrers: Array<{ source: string; visits: number; percentage: number }>;
}

export default function PollResultsPage({ params }: PollResultsPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  // State management
  const [poll, setPoll] = useState<Poll | null>(null);
  const [pollResults, setPollResults] = useState<PollResult[]>([]);
  const [analytics, setAnalytics] = useState<PollAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchPollData();
  }, [isAuthenticated, resolvedParams.id]);

  const fetchPollData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAuthToken();
      const response = await fetch(`/api/polls/${resolvedParams.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Poll not found");
        } else if (response.status === 403) {
          throw new Error(
            "You do not have permission to view this poll's results",
          );
        }
        throw new Error("Failed to fetch poll data");
      }

      const result = await response.json();
      const pollData = result.data;

      setPoll(pollData);

      // Transform poll options to PollResult format with enhanced data
      if (pollData && pollData.options) {
        const transformedResults: PollResult[] = pollData.options.map(
          (option: any, index: number) => ({
            optionId: option.id,
            optionText: option.text,
            votes: option.votes || 0,
            percentage: option.percentage || 0,
            voters: [], // Would be populated from actual voter data if available
          }),
        );
        setPollResults(transformedResults);
      }

      // Fetch analytics if user owns the poll
      if (pollData && user && pollData.createdBy?.id === user.id) {
        fetchAnalytics();
      }
    } catch (err) {
      console.error("Error fetching poll:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch poll data",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);

      // Mock analytics data - replace with actual API call
      const mockAnalytics: PollAnalytics = {
        viewsOverTime: [
          { date: "2024-01-01", views: 45, votes: 12 },
          { date: "2024-01-02", views: 78, votes: 23 },
          { date: "2024-01-03", views: 92, votes: 31 },
          { date: "2024-01-04", views: 156, votes: 45 },
          { date: "2024-01-05", views: 203, votes: 67 },
        ],
        demographics: [
          { category: "age_18_24", value: 25, label: "18-24 years" },
          { category: "age_25_34", value: 35, label: "25-34 years" },
          { category: "age_35_44", value: 20, label: "35-44 years" },
          { category: "age_45_plus", value: 20, label: "45+ years" },
        ],
        votePattern: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          votes: Math.floor(Math.random() * 20) + 1,
        })),
        topReferrers: [
          { source: "Direct", visits: 145, percentage: 45 },
          { source: "Social Media", visits: 98, percentage: 30 },
          { source: "Email", visits: 52, percentage: 16 },
          { source: "Search", visits: 29, percentage: 9 },
        ],
      };

      setAnalytics(mockAnalytics);
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const getAuthToken = async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Error getting session:", sessionError);
      return null;
    }

    if (!session?.access_token) {
      console.warn("No access token found in session");
      return null;
    }

    // Verify the user to ensure the session is authentic
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "User authentication failed, session considered invalid:",
        userError,
      );
      return null;
    }

    return session.access_token;
  };

  const handleResultClick = (optionId: string, result: PollResult) => {
    console.log("Detailed result clicked:", { optionId, result });
    // Could expand to show detailed analytics for this option
  };

  const handleExport = async (format: "csv" | "json" | "pdf") => {
    try {
      console.log(`Exporting poll results as ${format}`);

      if (format === "csv") {
        const csvContent = generateCSV();
        downloadFile(
          csvContent,
          `poll-${resolvedParams.id}-results.csv`,
          "text/csv",
        );
      } else if (format === "json") {
        const jsonContent = JSON.stringify(
          { poll, results: pollResults, analytics },
          null,
          2,
        );
        downloadFile(
          jsonContent,
          `poll-${resolvedParams.id}-results.json`,
          "application/json",
        );
      } else if (format === "pdf") {
        // PDF export would require a library like jsPDF
        alert("PDF export feature coming soon!");
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    }
  };

  const generateCSV = () => {
    if (!poll || !pollResults.length) return "";

    const headers = ["Option", "Votes", "Percentage"];
    const rows = pollResults.map((result) => [
      `"${result.optionText}"`,
      result.votes.toString(),
      `${result.percentage}%`,
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  };

  const downloadFile = (
    content: string,
    filename: string,
    mimeType: string,
  ) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const isOwner = user && poll?.createdBy?.id === user.id;
  const canViewResults =
    poll?.showResults !== "never" &&
    (poll?.showResults === "immediately" ||
      poll?.status === "closed" ||
      isOwner);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
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
              Unable to load the poll results. Please check your permissions or
              try again.
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

  if (!canViewResults) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Results Not Available
            </h3>
            <p className="text-gray-600 mb-4">
              The poll results are not publicly visible yet. Results will be
              shown {poll.showResults}.
            </p>
            <Button asChild>
              <Link href={`/polls/${resolvedParams.id}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Poll
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild>
            <Link href={`/polls/${resolvedParams.id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Poll
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Poll Results</h1>
            <p className="text-gray-600">{poll.title}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share Results
          </Button>
          {isOwner && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/polls/${resolvedParams.id}/edit`}>Edit Poll</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Total Votes</p>
                <p className="text-2xl font-bold">
                  {poll.totalVotes.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Unique Voters</p>
                <p className="text-2xl font-bold">
                  {poll.uniqueVoters.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Total Views</p>
                <p className="text-2xl font-bold">
                  {poll.totalViews.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">Engagement</p>
                <p className="text-2xl font-bold">
                  {poll.totalViews > 0
                    ? Math.round((poll.totalVotes / poll.totalViews) * 100)
                    : 0}
                  %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Results</TabsTrigger>
          {isOwner && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Results */}
            <div className="lg:col-span-2">
              <PollResults
                pollId={resolvedParams.id}
                poll={poll}
                results={pollResults}
                totalVotes={poll.totalVotes}
                uniqueVoters={poll.uniqueVoters}
                showPercentages={true}
                showVoterDetails={false}
                isRealTime={poll.status === "active"}
                displayMode="bar"
                highlightWinning={true}
                allowExport={isOwner}
                onResultClick={handleResultClick}
                onExport={handleExport}
              />
            </div>

            {/* Poll Information */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Poll Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <Badge
                      variant={
                        poll.status === "active" ? "default" : "secondary"
                      }
                    >
                      {poll.status}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Visibility</span>
                    <div className="flex items-center space-x-1">
                      {poll.isPublic ? (
                        <Globe className="h-3 w-3" />
                      ) : (
                        <Lock className="h-3 w-3" />
                      )}
                      <span className="text-sm">
                        {poll.isPublic ? "Public" : "Private"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Created</span>
                    <span className="text-sm">
                      {formatDate(poll.createdAt)}
                    </span>
                  </div>

                  {poll.endDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Ends</span>
                      <span className="text-sm">
                        {formatDate(poll.endDate)}
                      </span>
                    </div>
                  )}

                  {poll.category && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Category</span>
                      <Badge variant="outline">{poll.category}</Badge>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Multiple Choice
                    </span>
                    <span className="text-sm">
                      {poll.allowMultipleChoice ? "Yes" : "No"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Requires Auth</span>
                    <span className="text-sm">
                      {poll.requireAuth ? "Yes" : "No"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {poll.tags && poll.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {poll.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {isOwner && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </Button>
                    <Button variant="outline" size="sm" className="w-full">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Results
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      asChild
                    >
                      <Link href={`/polls/${resolvedParams.id}/edit`}>
                        Edit Poll
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Detailed Results Tab */}
        <TabsContent value="detailed" className="space-y-6">
          <PollResults
            pollId={resolvedParams.id}
            poll={poll}
            results={pollResults}
            totalVotes={poll.totalVotes}
            uniqueVoters={poll.uniqueVoters}
            showPercentages={true}
            showVoterDetails={isOwner}
            showVoterCount={true}
            isRealTime={poll.status === "active"}
            displayMode="list"
            highlightWinning={true}
            allowExport={isOwner}
            sortBy="votes"
            sortOrder="desc"
            onResultClick={handleResultClick}
            onExport={handleExport}
            className="mb-6"
          />
        </TabsContent>

        {/* Analytics Tab (Owner Only) */}
        {isOwner && (
          <TabsContent value="analytics" className="space-y-6">
            {analyticsLoading ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p>Loading analytics...</p>
                </CardContent>
              </Card>
            ) : analytics ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Traffic Sources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.topReferrers.map((referrer, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm font-medium">
                            {referrer.source}
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">
                              {referrer.visits}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({referrer.percentage}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Voting Pattern</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Peak voting hours and engagement patterns
                    </p>
                    <div className="text-center">
                      <Activity className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        Chart visualization coming soon
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No analytics data available</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
