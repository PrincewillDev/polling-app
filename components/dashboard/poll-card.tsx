"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Play,
  Pause,
  Globe,
  Lock,
  BarChart3,
  Calendar,
  Users,
} from "lucide-react";
import { Poll } from "@/types";
import { formatDistanceToNow } from "date-fns";

interface PollCardProps {
  poll: Poll;
  onEdit?: (poll: Poll) => void;
  onDelete?: (poll: Poll) => void;
  onToggleStatus?: (poll: Poll, status: "active" | "closed" | "draft") => void;
  onToggleVisibility?: (poll: Poll, isPublic: boolean) => void;
  isLoading?: boolean;
}

export function PollCard({
  poll,
  onEdit,
  onDelete,
  onToggleStatus,
  onToggleVisibility,
  isLoading = false,
}: PollCardProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (
    action: string,
    fn: () => Promise<void> | void,
  ) => {
    setActionLoading(action);
    try {
      await fn();
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "closed":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      case "draft":
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  const isActive = poll.status === "active";
  const isPublic = poll.isPublic;
  const hasVotes = poll.totalVotes > 0;

  return (
    <Card
      className={`transition-all hover:shadow-md ${isLoading ? "opacity-50" : ""}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate">
              {poll.title}
            </CardTitle>
            {poll.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {poll.description}
              </CardDescription>
            )}
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Badge variant="secondary" className={getStatusColor(poll.status)}>
              {poll.status}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={isLoading || actionLoading !== null}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link
                    href={`/polls/${poll.id}`}
                    className="flex items-center"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Poll
                  </Link>
                </DropdownMenuItem>

                {onEdit && (
                  <DropdownMenuItem
                    onClick={() => handleAction("edit", () => onEdit(poll))}
                    disabled={actionLoading !== null}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Poll
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {onToggleStatus && (
                  <DropdownMenuItem
                    onClick={() =>
                      handleAction("status", () =>
                        onToggleStatus(poll, isActive ? "closed" : "active"),
                      )
                    }
                    disabled={actionLoading !== null}
                  >
                    {isActive ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Close Poll
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Activate Poll
                      </>
                    )}
                  </DropdownMenuItem>
                )}

                {onToggleVisibility && (
                  <DropdownMenuItem
                    onClick={() =>
                      handleAction("visibility", () =>
                        onToggleVisibility(poll, !isPublic),
                      )
                    }
                    disabled={actionLoading !== null}
                  >
                    {isPublic ? (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Make Private
                      </>
                    ) : (
                      <>
                        <Globe className="mr-2 h-4 w-4" />
                        Make Public
                      </>
                    )}
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => handleAction("delete", () => onDelete(poll))}
                    disabled={actionLoading !== null}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Poll
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Poll Stats */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{poll.totalVotes} votes</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span>{poll.totalViews} views</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <span>{poll.options.length} options</span>
            </div>
          </div>

          {/* Poll Options Preview */}
          {poll.options.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Options:
              </h4>
              <div className="space-y-1">
                {poll.options.slice(0, 2).map((option, index) => (
                  <div
                    key={option.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate">{option.text}</span>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-muted-foreground">
                        {option.votes}
                      </span>
                      {hasVotes && (
                        <span className="text-xs text-muted-foreground">
                          ({option.percentage}%)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {poll.options.length > 2 && (
                  <div className="text-xs text-muted-foreground">
                    +{poll.options.length - 2} more options
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Poll Metadata */}
          <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Created {formatDate(poll.createdAt)}</span>
              </div>
              {poll.endDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Ends {formatDate(poll.endDate)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {poll.isPublic ? (
                <div className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  <span>Public</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  <span>Private</span>
                </div>
              )}

              {poll.category && (
                <Badge variant="outline" className="text-xs">
                  {poll.category}
                </Badge>
              )}
            </div>
          </div>

          {/* Tags */}
          {poll.tags && poll.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {poll.tags.slice(0, 3).map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs px-2 py-0"
                >
                  {tag}
                </Badge>
              ))}
              {poll.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs px-2 py-0">
                  +{poll.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
