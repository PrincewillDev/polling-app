"use client";

import { useState, useEffect } from "react";
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
import {
  Plus,
  BarChart3,
  Users,
  TrendingUp,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { PollCard } from "@/components/dashboard/poll-card";
import { useAuth } from "@/components/auth/ssr-auth-provider";
import { userPollsAPI } from "@/lib/api/user-polls";
import { Poll } from "@/types";

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [stats, setStats] = useState({
    totalPolls: 0,
    totalVotes: 0,
    activePolls: 0,
    totalViews: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch user's polls and stats
  const fetchData = async (showRefreshing = false) => {
    if (!isAuthenticated) return;

    if (showRefreshing) setRefreshing(true);
    else setIsLoading(true);

    try {
      setError(null);

      // Fetch user's polls (recent ones for dashboard)
      const pollsResponse = await userPollsAPI.getUserPolls({
        limit: 10,
        sortBy: "created_at",
        sortOrder: "desc",
      });

      if (!pollsResponse.success) {
        throw new Error(pollsResponse.error || "Failed to fetch polls");
      }

      // Fetch user's stats
      const statsResponse = await userPollsAPI.getUserPollStats();

      if (!statsResponse.success) {
        throw new Error(statsResponse.error || "Failed to fetch statistics");
      }

      setPolls(pollsResponse.data || []);
      setStats(statsResponse.data || stats);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard data",
      );
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  // Handle poll actions
  const handleEditPoll = (poll: Poll) => {
    // TODO: Open edit modal or navigate to edit page
    console.log("Edit poll:", poll.id);
    // For now, we'll navigate to a hypothetical edit page
    window.location.href = `/polls/${poll.id}/edit`;
  };

  const handleDeletePoll = async (poll: Poll) => {
    if (
      !confirm(
        `Are you sure you want to delete "${poll.title}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const response = await userPollsAPI.deletePoll(poll.id);

      if (!response.success) {
        throw new Error(response.error || "Failed to delete poll");
      }

      // Remove poll from local state
      setPolls((prev) => prev.filter((p) => p.id !== poll.id));

      // Update stats
      setStats((prev) => ({
        ...prev,
        totalPolls: prev.totalPolls - 1,
        activePolls:
          poll.status === "active" ? prev.activePolls - 1 : prev.activePolls,
        totalVotes: prev.totalVotes - poll.totalVotes,
        totalViews: prev.totalViews - poll.totalViews,
      }));

      console.log("Poll deleted successfully");
    } catch (err) {
      console.error("Error deleting poll:", err);
      alert(err instanceof Error ? err.message : "Failed to delete poll");
    }
  };

  const handleToggleStatus = async (
    poll: Poll,
    newStatus: "active" | "closed" | "draft",
  ) => {
    try {
      const response = await userPollsAPI.togglePollStatus(poll.id, newStatus);

      if (!response.success) {
        throw new Error(response.error || "Failed to update poll status");
      }

      // Update poll in local state
      setPolls((prev) =>
        prev.map((p) => (p.id === poll.id ? { ...p, status: newStatus } : p)),
      );

      // Update active polls count in stats
      if (poll.status === "active" && newStatus !== "active") {
        setStats((prev) => ({ ...prev, activePolls: prev.activePolls - 1 }));
      } else if (poll.status !== "active" && newStatus === "active") {
        setStats((prev) => ({ ...prev, activePolls: prev.activePolls + 1 }));
      }

      console.log(`Poll status updated to ${newStatus}`);
    } catch (err) {
      console.error("Error updating poll status:", err);
      alert(
        err instanceof Error ? err.message : "Failed to update poll status",
      );
    }
  };

  const handleToggleVisibility = async (poll: Poll, isPublic: boolean) => {
    try {
      const response = await userPollsAPI.togglePollVisibility(
        poll.id,
        isPublic,
      );

      if (!response.success) {
        throw new Error(response.error || "Failed to update poll visibility");
      }

      // Update poll in local state
      setPolls((prev) =>
        prev.map((p) => (p.id === poll.id ? { ...p, isPublic } : p)),
      );

      console.log(`Poll is now ${isPublic ? "public" : "private"}`);
    } catch (err) {
      console.error("Error updating poll visibility:", err);
      alert(
        err instanceof Error ? err.message : "Failed to update poll visibility",
      );
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Please Login
          </h1>
          <p className="text-gray-600 mb-6">
            You need to be logged in to access your dashboard.
          </p>
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Welcome back
              {user?.user_metadata?.name && `, ${user.user_metadata.name}`}!
              Here's an overview of your polling activity.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Refresh</span>
            </Button>
            <Button asChild>
              <Link href="/polls/create">
                <Plus className="w-4 h-4 mr-2" />
                Create Poll
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => fetchData()}
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Polls</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPolls}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activePolls} active, {stats.totalPolls - stats.activePolls}{" "}
              inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVotes}</div>
            <p className="text-xs text-muted-foreground">
              Across all your polls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Polls</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePolls}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews}</div>
            <p className="text-xs text-muted-foreground">Poll page views</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Polls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Polls</CardTitle>
            <CardDescription>Your latest polling activity</CardDescription>
          </CardHeader>
          <CardContent>
            {polls.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No polls yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Get started by creating your first poll
                </p>
                <Button asChild>
                  <Link href="/polls/create">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Poll
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {polls.slice(0, 5).map((poll) => (
                  <PollCard
                    key={poll.id}
                    poll={poll}
                    onEdit={handleEditPoll}
                    onDelete={handleDeletePoll}
                    onToggleStatus={handleToggleStatus}
                    onToggleVisibility={handleToggleVisibility}
                  />
                ))}
                {polls.length > 5 && (
                  <div className="pt-4 text-center border-t">
                    <Button variant="outline" asChild>
                      <Link href="/polls?filter=my-polls">
                        View All My Polls ({stats.totalPolls})
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" asChild>
              <Link href="/polls/create">
                <Plus className="w-4 h-4 mr-2" />
                Create New Poll
              </Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/polls">
                <BarChart3 className="w-4 h-4 mr-2" />
                Browse All Polls
              </Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/polls?filter=my-polls">
                <Users className="w-4 h-4 mr-2" />
                Manage My Polls
              </Link>
            </Button>

            <div className="pt-4 border-t">
              <h4 className="font-medium text-sm text-gray-900 mb-2">Tips</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Keep poll questions clear and concise</li>
                <li>• Add deadlines to encourage participation</li>
                <li>• Share polls with targeted audiences</li>
                <li>• Use tags to organize your polls</li>
              </ul>
            </div>

            {stats.totalPolls > 0 && (
              <div className="pt-4 border-t">
                <h4 className="font-medium text-sm text-gray-900 mb-2">
                  Your Stats
                </h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Average votes per poll:</span>
                    <span>
                      {Math.round(stats.totalVotes / stats.totalPolls)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average views per poll:</span>
                    <span>
                      {Math.round(stats.totalViews / stats.totalPolls)}
                    </span>
                  </div>
                  {stats.totalVotes > 0 && stats.totalViews > 0 && (
                    <div className="flex justify-between">
                      <span>Engagement rate:</span>
                      <span>
                        {Math.round(
                          (stats.totalVotes / stats.totalViews) * 100,
                        )}
                        %
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
